import {
  ApiError,
  FinishReason,
  GoogleGenAI,
  ThinkingLevel,
  type Content,
  type GenerateContentConfig,
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

export const MODEL = process.env.CLEARFORM_MODEL || "gemini-3.8-flash";

function apiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
}

export function liveAiEnabled(): boolean {
  return Boolean(apiKey());
}

// Gemini reads a subset of JSON Schema and doesn't need the dialect marker.
const { $schema: _, ...analysisJsonSchema } = z.toJSONSchema(AnalysisSchema);
export const ANALYSIS_JSON_SCHEMA = analysisJsonSchema;

// Retry brief overloads, not 429s: on the free tier those mean the quota is used up.
const REQUEST_OPTIONS: GenerateContentConfig = {
  httpOptions: {
    retryOptions: { attempts: 3, initialDelay: 1, maxDelay: 4, httpStatusCodes: [500, 503] },
  },
};

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: apiKey() });
  return client;
}

export class UserFacingError extends Error {}

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
  const stream = await getClient().models.generateContentStream({
    model: MODEL,
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
      ...REQUEST_OPTIONS,
      systemInstruction: ANALYZE_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSIS_JSON_SCHEMA,
      maxOutputTokens: 32000,
      // Thought summaries only tell the progress screen the model is thinking.
      thinkingConfig: { includeThoughts: true },
      abortSignal: signal,
    },
  });

  let text = "";
  let stage: "thinking" | "writing" | undefined;
  let lastSent = 0;
  let last: GenerateContentResponse | undefined;
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
      if (text.length - lastSent >= 400) {
        lastSent = text.length;
        send({ type: "progress", chars: text.length });
      }
    }
  }

  checkFinish(last);
  try {
    return AnalysisSchema.parse(JSON.parse(text));
  } catch {
    throw new UserFacingError("ClearForm got a garbled answer. Please try again.");
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
        const stream = await getClient().models.generateContentStream({
          model: MODEL,
          contents,
          config: {
            ...REQUEST_OPTIONS,
            systemInstruction: ASK_SYSTEM,
            maxOutputTokens: 8000,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: signal,
          },
        });
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
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return "ClearForm couldn't reach the AI service. Check the server's internet connection.";
  }
  return "Something went wrong. Please try again.";
}
