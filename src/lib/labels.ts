import { z } from "zod";

/** Interface labels for the result view. The model translates them along with the explanation. */
export const LABELS_EN = {
  plainWords: "In plain words",
  whatToDo: "What to do",
  fillingIn: "Filling it in",
  money: "Money",
  dates: "Dates",
  watchOut: "Watch out",
  wordsToKnow: "Words to know",
  contacts: "Who to contact",
  questionsToAsk: "Questions you could ask them",
  askTitle: "Ask about this document",
  askPlaceholder: "Type your question",
  send: "Send",
  readAloud: "Read aloud",
  stop: "Stop",
  whereItSays: "Where it says this",
  generalTip: "General tip, not from the document",
  actNow: "Act now",
  actSoon: "Act soon",
  noDeadline: "No deadline given",
  infoOnly: "Just information",
  required: "Required",
  optional: "Optional",
  maybeRequired: "May be required",
  alreadyFilled: "Already filled in",
  whatToWrite: "What to write",
  whereToFind: "Where to find it",
  example: "Example",
  due: "Due",
  deadline: "Deadline",
  penalty: "Penalty",
  scamSign: "Possible scam",
  yourRight: "Your rights and help",
  unclearPart: "Hard to read",
  tip: "Tip",
  copyChecklist: "Copy checklist",
  copied: "Copied",
  addToCalendar: "Add dates to calendar",
  print: "Print",
  notAdvice:
    "ClearForm explains documents. It isn't legal, medical, or financial advice. Check the original before you act.",
} as const;

export type LabelKey = keyof typeof LABELS_EN;
export type Labels = Record<LabelKey, string>;

const keys = Object.keys(LABELS_EN) as LabelKey[];

export const LabelsSchema = z
  .object(
    Object.fromEntries(keys.map((key) => [key, z.string().describe(LABELS_EN[key])])) as Record<
      LabelKey,
      z.ZodString
    >,
  )
  .describe(
    "Each interface label (given in its description) translated into the explanation language. Keep them as short as the English.",
  );

export function withFallback(labels: Partial<Labels> | undefined): Labels {
  return Object.fromEntries(
    keys.map((key) => [key, labels?.[key]?.trim() || LABELS_EN[key]]),
  ) as Labels;
}
