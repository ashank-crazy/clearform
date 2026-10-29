import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { analyzeDocument, askAboutDocument, describeError, UserFacingError } from "./ai";
import { languageOrDefault } from "./languages";
import { readNdjson } from "./ndjson";
import { SAMPLES } from "./samples";
import type { AnalyzeEvent, AnalyzeRequest } from "./schema";

// A stand-in for the Gemini API that replays scripted responses, so the real SDK request,
// streaming, and parsing code runs without an API key.

type Reply = { chunks: object[] } | { status: number; error: object };

interface Received {
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

let server: Server;
let replies: Reply[] = [];
let received: Received[] = [];

function chunk(parts: object[], finishReason?: string): object {
  return {
    candidates: [{ content: { role: "model", parts }, index: 0, finishReason }],
    modelVersion: "gemini-3.6-flash",
  };
}

/** The answer split into streamed chunks, ending with the given finish reason. */
function answer(text: string, finishReason = "STOP", size = 700): object[] {
  const chunks: object[] = [];
  for (let i = 0; i < text.length; i += size) {
    const last = i + size >= text.length;
    chunks.push(chunk([{ text: text.slice(i, i + size) }], last ? finishReason : undefined));
  }
  return chunks;
}

const thought = chunk([{ text: "**Reading the bill**", thought: true }]);

beforeAll(async () => {
  server = createServer((request, response) => {
    let raw = "";
    request.on("data", (data) => (raw += data));
    request.on("end", () => {
      received.push({ url: request.url ?? "", headers: request.headers, body: JSON.parse(raw) });
      const reply = replies.shift() ?? { status: 500, error: { message: "No reply scripted" } };
      if ("error" in reply) {
        response.writeHead(reply.status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: { code: reply.status, ...reply.error } }));
        return;
      }
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end(reply.chunks.map((c) => `data: ${JSON.stringify(c)}\r\n\r\n`).join(""));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.GEMINI_API_KEY = "test-key";
  process.env.GOOGLE_GEMINI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  replies = [];
  received = [];
});

const sample = SAMPLES[0].analysis;
const request: AnalyzeRequest = {
  language: "es",
  pages: [
    { mediaType: "image/jpeg", data: "aGVsbG8=" },
    { mediaType: "application/pdf", data: "JVBERi0=" },
  ],
  today: "2026-10-29",
};

function analyze(language = "en") {
  return analyzeDocument(
    request,
    languageOrDefault(language),
    () => {},
    new AbortController().signal,
  );
}

async function failure(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected the call to fail");
}

type Body = {
  contents: { role: string; parts: { text?: string; inlineData?: { mimeType: string } }[] }[];
  systemInstruction: { parts: { text: string }[] };
  generationConfig: {
    responseMimeType?: string;
    responseJsonSchema?: { properties: Record<string, unknown> };
    maxOutputTokens: number;
    thinkingConfig: { includeThoughts?: boolean; thinkingLevel?: string };
  };
};

describe("analyzeDocument", () => {
  it("sends the pages with a JSON schema and parses the streamed answer", async () => {
    replies = [{ chunks: [thought, ...answer(JSON.stringify(sample))] }];
    const events: AnalyzeEvent[] = [];
    const analysis = await analyzeDocument(
      request,
      languageOrDefault("es"),
      (e) => events.push(e),
      new AbortController().signal,
    );

    expect(analysis).toEqual(sample);
    expect(events.filter((e) => e.type === "stage")).toEqual([
      { type: "stage", stage: "thinking" },
      { type: "stage", stage: "writing" },
    ]);
    expect(events.some((e) => e.type === "progress")).toBe(true);

    const [{ url, headers, body }] = received as [Received & { body: Body }];
    expect(url).toBe("/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse");
    expect(headers["x-goog-api-key"]).toBe("test-key");
    expect(body.systemInstruction.parts[0].text).toMatch(/^You are ClearForm/);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema?.properties).toHaveProperty("labels");
    expect(body.generationConfig.responseJsonSchema).not.toHaveProperty("$schema");
    expect(body.generationConfig.thinkingConfig.includeThoughts).toBe(true);
    const parts = body.contents[0].parts;
    expect(parts.map((part) => part.inlineData?.mimeType ?? "text")).toEqual([
      "image/jpeg",
      "application/pdf",
      "text",
    ]);
    expect(parts[2].text).toContain("Spanish");
    expect(parts[2].text).toContain("2026-10-29");
    expect(parts[2].text).toContain("2 pages");
  });

  it("explains when the document is too long", async () => {
    replies = [{ chunks: answer('{"readable":', "MAX_TOKENS") }];
    await expect(analyze()).rejects.toThrow(/too long/);
  });

  it("turns a blocked answer or blocked upload into a message for the person", async () => {
    replies = [
      { chunks: [chunk([], "SAFETY")] },
      { chunks: [{ promptFeedback: { blockReason: "PROHIBITED_CONTENT" } }] },
    ];
    await expect(analyze()).rejects.toThrow(/couldn't explain this document/);
    await expect(analyze()).rejects.toThrow(/couldn't explain this document/);
  });

  it("asks the person to cover private details when Gemini stops for them", async () => {
    replies = [{ chunks: [chunk([], "SPII")] }];
    await expect(analyze()).rejects.toThrow(/Cover them/);
  });

  it("reports an answer that doesn't match the schema", async () => {
    replies = [{ chunks: answer(JSON.stringify({ ...sample, urgency: "whenever" })) }];
    await expect(analyze()).rejects.toThrow(/garbled/);
  });

  it("retries once when Gemini is briefly overloaded", async () => {
    replies = [
      { status: 503, error: { message: "The model is overloaded.", status: "UNAVAILABLE" } },
      { chunks: answer(JSON.stringify(sample)) },
    ];
    expect(await analyze()).toEqual(sample);
    expect(received).toHaveLength(2);
  });

  it("switches to the fallback model when the main one is out of quota", async () => {
    replies = [
      { status: 429, error: { message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } },
      { chunks: answer(JSON.stringify(sample)) },
    ];
    expect(await analyze()).toEqual(sample);
    expect(received.map((r) => r.url.split(":")[0])).toEqual([
      "/v1beta/models/gemini-3.6-flash",
      "/v1beta/models/gemini-3.5-flash",
    ]);
  });

  it("starts over on the fallback model when the main one is overloaded partway", async () => {
    const overloaded = { error: { code: 503, message: "High demand.", status: "UNAVAILABLE" } };
    replies = [{ chunks: [thought, overloaded] }, { chunks: answer(JSON.stringify(sample)) }];
    expect(await analyze()).toEqual(sample);
    expect(received.map((r) => r.url.split(":")[0])).toEqual([
      "/v1beta/models/gemini-3.6-flash",
      "/v1beta/models/gemini-3.5-flash",
    ]);
  });

  it("names a used-up quota and a bad key, and doesn't retry a bad key", async () => {
    replies = [
      { status: 429, error: { message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } },
      { status: 429, error: { message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } },
      {
        status: 400,
        error: {
          message: "API key not valid. Please pass a valid API key.",
          status: "INVALID_ARGUMENT",
        },
      },
    ];
    expect(describeError(await failure(analyze()))).toMatch(/used up its AI requests/);
    expect(describeError(await failure(analyze()))).toMatch(/Gemini API key/);
    expect(received).toHaveLength(3);
  });
});

describe("askAboutDocument", () => {
  const ask = {
    language: "vi",
    pages: request.pages,
    analysis: sample,
    today: "2026-10-29",
    turns: [
      { role: "user" as const, content: "Can I pay later?" },
      { role: "assistant" as const, content: "Yes, call them." },
      { role: "user" as const, content: "What number?" },
    ],
  };

  async function lines() {
    const out: { type: string; text?: string; message?: string }[] = [];
    for await (const line of readNdjson<(typeof out)[number]>(
      askAboutDocument(ask, languageOrDefault("vi"), new AbortController().signal),
    )) {
      out.push(line);
    }
    return out;
  }

  it("streams the answer without thoughts and sends the whole conversation", async () => {
    replies = [
      {
        chunks: [
          chunk([{ text: "Looking for the phone number", thought: true }]),
          chunk([{ text: "Call " }]),
          chunk([{ text: "(555) 014-2290." }], "STOP"),
        ],
      },
    ];
    const out = await lines();
    expect(out).toEqual([
      { type: "delta", text: "Call " },
      { type: "delta", text: "(555) 014-2290." },
      { type: "done" },
    ]);

    const body = received[0].body as Body;
    expect(body.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: "LOW",
      includeThoughts: true,
    });
    expect(body.generationConfig.responseMimeType).toBeUndefined();
    expect(body.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    const first = body.contents[0].parts;
    expect(first.map((part) => part.inlineData?.mimeType ?? "text")).toEqual([
      "image/jpeg",
      "application/pdf",
      "text",
      "text",
    ]);
    expect(first[2].text).toContain("Vietnamese");
    expect(first[3].text).toBe("Can I pay later?");
    expect(body.contents[2].parts).toEqual([{ text: "What number?" }]);
  });

  it("ends with an error line the browser can show", async () => {
    replies = [
      { status: 429, error: { message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } },
      { status: 429, error: { message: "Quota exceeded.", status: "RESOURCE_EXHAUSTED" } },
    ];
    const out = await lines();
    expect(out).toHaveLength(1);
    expect(out[0].type).toBe("error");
    expect(out[0].message).toMatch(/used up its AI requests/);
  });
});

it("keeps person-facing errors as they are", () => {
  expect(describeError(new UserFacingError("Try a clearer photo."))).toBe("Try a clearer photo.");
});
