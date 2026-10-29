"use client";

import {
  Camera,
  CircleAlert,
  FileSearch,
  FileText,
  Info,
  Languages,
  ListChecks,
  LoaderCircle,
  Quote,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { LANGUAGES } from "@/lib/languages";
import type { PreparedPage } from "@/lib/prepare";
import type { Sample } from "@/lib/samples";
import { MAX_PAGES } from "@/lib/schema";

interface UploaderProps {
  pages: PreparedPage[];
  language: string;
  live: boolean;
  preparing: boolean;
  error: string | null;
  samples: readonly Sample[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onLanguage: (code: string) => void;
  onExplain: () => void;
  onSample: (sample: Sample) => void;
}

export function Uploader(props: UploaderProps) {
  const { pages, language, live, preparing, error, samples } = props;
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = (list: FileList | null) => {
    if (list?.length) props.onAdd(Array.from(list));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    take(event.dataTransfer.files);
  };

  const full = pages.length >= MAX_PAGES;

  return (
    <>
      <section className="hero">
        <h1>
          Understand any form or letter, <mark>in your language</mark>.
        </h1>
        <p>
          Take a photo of a bill, form, or official letter. ClearForm tells you what it says, what
          you need to do, and by when.
        </p>
      </section>

      <section className="upload-card" aria-label="Upload a document">
        <div
          className={`dropzone${dragging ? " dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <FileSearch className="dropzone-icon" size={38} aria-hidden />
          <p className="dropzone-title">
            {pages.length ? "Add another page, or explain it" : "Add a photo, screenshot, or PDF"}
          </p>
          <p className="dropzone-hint">
            Up to {MAX_PAGES} pages of one document. Lay it flat in good light.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="btn"
              onClick={() => cameraInput.current?.click()}
              disabled={full || preparing}
            >
              <Camera size={20} aria-hidden /> Take a photo
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => fileInput.current?.click()}
              disabled={full || preparing}
            >
              <Upload size={20} aria-hidden /> Choose files
            </button>
          </div>
          <input
            ref={cameraInput}
            className="file-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              take(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={fileInput}
            className="file-input"
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={(event) => {
              take(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {(pages.length > 0 || preparing) && (
          <ul className="thumbs" aria-label="Pages">
            {pages.map((page, index) => (
              <li key={page.id} className="thumb">
                {page.previewUrl ? (
                  <img src={page.previewUrl} alt={`Page ${index + 1}: ${page.name}`} />
                ) : (
                  <>
                    <FileText size={28} aria-hidden />
                    <span>{page.name}</span>
                  </>
                )}
                <span className="thumb-number">{index + 1}</span>
                <button
                  type="button"
                  className="thumb-remove"
                  aria-label={`Remove page ${index + 1}`}
                  onClick={() => props.onRemove(page.id)}
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            ))}
            {preparing && (
              <li className="thumb">
                <LoaderCircle className="spin" size={24} aria-hidden />
                <span>Preparing…</span>
              </li>
            )}
          </ul>
        )}

        <div className="field-row">
          <label htmlFor="language">
            <Languages size={20} aria-hidden /> Explain it in
          </label>
          <select
            id="language"
            className="select"
            value={language}
            onChange={(event) => props.onLanguage(event.target.value)}
          >
            {LANGUAGES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.native}
                {option.native !== option.english ? ` · ${option.english}` : ""}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-big"
          onClick={props.onExplain}
          disabled={!pages.length || preparing || !live}
        >
          Explain this document
        </button>

        {error && (
          <p className="alert alert-error" role="alert">
            <CircleAlert size={18} aria-hidden /> {error}
          </p>
        )}
        {!live && (
          <p className="alert alert-info">
            <Info size={18} aria-hidden />
            <span>
              Live explanations are off on this server because it has no Gemini API key. You can
              still open the samples below to see saved explanations.
            </span>
          </p>
        )}
        <p className="privacy">
          <ShieldCheck size={16} aria-hidden />
          <span>
            Your document is sent to Google&apos;s Gemini to be explained. ClearForm doesn&apos;t
            save it, but Google may keep and review what&apos;s sent, so cover ID or account numbers
            before you take the photo.
          </span>
        </p>
      </section>

      <section className="samples" aria-labelledby="samples-title">
        <h2 id="samples-title">No document handy? Try a sample</h2>
        <div className="sample-grid">
          {samples.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="sample"
              onClick={() => props.onSample(sample)}
            >
              <img src={sample.image} alt="" />
              <span className="sample-body">
                <span className="sample-name">{sample.name}</span>
                <span className="sample-blurb">{sample.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="how" aria-label="What you get">
        <div className="how-item">
          <div className="how-icon">
            <ListChecks size={22} aria-hidden />
          </div>
          <h3>What to do, and by when</h3>
          <p>A checklist with every deadline, the amounts that matter, and who to call.</p>
        </div>
        <div className="how-item">
          <div className="how-icon">
            <FileText size={22} aria-hidden />
          </div>
          <h3>Help filling it in</h3>
          <p>Each blank on a form explained: what it means, what to write, where to find it.</p>
        </div>
        <div className="how-item">
          <div className="how-icon">
            <Quote size={22} aria-hidden />
          </div>
          <h3>Proof from the page</h3>
          <p>Every point links to the exact words on the document, so you can check it yourself.</p>
        </div>
      </section>
    </>
  );
}
