import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
  type GenerateContentParameters,
  type GenerateContentResponse,
  type Part,
} from "@google/genai";
import { z } from "zod";
import type { Language } from "./languages";
import { ANALYZE_SYSTEM, ASK_SYSTEM, analyzeInstruction, askContext } from "./prompts";
import {
  AnalysisSchema,
  type Analysis,
  type AnalyzeEvent,
  type AnalyzeRequest,
  type AskRequest,
  type Page,
} from "./schema";

export const MODEL = process.env.CLEARFORM_MODEL || "gemini-3.6-flash";
/** Tried in order when the main model is overloaded, out of free quota, or slow to start. */
export const FALLBACK_MODELS = (process.env.CLEARFORM_FALLBACK_MODELS || "gemini-3.5-flash")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
/** How long the main model has to start streaming before ClearForm switches models. */
const FIRST_CHUNK_MS = 15_000;

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function liveAiEnabled(): boolean {
  return Boolean(apiKey());
}

// Gemini reads a subset of JSON Schema and doesn't need the dialect marker.
const { $schema: _, ...analysisJsonSchema } = z.toJSONSchema(AnalysisSchema);
export const ANALYSIS_JSON_SCHEMA = analysisJsonSchema;

// Retry a brief overload once, not 429s: on the free tier those mean the quota is used up.
function requestOptions(timeoutMs: number): GenerateContentConfig {
  return {
    httpOptions: {
      timeout: timeoutMs,
      retryOptions: { attempts: 2, initialDelay: 1, httpStatusCodes: [500, 503] },
    },
  };
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

export class UserFacingError extends Error {}

const MODELS = [...new Set([MODEL, ...FALLBACK_MODELS])];

/** Overloaded or out of quota: worth trying the next model. */
function isUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && [429, 500, 503, 504].includes(error.status);
}

/**
 * Starts a streamed request on the first of `models` that answers. A model is skipped when it's
 * overloaded, out of quota, or hasn't started answering in time.
 */
async function openStream(
  params: Omit<GenerateContentParameters, "model">,
  signal: AbortSignal,
  models = MODELS,
): Promise<{ model: string; stream: AsyncGenerator<GenerateContentResponse> }> {
  for (const [index, model] of models.entries()) {
    const isLast = index === models.length - 1;
    const attempt = new AbortController();
    const forward = () => attempt.abort();
    signal.addEventListener("abort", forward, { once: true });
    let timedOut = false;
    const timer = isLast
      ? undefined
      : setTimeout(() => {
          timedOut = true;
          attempt.abort();
        }, FIRST_CHUNK_MS);
    try {
      const stream = await getClient().models.generateContentStream({
        ...params,
        model,
        config: { ...params.config, abortSignal: attempt.signal },
      });
      const first = await stream.next();
      clearTimeout(timer);
      const rest = (async function* () {
        try {
          if (!first.done) yield first.value;
          yield* stream;
        } finally {
          signal.removeEventListener("abort", forward);
        }
      })();
      return { model, stream: rest };
    } catch (error) {
      clearTimeout(timer);
      signal.removeEventListener("abort", forward);
      if (signal.aborted || isLast || !(timedOut || isUnavailable(error))) throw error;
      console.warn(
        `${model} is unavailable (${timedOut ? "no answer yet" : `HTTP ${(error as ApiError).status}`}); using ${models[index + 1]}.`,
      );
    }
  }
  throw new Error("No model to try.");
}

export function pageParts(pages: Page[]): Part[] {
  return pages.map((page) => ({ inlineData: { mimeType: page.mediaType, data: page.data } }));
}

function partsOf(chunk: GenerateContentResponse): Part[] {
  return chunk.candidates?.[0]?.content?.parts ?? [];
}

/** Turns a blocked or cut-off answer into a message the person can act on. */
function checkFinish(last: GenerateContentResponse | undefined): void {
  if (last?.promptFeedback?.blockReason) {
    throw new UserFacingError(
      "ClearForm couldn't explain this document. Try a clearer photo of just the document.",
    );
  }
  const reason = last?.candidates?.[0]?.finishReason;
  if (!reason || reason === FinishReason.STOP) return;
  if (reason === FinishReason.MAX_TOKENS) {
    throw new UserFacingError(
      "This document is too long to explain in one go. Try uploading fewer pages at a time.",
    );
  }
  if (reason === FinishReason.SPII) {
    throw new UserFacingError(
      "ClearForm stopped because the page shows private details like ID or card numbers. Cover them and try again.",
    );
  }
  throw new UserFacingError(
    "ClearForm couldn't explain this document. Try a clearer photo of just the document.",
  );
}

export async function analyzeDocument(
  request: AnalyzeRequest,
  language: Language,
  send: (event: AnalyzeEvent) => void,
  signal: AbortSignal,
): Promise<Analysis> {
  const params = {
    contents: [
      {
        role: "user",
        parts: [
          ...pageParts(request.pages),
          { text: analyzeInstruction(language, request.today, request.pages.length) },
        ],
      },
    ],
    config: {
      ...requestOptions(240_000),
      systemInstruction: ANALYZE_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSIS_JSON_SCHEMA,
      maxOutputTokens: 32000,
      // Thought summaries tell the progress screen the model is thinking, and start the
      // stream early enough to tell a slow model from an overloaded one.
      thinkingConfig: { includeThoughts: true },
    },
  };

  let stage: "thinking" | "writing" | undefined;
  let lastSent = 0;
  let models = MODELS;
  for (;;) {
    const { model, stream } = await openStream(params, signal, models);
    let text = "";
    let last: GenerateContentResponse | undefined;
    try {
      for await (const chunk of stream) {
        last = chunk;
        for (const part of partsOf(chunk)) {
          if (!part.text) continue;
          const next = part.thought ? "thinking" : "writing";
          if (next !== stage && stage !== "writing") {
            stage = next;
            send({ type: "stage", stage });
          }
          if (part.thought) continue;
          text += part.text;
          // Progress only moves forward, even if a fallback model starts over.
          if (text.length - lastSent >= 400) {
            lastSent = text.length;
            send({ type: "progress", chars: text.length });
          }
        }
      }
    } catch (error) {
      // Nothing has been shown yet, so an answer cut off by an overload can start over.
      const rest = models.slice(models.indexOf(model) + 1);
      if (signal.aborted || !rest.length || !isUnavailable(error)) throw error;
      console.warn(`${model} stopped partway (HTTP ${error.status}); using ${rest[0]}.`);
      models = rest;
      continue;
    }

    checkFinish(last);
    try {
      return AnalysisSchema.parse(JSON.parse(text));
    } catch {
      throw new UserFacingError("ClearForm got a garbled answer. Please try again.");
    }
  }
}

/** Streams the answer as NDJSON lines: delta, done, error. */
export function askAboutDocument(
  request: AskRequest,
  language: Language,
  signal: AbortSignal,
): ReadableStream<Uint8Array> {
  const [first, ...rest] = request.turns;
  const contents: Content[] = [
    {
      role: "user",
      parts: [
        ...pageParts(request.pages),
        { text: askContext(language, request.today, request.analysis) },
        { text: first.content },
      ],
    },
    ...rest.map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    })),
  ];

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const write = (line: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      try {
        const { stream } = await openStream(
          {
            contents,
            config: {
              ...requestOptions(100_000),
              systemInstruction: ASK_SYSTEM,
              maxOutputTokens: 8000,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW, includeThoughts: true },
            },
          },
          signal,
        );
        let last: GenerateContentResponse | undefined;
        for await (const chunk of stream) {
          last = chunk;
          for (const part of partsOf(chunk)) {
            if (part.text && !part.thought) write({ type: "delta", text: part.text });
          }
        }
        checkFinish(last);
        write({ type: "done" });
      } catch (error) {
        if (!signal.aborted) write({ type: "error", message: describeError(error) });
      } finally {
        controller.close();
      }
    },
  });
}

export function describeError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message;
  console.error(error);
  if (error instanceof ApiError) {
    if (
      error.status === 401 ||
      error.status === 403 ||
      (error.status === 400 && /API.?key/i.test(error.message))
    ) {
      return "The server's Gemini API key is missing or not valid.";
    }
    if (error.status === 404) {
      return "The AI model this server is set to use isn't available. Check CLEARFORM_MODEL.";
    }
    if (error.status === 429) {
      return "ClearForm has used up its AI requests for now. Please wait a minute and try again.";
    }
    if (error.status === 400) {
      return "The AI service couldn't read this upload. Try a JPG or PNG photo, or a smaller PDF.";
    }
    return "The AI service is busy right now. Please try again in a moment.";
  }
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return "The AI service is taking too long right now. Please try again in a moment.";
  }
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "ClearForm couldn't reach the AI service. Check the server's internet connection.";
  }
  return "Something went wrong. Please try again.";
}
