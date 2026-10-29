import { formatDate, parseIsoDate } from "./dates";
import { withFallback } from "./labels";
import type { Analysis } from "./schema";

export interface DatedItem {
  date: string;
  title: string;
  detail: string | null;
}

/** Every exact date from the explanation, deduplicated and sorted. With `from`, only that day or later. */
export function collectDates(analysis: Analysis, from?: string): DatedItem[] {
  const items: DatedItem[] = [
    ...analysis.actions.flatMap((action) =>
      action.deadline ? [{ date: action.deadline, title: action.step, detail: action.how }] : [],
    ),
    ...analysis.money.flatMap((item) =>
      item.dueDate
        ? [{ date: item.dueDate, title: `${item.meaning}: ${item.amount}`, detail: null }]
        : [],
    ),
    ...analysis.dates.flatMap((item) =>
      item.date ? [{ date: item.date, title: item.label, detail: item.dateText }] : [],
    ),
  ];
  const seen = new Set<string>();
  return items
    .filter((item) => parseIsoDate(item.date) && (!from || item.date >= from))
    .filter((item) => {
      const key = `${item.date}|${item.title.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds long lines; splits by code point so multi-byte characters stay whole. */
function foldIcs(line: string): string {
  const chars = Array.from(line);
  if (chars.length <= 60) return line;
  const parts: string[] = [];
  for (let i = 0; i < chars.length; i += 60) parts.push(chars.slice(i, i + 60).join(""));
  return parts.join("\r\n ");
}

function compact(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const date = parseIsoDate(iso)!;
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}

/** Calendar events for the dates from `today` on; past dates aren't worth a reminder. */
export function buildIcs(analysis: Analysis, today: string, now = new Date()): string {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  // One event per day; the first item (actions come first) names it, the rest go in the notes.
  const byDate = new Map<string, DatedItem[]>();
  for (const item of collectDates(analysis, today)) {
    byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  }
  const events = [...byDate].flatMap(([date, items]) => {
    const notes = items.map((item) => `- ${[item.title, item.detail].filter(Boolean).join(": ")}`);
    return [
      "BEGIN:VEVENT",
      `UID:${compact(date)}-${stamp}@clearform`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${escapeIcs(items[0].title)}`,
      `DESCRIPTION:${escapeIcs([analysis.title, ...notes].join("\n"))}`,
      "BEGIN:VALARM",
      "TRIGGER:-P3D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(items[0].title)}`,
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ClearForm//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ]
      .map(foldIcs)
      .join("\r\n") + "\r\n"
  );
}

/** A plain-text copy of the explanation, for messages and notes apps. */
export function buildChecklist(analysis: Analysis, locale: string): string {
  const labels = withFallback(analysis.labels);
  const lines = [analysis.title, "", analysis.summary];

  if (analysis.actions.length) {
    lines.push("", `${labels.whatToDo}:`);
    for (const action of analysis.actions) {
      const when = action.deadline ? formatDate(action.deadline, locale) : action.deadlineText;
      lines.push(`☐ ${action.step}${when ? ` (${labels.due}: ${when})` : ""}`);
      if (action.how) lines.push(`   ${action.how}`);
    }
  }
  if (analysis.money.length) {
    lines.push("", `${labels.money}:`);
    for (const item of analysis.money) lines.push(`- ${item.amount}: ${item.meaning}`);
  }
  if (analysis.contacts.length) {
    lines.push("", `${labels.contacts}:`);
    for (const contact of analysis.contacts) {
      const details = [contact.phone, contact.email, contact.hours].filter(Boolean).join(", ");
      lines.push(`- ${contact.name}${details ? `: ${details}` : ""}`);
    }
  }
  lines.push("", labels.notAdvice);
  return lines.join("\n");
}
