"use client";

import { LoaderCircle, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Labels } from "@/lib/labels";
import type { Language } from "@/lib/languages";
import { errorMessage, readNdjson } from "@/lib/ndjson";
import type { PreparedPage } from "@/lib/prepare";
import type { Analysis, AskRequest, ChatTurn } from "@/lib/schema";

type AskEvent =
  { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string };

const MAX_TURNS = 21;

export function AskPanel({
  analysis,
  pages,
  language,
  labels,
  today,
  disabled,
}: {
  analysis: Analysis;
  pages: PreparedPage[];
  language: Language;
  labels: Labels;
  today: string;
  disabled: boolean;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy || disabled) return;
    if (turns.length + 1 > MAX_TURNS) {
      setError("This conversation is getting long. Start a new document to keep asking.");
      return;
    }
    const next: ChatTurn[] = [...turns, { role: "user", content: text.slice(0, 4000) }];
    setTurns(next);
    setDraft("");
    setError(null);
    setBusy(true);
    setPending("");
    abort.current = new AbortController();

    let answer = "";
    try {
      const body: AskRequest = {
        language: language.code,
        pages: pages.map(({ mediaType, data }) => ({ mediaType, data })),
        analysis,
        today,
        turns: next,
      };
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abort.current.signal,
      });
      if (!response.ok || !response.body) throw new Error(await errorMessage(response));
      for await (const event of readNdjson<AskEvent>(response.body)) {
        if (event.type === "delta") {
          answer += event.text;
          setPending(answer);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
      setTurns([...next, { role: "assistant", content: answer.trim() || "…" }]);
    } catch (caught) {
      if (abort.current?.signal.aborted) return;
      // Drop the unanswered question so the conversation still alternates.
      setTurns(turns);
      setDraft(text);
      setError(
        caught instanceof Error ? caught.message : "Something went wrong. Please try again.",
      );
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  const suggestions = turns.length === 0 ? analysis.followUps.slice(0, 4) : [];

  return (
    <section id="ask" className="panel ask-panel">
      <h3>
        <MessageCircle size={22} aria-hidden /> {labels.askTitle}
      </h3>
      {disabled ? (
        <p className="alert alert-info" style={{ marginTop: 0 }}>
          Questions need a live connection. Add a Gemini API key on the server to ask ClearForm
          about your own documents.
        </p>
      ) : (
        <>
          {(turns.length > 0 || pending !== null) && (
            <div className="chat" aria-live="polite">
              {turns.map((turn, index) => (
                <div key={index} className={`bubble bubble-${turn.role}`} dir="auto">
                  {turn.content}
                </div>
              ))}
              {pending !== null && (
                <div className="bubble bubble-assistant" dir="auto">
                  {pending || <LoaderCircle size={18} className="spin" aria-label="Thinking" />}
                </div>
              )}
            </div>
          )}
          {error && (
            <div
              className="bubble bubble-error"
              role="alert"
              dir="auto"
              style={{ marginBottom: 12 }}
            >
              {error}
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="suggestions">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion"
                  onClick={() => void ask(suggestion)}
                  disabled={busy}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form className="ask-form" onSubmit={onSubmit}>
            <label htmlFor="ask-input" className="sr-only">
              {labels.askPlaceholder}
            </label>
            <input
              id="ask-input"
              className="ask-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={labels.askPlaceholder}
              maxLength={4000}
              dir="auto"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !draft.trim()}>
              {busy ? (
                <LoaderCircle size={18} className="spin" aria-hidden />
              ) : (
                <Send size={18} aria-hidden />
              )}
              <span className="sr-only">{labels.send}</span>
            </button>
          </form>
        </>
      )}
    </section>
  );
}
