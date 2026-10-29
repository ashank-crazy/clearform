import { describe, expect, it } from "vitest";
import { ANALYSIS_JSON_SCHEMA } from "./ai";
import { LABELS_EN, withFallback } from "./labels";
import { SAMPLES } from "./samples";
import { AnalysisSchema, AnalyzeRequestSchema, AskRequestSchema, MAX_PAGES } from "./schema";

// The JSON Schema keywords Gemini's responseJsonSchema reads.
const GEMINI_KEYWORDS = new Set([
  "$id",
  "$defs",
  "$ref",
  "$anchor",
  "type",
  "format",
  "title",
  "description",
  "enum",
  "items",
  "prefixItems",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
  "anyOf",
  "oneOf",
  "properties",
  "additionalProperties",
  "required",
  "propertyOrdering",
]);

type Node = Record<string, unknown>;

/** Visits every sub-schema, skipping property names and other non-schema values. */
function eachSchema(node: Node, visit: (schema: Node) => void) {
  visit(node);
  const children = [
    ...Object.values((node.properties ?? {}) as Record<string, Node>),
    ...Object.values((node.$defs ?? {}) as Record<string, Node>),
    ...((node.anyOf ?? []) as Node[]),
    ...((node.oneOf ?? []) as Node[]),
    ...((node.prefixItems ?? []) as Node[]),
    ...[node.items, node.additionalProperties].filter(
      (child): child is Node => typeof child === "object" && child !== null,
    ),
  ];
  for (const child of children) eachSchema(child, visit);
}

describe("AnalysisSchema", () => {
  it.each(SAMPLES.map((sample) => [sample.id, sample]))("accepts the %s sample", (_, sample) => {
    expect(AnalysisSchema.safeParse(sample.analysis).success).toBe(true);
  });

  it("converts to a JSON schema that Gemini reads in full", () => {
    let objects = 0;
    eachSchema(ANALYSIS_JSON_SCHEMA as Node, (schema) => {
      for (const key of Object.keys(schema)) expect(GEMINI_KEYWORDS).toContain(key);
      if (schema.type === "object") {
        objects++;
        expect(schema.additionalProperties).toBe(false);
        expect(schema.required).toEqual(Object.keys(schema.properties as object));
      }
    });
    expect(objects).toBeGreaterThan(5);
  });

  it("describes every label with its English text", () => {
    const text = JSON.stringify(ANALYSIS_JSON_SCHEMA);
    expect(text).toContain(LABELS_EN.notAdvice);
    expect(text).toContain(LABELS_EN.whereItSays);
  });
});

describe("withFallback", () => {
  it("fills blank labels with English", () => {
    const labels = withFallback({ ...LABELS_EN, money: "Dinero", dates: "  " });
    expect(labels.money).toBe("Dinero");
    expect(labels.dates).toBe("Dates");
  });
});

describe("request validation", () => {
  const page = { mediaType: "image/jpeg", data: "aGVsbG8=" };

  it("accepts a normal upload", () => {
    expect(
      AnalyzeRequestSchema.safeParse({ language: "en", pages: [page], today: "2026-10-29" })
        .success,
    ).toBe(true);
  });

  it("rejects unsupported files, too many pages, and non-base64 data", () => {
    const bad = [
      {
        language: "en",
        pages: [{ mediaType: "image/svg+xml", data: "aGVsbG8=" }],
        today: "2026-10-29",
      },
      { language: "en", pages: Array(MAX_PAGES + 1).fill(page), today: "2026-10-29" },
      {
        language: "en",
        pages: [{ mediaType: "image/png", data: "not base64!" }],
        today: "2026-10-29",
      },
      { language: "en", pages: [], today: "2026-10-29" },
      { language: "en", pages: [page], today: "October 29" },
    ];
    for (const body of bad) expect(AnalyzeRequestSchema.safeParse(body).success).toBe(false);
  });

  it("requires questions to alternate and end with the person's turn", () => {
    const base = {
      language: "en",
      pages: [page],
      analysis: SAMPLES[0].analysis,
      today: "2026-10-29",
    };
    const ok = [{ role: "user", content: "Hi" }];
    const notAlternating = [
      { role: "user", content: "Hi" },
      { role: "user", content: "Again" },
    ];
    const endsWithAssistant = [
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ];
    expect(AskRequestSchema.safeParse({ ...base, turns: ok }).success).toBe(true);
    expect(AskRequestSchema.safeParse({ ...base, turns: notAlternating }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ ...base, turns: endsWithAssistant }).success).toBe(false);
  });
});
