"use client";

import { ChevronDown, Quote } from "lucide-react";
import { useId, useState } from "react";

export function SourceQuote({ quote, label }: { quote: string | null; label: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!quote) return null;
  return (
    <div>
      <button
        type="button"
        className="quote-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <Quote size={14} aria-hidden />
        {label}
        <ChevronDown
          size={14}
          aria-hidden
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <p id={id} className="quote" dir="auto">
          <mark>{quote}</mark>
        </p>
      )}
    </div>
  );
}
