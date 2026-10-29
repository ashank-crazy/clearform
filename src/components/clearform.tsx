"use client";

import { Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toIsoDate } from "@/lib/dates";
import { DEFAULT_LANGUAGE, LANGUAGES, languageOrDefault, type Language } from "@/lib/languages";
import { errorMessage, readNdjson } from "@/lib/ndjson";
import {
  PrepareError,
  preparePages,
  prepareSample,
  releasePages,
  type PreparedPage,
} from "@/lib/prepare";
import { SAMPLES, type Sample } from "@/lib/samples";
import type { Analysis, AnalyzeEvent, AnalyzeRequest } from "@/lib/schema";
import { Analyzing, type Stage } from "./analyzing";
import { ResultView } from "./result-view";
import { Uploader } from "./uploader";

type View =
  | { kind: "upload" }
  | { kind: "analyzing"; stage: Stage; chars: number }
  | { kind: "result"; analysis: Analysis; language: Language; saved: boolean }
  | { kind: "unreadable"; reason: string };

const LANGUAGE_KEY = "clearform-language";

export function ClearForm({ live }: { live: boolean }) {
  const [pages, setPages] = useState<PreparedPage[]>([]);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "upload" });
  const [today, setToday] = useState(() => toIsoDate(new Date()));
  const abort = useRef<AbortController | null>(null);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (saved && LANGUAGES.some((option) => option.code === saved)) setLanguage(saved);
    } catch {
      // Storage can be unavailable in private windows; the default language is fine.
    }
    return () => {
      abort.current?.abort();
      releasePages(pagesRef.current);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view.kind]);

  const chooseLanguage = (code: string) => {
    setLanguage(code);
    try {
      localStorage.setItem(LANGUAGE_KEY, code);
    } catch {
      // Not remembered; still applies to this visit.
    }
  };

  const addFiles = async (files: File[]) => {
    setError(null);
    setPreparing(true);
    try {
      const added = await preparePages(files, pages.length);
      setPages((current) => [...current, ...added]);
    } catch (caught) {
      setError(
        caught instanceof PrepareError
          ? caught.message
          : "That file couldn't be opened. Try a photo or PDF.",
      );
    } finally {
      setPreparing(false);
    }
  };

  const removePage = (id: string) => {
    setPages((current) => {
      releasePages(current.filter((page) => page.id === id));
      return current.filter((page) => page.id !== id);
    });
  };

  const explain = useCallback(
    async (toExplain: PreparedPage[], languageCode = language) => {
      const target = languageOrDefault(languageCode);
      const date = toIsoDate(new Date());
      setToday(date);
      setError(null);
      setView({ kind: "analyzing", stage: "sending", chars: 0 });
      abort.current = new AbortController();

      try {
        const body: AnalyzeRequest = {
          language: target.code,
          pages: toExplain.map(({ mediaType, data }) => ({ mediaType, data })),
          today: date,
        };
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abort.current.signal,
        });
        if (!response.ok || !response.body) throw new Error(await errorMessage(response));

        for await (const event of readNdjson<AnalyzeEvent>(response.body)) {
          if (event.type === "stage") {
            setView((current) =>
              current.kind === "analyzing" ? { ...current, stage: event.stage } : current,
            );
          } else if (event.type === "progress") {
            setView((current) =>
              current.kind === "analyzing"
                ? { ...current, stage: "writing", chars: event.chars }
                : current,
            );
          } else if (event.type === "error") {
            throw new Error(event.message);
          } else if (event.type === "result") {
            setView(
              event.analysis.readable
                ? { kind: "result", analysis: event.analysis, language: target, saved: false }
                : {
                    kind: "unreadable",
                    reason:
                      event.analysis.unreadableReason ||
                      "Try a sharper photo of the whole page, in good light.",
                  },
            );
            return;
          }
        }
        throw new Error("The explanation stopped early. Please try again.");
      } catch (caught) {
        if (abort.current?.signal.aborted) return;
        setError(
          caught instanceof Error ? caught.message : "Something went wrong. Please try again.",
        );
        setView({ kind: "upload" });
      }
    },
    [language],
  );

  const cancel = () => {
    abort.current?.abort();
    setView({ kind: "upload" });
  };

  const reset = () => {
    abort.current?.abort();
    releasePages(pages);
    setPages([]);
    setError(null);
    setView({ kind: "upload" });
  };

  const openSample = async (sample: Sample, languageCode = language) => {
    setError(null);
    try {
      const page = await prepareSample(sample.image, `${sample.name}.png`);
      releasePages(pages);
      setPages([page]);
      if (live) {
        await explain([page], languageCode);
      } else {
        setToday(toIsoDate(new Date()));
        setView({
          kind: "result",
          analysis: sample.analysis,
          language: languageOrDefault("en"),
          saved: true,
        });
      }
    } catch {
      setError("The sample couldn't be loaded.");
    }
  };

  // Links like /?sample=hospital-bill&lang=es open a sample directly, for demos.
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current) return;
    openedFromLink.current = true;
    const params = new URLSearchParams(window.location.search);
    const sample = SAMPLES.find((item) => item.id === params.get("sample"));
    const code = params.get("lang");
    if (code && LANGUAGES.some((option) => option.code === code)) setLanguage(code);
    if (sample) void openSample(sample, code ?? language);
    // Runs once on load.
  }, []);

  const current = languageOrDefault(language);

  return (
    <>
      {view.kind === "upload" && (
        <Uploader
          pages={pages}
          language={language}
          live={live}
          preparing={preparing}
          error={error}
          samples={SAMPLES}
          onAdd={(files) => void addFiles(files)}
          onRemove={removePage}
          onLanguage={chooseLanguage}
          onExplain={() => void explain(pages)}
          onSample={(sample) => void openSample(sample)}
        />
      )}
      {view.kind === "analyzing" && pages[0] && (
        <Analyzing
          page={pages[0]}
          stage={view.stage}
          chars={view.chars}
          languageName={current.native}
          onCancel={cancel}
        />
      )}
      {view.kind === "result" && (
        <ResultView
          analysis={view.analysis}
          pages={pages}
          language={view.language}
          today={today}
          saved={view.saved}
          onReset={reset}
        />
      )}
      {view.kind === "unreadable" && (
        <section className="unreadable" role="alert">
          <Camera size={44} aria-hidden style={{ color: "var(--accent)" }} />
          <h2>Let&apos;s try that photo again</h2>
          <p>{view.reason}</p>
          <div className="button-row" style={{ marginTop: 18 }}>
            <button type="button" className="btn btn-primary" onClick={reset}>
              Take a new photo
            </button>
            <button type="button" className="btn" onClick={() => setView({ kind: "upload" })}>
              Change pages
            </button>
          </div>
        </section>
      )}
    </>
  );
}
