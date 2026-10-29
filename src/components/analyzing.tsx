"use client";

import { CircleCheck, Circle, FileText, LoaderCircle } from "lucide-react";
import type { PreparedPage } from "@/lib/prepare";

export type Stage = "sending" | "reading" | "thinking" | "writing";

const STEPS: { stage: Stage; text: string }[] = [
  { stage: "reading", text: "Reading your document" },
  { stage: "thinking", text: "Working out what it means for you" },
  { stage: "writing", text: "Writing it in plain words" },
];

const ORDER: Stage[] = ["sending", "reading", "thinking", "writing"];

/** A typical explanation is about this long, so the bar fills sensibly while writing. */
const EXPECTED_CHARS = 9000;

export function Analyzing({
  page,
  stage,
  chars,
  languageName,
  onCancel,
}: {
  page: PreparedPage;
  stage: Stage;
  chars: number;
  languageName: string;
  onCancel: () => void;
}) {
  const current = ORDER.indexOf(stage);
  const base = { sending: 4, reading: 12, thinking: 30, writing: 45 }[stage];
  const percent = stage === "writing" ? Math.min(96, base + (chars / EXPECTED_CHARS) * 51) : base;

  return (
    <section className="analyzing" aria-live="polite">
      <div className="scan">
        {page.previewUrl ? (
          <img src={page.previewUrl} alt="" />
        ) : (
          <div className="scan-pdf">
            <FileText size={48} aria-hidden />
          </div>
        )}
      </div>
      <ol className="stages">
        {STEPS.map((step) => {
          const index = ORDER.indexOf(step.stage);
          const state = index < current ? "done" : index === current ? "active" : "";
          return (
            <li key={step.stage} className={`stage ${state}`}>
              {state === "done" ? (
                <CircleCheck size={20} aria-hidden />
              ) : state === "active" ? (
                <LoaderCircle size={20} className="spin" aria-hidden />
              ) : (
                <Circle size={20} aria-hidden />
              )}
              {step.text}
              {step.stage === "writing" && languageName !== "English" ? ` (${languageName})` : ""}
            </li>
          );
        })}
      </ol>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="analyzing-note">This usually takes 20 to 60 seconds.</p>
      <button type="button" className="btn btn-quiet" onClick={onCancel}>
        Cancel
      </button>
    </section>
  );
}
