import { describe, expect, it } from "vitest";
import { daysBetween, parseIsoDate, relativeDays } from "./dates";
import { buildChecklist, buildIcs, collectDates } from "./export";
import { SAMPLES } from "./samples";
import type { Analysis } from "./schema";

const bill = SAMPLES.find((sample) => sample.id === "hospital-bill")!.analysis;

describe("dates", () => {
  it("parses calendar dates locally and rejects impossible ones", () => {
    const date = parseIsoDate("2026-11-19")!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 19]);
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("Nov 19")).toBeNull();
    expect(parseIsoDate(null)).toBeNull();
  });

  it("counts whole days across a daylight saving change", () => {
    expect(daysBetween("2026-10-29", "2026-11-19")).toBe(21);
    expect(daysBetween("2026-11-19", "2026-10-29")).toBe(-21);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("writes relative days in the reader's language", () => {
    expect(relativeDays(1, "en")).toBe("tomorrow");
    expect(relativeDays(21, "es")).toBe("dentro de 21 días");
  });
});

describe("collectDates", () => {
  it("merges deadlines, due dates, and dates without duplicates, in order", () => {
    const dates = collectDates(bill);
    expect(dates.map((item) => item.date)).toEqual([...dates.map((item) => item.date)].sort());
    const keys = dates.map((item) => `${item.date}|${item.title.toLowerCase()}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(dates.some((item) => item.date === "2026-11-19")).toBe(true);
  });
});

describe("buildIcs", () => {
  it("creates one all-day event with a reminder per upcoming date", () => {
    const ics = buildIcs(bill, "2026-10-29", new Date("2026-10-29T12:00:00Z"));
    // September 14 and October 20 have passed; four items fall on November 19.
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(1);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261119\r\nDTEND;VALUE=DATE:20261120");
    expect(ics).toContain("SUMMARY:Check the bill for mistakes");
    expect(ics.replace(/\r\n /g, "")).toContain("- Pay $1\\,284.50\\, or set up a payment plan");
    expect(ics).toContain("TRIGGER:-P3D");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("skips the calendar for a letter whose only date has passed", () => {
    const scam = SAMPLES.find((sample) => sample.id === "tax-scam")!.analysis;
    expect(collectDates(scam, "2026-10-29")).toEqual([]);
    expect(buildIcs(scam, "2026-10-29")).not.toContain("BEGIN:VEVENT");
  });

  it("escapes special characters and folds long lines without splitting characters", () => {
    const analysis: Analysis = {
      ...bill,
      title: "Aviso; pagar, ahora",
      actions: [
        {
          step: "दस्तावेज़ जमा करें ".repeat(8),
          how: null,
          deadline: "2026-12-31",
          deadlineText: null,
          sourceQuote: null,
        },
      ],
      money: [],
      dates: [],
    };
    const ics = buildIcs(analysis, "2026-10-29");
    expect(ics).toContain("Aviso\\; pagar\\, ahora");
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`SUMMARY:${"दस्तावेज़ जमा करें ".repeat(8)}`);
    for (const line of ics.split("\r\n")) expect(Array.from(line).length).toBeLessThanOrEqual(61);
  });
});

describe("buildChecklist", () => {
  it("lists steps with their due dates and the disclaimer", () => {
    const text = buildChecklist(bill, "en");
    expect(text).toContain("☐ Pay $1,284.50, or set up a payment plan (Due: November 19, 2026)");
    expect(text).toContain("Patient Financial Services: (555) 014-2290");
    expect(text).toContain("isn't legal, medical, or financial advice");
  });
});
