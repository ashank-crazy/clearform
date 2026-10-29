import { z } from "zod";
import { LabelsSchema } from "./labels";

const quote = z
  .string()
  .nullable()
  .describe(
    "Exact words copied from the document, in its original language, up to about 25 words. Null when the point is not printed on the document.",
  );

const isoDate = z
  .string()
  .nullable()
  .describe(
    "YYYY-MM-DD when the full date is printed or can be worked out exactly, otherwise null.",
  );

export const AnalysisSchema = z.object({
  readable: z
    .boolean()
    .describe(
      "False when the upload is not a document or is too blurry, cropped, or dark to read.",
    ),
  unreadableReason: z
    .string()
    .nullable()
    .describe("When readable is false: what went wrong and how to retake the photo."),
  title: z
    .string()
    .describe("Short name for the document, e.g. 'Hospital bill from Riverside Clinic'."),
  documentType: z
    .string()
    .describe("What kind of document this is, e.g. 'Medical bill', 'Lease renewal'."),
  sender: z.string().nullable().describe("Who sent or issued it, as printed."),
  originalLanguage: z
    .string()
    .describe("The language the document is written in, named in English."),
  urgency: z
    .enum(["act_now", "act_soon", "no_deadline", "info_only"])
    .describe(
      "act_now: a deadline within 14 days or a serious consequence. act_soon: action needed with more time. no_deadline: action needed but no date. info_only: nothing to do.",
    ),
  urgencyReason: z.string().describe("One sentence explaining the urgency."),
  summary: z
    .string()
    .describe(
      "Three to five short sentences in plain words: what this is, why they got it, what it means for them.",
    ),
  actions: z
    .array(
      z.object({
        step: z.string().describe("One thing to do, starting with a verb."),
        how: z
          .string()
          .nullable()
          .describe("How to do it: where to go, what to bring, how to pay or send."),
        deadline: isoDate,
        deadlineText: z
          .string()
          .nullable()
          .describe(
            "The deadline in words, including relative ones like 'within 30 days of the notice date'.",
          ),
        sourceQuote: quote,
      }),
    )
    .describe("What the person needs to do, in order."),
  fields: z
    .array(
      z.object({
        label: z
          .string()
          .describe("The field's label exactly as printed, in the original language."),
        meaning: z.string().describe("What the field is asking for, in plain words."),
        whatToWrite: z.string().describe("What to put there, or how to decide."),
        whereToFind: z
          .string()
          .nullable()
          .describe("Where to find this information, e.g. 'on your pay stub'."),
        example: z
          .string()
          .nullable()
          .describe("A made-up example answer. Never use the person's real data."),
        required: z.enum(["required", "optional", "unclear"]),
        alreadyFilled: z
          .boolean()
          .describe("True when the field already has something written in it."),
      }),
    )
    .describe(
      "Blanks the person has to fill in, in the order they appear. Empty for letters and bills.",
    ),
  money: z
    .array(
      z.object({
        amount: z.string().describe("The amount as printed, with currency."),
        meaning: z.string().describe("What the amount is, e.g. 'what you owe after insurance'."),
        dueDate: isoDate,
        sourceQuote: quote,
      }),
    )
    .describe("Amounts that matter to the person: what they owe, are owed, or could save."),
  dates: z
    .array(
      z.object({
        date: isoDate,
        dateText: z.string().describe("The date as the document states it."),
        label: z.string().describe("What happens on this date."),
        sourceQuote: quote,
      }),
    )
    .describe(
      "Every date that matters, including deadlines, appointments, and the date of the notice.",
    ),
  warnings: z
    .array(
      z.object({
        kind: z.enum(["deadline", "penalty", "scam_sign", "your_right", "unclear", "tip"]),
        text: z.string(),
        sourceQuote: quote,
      }),
    )
    .describe(
      "Things to watch out for: consequences of missing a deadline, signs of a scam, rights or help the document mentions, parts that are unclear or illegible, and general tips (with sourceQuote null).",
    ),
  glossary: z
    .array(z.object({ term: z.string().describe("As printed."), plain: z.string() }))
    .describe("Jargon or official terms from the document, explained simply."),
  contacts: z
    .array(
      z.object({
        name: z.string(),
        purpose: z.string().describe("When to contact them."),
        phone: z.string().nullable(),
        email: z.string().nullable(),
        address: z.string().nullable(),
        hours: z.string().nullable(),
      }),
    )
    .describe("Contact details printed on the document."),
  questionsToAsk: z
    .array(z.string())
    .describe("Questions the person may want to ask the sender, a caseworker, or a helper."),
  followUps: z
    .array(z.string())
    .describe(
      "Three or four short questions the person might ask ClearForm next about this document.",
    ),
  labels: LabelsSchema,
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Urgency = Analysis["urgency"];
export type WarningKind = Analysis["warnings"][number]["kind"];

export const MAX_PAGES = 6;
/** Base64 characters per page (a 5 MB PDF). Images are resized in the browser well below this. */
export const MAX_PAGE_BASE64 = 7_000_000;
/** Keeps the whole request under Gemini's 20 MB limit for inline files. */
export const MAX_TOTAL_BASE64 = 18_000_000;

export const PAGE_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export const PageSchema = z.object({
  mediaType: z.enum(PAGE_MEDIA_TYPES),
  data: z
    .string()
    .max(MAX_PAGE_BASE64)
    .regex(/^[A-Za-z0-9+/=]+$/),
});

export type Page = z.infer<typeof PageSchema>;

const pages = z
  .array(PageSchema)
  .min(1)
  .max(MAX_PAGES)
  .refine(
    (list) => list.reduce((sum, page) => sum + page.data.length, 0) <= MAX_TOTAL_BASE64,
    "The pages are too large together.",
  );

export const AnalyzeRequestSchema = z.object({
  language: z.string().max(10),
  pages,
  /** The person's local date, so relative deadlines and days-left are right. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const ChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const AskRequestSchema = z.object({
  language: z.string().max(10),
  pages,
  analysis: AnalysisSchema,
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Alternating turns, starting and ending with the person's question. */
  turns: z
    .array(ChatTurnSchema)
    .min(1)
    .max(21)
    .refine((list) =>
      list.every((turn, index) => turn.role === (index % 2 === 0 ? "user" : "assistant")),
    )
    .refine((list) => list[list.length - 1].role === "user"),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

/** Events sent by /api/analyze, one JSON object per line. */
export type AnalyzeEvent =
  | { type: "stage"; stage: "reading" | "thinking" | "writing" }
  | { type: "progress"; chars: number }
  | { type: "result"; analysis: Analysis }
  | { type: "error"; message: string };
