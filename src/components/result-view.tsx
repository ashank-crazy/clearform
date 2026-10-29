"use client";

import {
  ArrowLeft,
  Banknote,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleHelp,
  Clock,
  Copy,
  Eye,
  FileText,
  Info,
  Lightbulb,
  ListChecks,
  Mail,
  MapPin,
  PenLine,
  Phone,
  Printer,
  Scale,
  ShieldAlert,
  Square,
  TriangleAlert,
  Users,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { daysBetween, formatDate, relativeDays } from "@/lib/dates";
import { buildChecklist, buildIcs, collectDates } from "@/lib/export";
import { withFallback, type Labels } from "@/lib/labels";
import type { Language } from "@/lib/languages";
import type { PreparedPage } from "@/lib/prepare";
import type { Analysis, WarningKind } from "@/lib/schema";
import { AskPanel } from "./ask-panel";
import { SourceQuote } from "./source-quote";
import { useSpeech } from "./use-speech";

interface ResultViewProps {
  analysis: Analysis;
  pages: PreparedPage[];
  /** The language the explanation is written in. */
  language: Language;
  today: string;
  /** True for a bundled sample's saved explanation, which can't take questions. */
  saved: boolean;
  onReset: () => void;
}

const URGENCY_ICON: Record<Analysis["urgency"], LucideIcon> = {
  act_now: TriangleAlert,
  act_soon: Clock,
  no_deadline: ListChecks,
  info_only: Info,
};

const URGENCY_LABEL: Record<Analysis["urgency"], keyof Labels> = {
  act_now: "actNow",
  act_soon: "actSoon",
  no_deadline: "noDeadline",
  info_only: "infoOnly",
};

const WARNING_STYLE: Record<WarningKind, { icon: LucideIcon; tone: string; label: keyof Labels }> =
  {
    scam_sign: { icon: ShieldAlert, tone: "danger", label: "scamSign" },
    penalty: { icon: TriangleAlert, tone: "danger", label: "penalty" },
    deadline: { icon: Clock, tone: "warn", label: "deadline" },
    unclear: { icon: Eye, tone: "info", label: "unclearPart" },
    your_right: { icon: Scale, tone: "ok", label: "yourRight" },
    tip: { icon: Lightbulb, tone: "info", label: "tip" },
  };

const WARNING_ORDER: WarningKind[] = [
  "scam_sign",
  "penalty",
  "deadline",
  "unclear",
  "your_right",
  "tip",
];

function DueChip({
  iso,
  today,
  locale,
  prefix,
}: {
  iso: string;
  today: string;
  locale: string;
  prefix?: string;
}) {
  const days = daysBetween(today, iso);
  const tone =
    days === null
      ? ""
      : days < 0
        ? " chip-muted"
        : days <= 7
          ? " chip-danger"
          : days <= 21
            ? " chip-warn"
            : "";
  return (
    <span className={`chip${tone}`}>
      <CalendarDays size={14} aria-hidden />
      {prefix ? `${prefix}: ` : ""}
      {formatDate(iso, locale)}
      {days !== null && ` · ${relativeDays(days, locale)}`}
    </span>
  );
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ResultView({ analysis, pages, language, today, saved, onReset }: ResultViewProps) {
  const labels = withFallback(analysis.labels);
  const locale = language.code;
  const speech = useSpeech(locale);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const dated = collectDates(analysis, today);
  const upcoming = [
    ...analysis.actions.flatMap((action) => (action.deadline ? [action.deadline] : [])),
    ...analysis.money.flatMap((item) => (item.dueDate ? [item.dueDate] : [])),
  ]
    .filter((iso) => (daysBetween(today, iso) ?? -1) >= 0)
    .sort()[0];
  const warnings = [...analysis.warnings].sort(
    (a, b) => WARNING_ORDER.indexOf(a.kind) - WARNING_ORDER.indexOf(b.kind),
  );
  const UrgencyIcon = URGENCY_ICON[analysis.urgency];

  const sections = [
    { id: "plain", title: labels.plainWords, show: true },
    { id: "todo", title: labels.whatToDo, show: analysis.actions.length > 0 },
    { id: "fields", title: labels.fillingIn, show: analysis.fields.length > 0 },
    { id: "watch", title: labels.watchOut, show: warnings.length > 0 },
    { id: "money", title: labels.money, show: analysis.money.length > 0 },
    { id: "dates", title: labels.dates, show: analysis.dates.length > 0 },
    { id: "words", title: labels.wordsToKnow, show: analysis.glossary.length > 0 },
    {
      id: "contacts",
      title: analysis.contacts.length ? labels.contacts : labels.questionsToAsk,
      show: analysis.contacts.length > 0 || analysis.questionsToAsk.length > 0,
    },
    { id: "ask", title: labels.askTitle, show: true },
  ].filter((section) => section.show);

  const readAloud = () => {
    if (speech.speaking) return speech.stop();
    speech.speak(
      [
        analysis.title,
        analysis.urgencyReason,
        analysis.summary,
        labels.whatToDo,
        ...analysis.actions.map((a) => a.step),
      ].join(". "),
    );
  };

  const copyChecklist = async () => {
    try {
      await navigator.clipboard.writeText(buildChecklist(analysis, locale));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="result">
      <aside className={`original${showOriginal ? " open" : ""}`} aria-label="Your document">
        <div className="original-head">
          <span>
            {pages.length === 1 ? "Your document" : `Your document · ${pages.length} pages`}
          </span>
        </div>
        {pages.map((page, index) =>
          page.previewUrl ? (
            <a key={page.id} href={page.previewUrl} target="_blank" rel="noreferrer">
              <img
                className="original-page"
                src={page.previewUrl}
                alt={`Page ${index + 1} of your document`}
              />
            </a>
          ) : (
            <div key={page.id} className="original-pdf">
              <FileText size={22} aria-hidden /> {page.name}
            </div>
          ),
        )}
      </aside>

      <div className="result-main">
        <div className="result-top">
          <button type="button" className="btn btn-quiet btn-small" onClick={onReset}>
            <ArrowLeft size={18} aria-hidden /> New document
          </button>
          <button
            type="button"
            className="btn btn-small original-toggle"
            aria-expanded={showOriginal}
            onClick={() => setShowOriginal((value) => !value)}
          >
            <FileText size={18} aria-hidden /> {showOriginal ? "Hide original" : "View original"}
          </button>
        </div>

        {saved && (
          <p className="alert alert-info saved-note">
            <Info size={18} aria-hidden />
            <span>
              This is a saved sample explanation in English. With an API key, ClearForm explains
              your own documents in any of 16 languages and answers questions about them.
            </span>
          </p>
        )}

        <article lang={language.code} dir={language.dir}>
          <div className={`urgency urgency-${analysis.urgency}`} role="status">
            <UrgencyIcon size={26} aria-hidden />
            <div>
              <div className="urgency-label">{labels[URGENCY_LABEL[analysis.urgency]]}</div>
              <div className="urgency-reason">{analysis.urgencyReason}</div>
              {upcoming && (
                <div className="urgency-when">
                  {labels.due}: {formatDate(upcoming, locale)} ·{" "}
                  {relativeDays(daysBetween(today, upcoming)!, locale)}
                </div>
              )}
            </div>
          </div>

          <h2 className="doc-title">{analysis.title}</h2>
          <p className="doc-meta" dir="auto">
            {[analysis.documentType, analysis.sender].filter(Boolean).join(" · ")}
          </p>

          <div className="toolbar">
            {speech.available && (
              <button
                type="button"
                className="btn btn-small"
                onClick={readAloud}
                aria-pressed={speech.speaking}
              >
                {speech.speaking ? (
                  <Square size={16} aria-hidden />
                ) : (
                  <Volume2 size={18} aria-hidden />
                )}
                {speech.speaking ? labels.stop : labels.readAloud}
              </button>
            )}
            <button type="button" className="btn btn-small" onClick={copyChecklist}>
              {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
              {copied ? labels.copied : labels.copyChecklist}
            </button>
            {dated.length > 0 && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() =>
                  download("clearform-dates.ics", buildIcs(analysis, today), "text/calendar")
                }
              >
                <CalendarPlus size={18} aria-hidden /> {labels.addToCalendar}
              </button>
            )}
            <button type="button" className="btn btn-small" onClick={() => window.print()}>
              <Printer size={18} aria-hidden /> {labels.print}
            </button>
          </div>

          <nav className="section-nav" aria-label="Sections">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title}
              </a>
            ))}
          </nav>

          <section id="plain" className="panel summary-panel">
            <h3>
              <BookOpen size={22} aria-hidden /> {labels.plainWords}
            </h3>
            <p className="summary">{analysis.summary}</p>
          </section>

          {analysis.actions.length > 0 && (
            <section id="todo" className="panel">
              <h3>
                <ListChecks size={22} aria-hidden /> {labels.whatToDo}
              </h3>
              <ol className="list">
                {analysis.actions.map((action, index) => {
                  const isDone = done.has(index);
                  return (
                    <li key={index} className={`action${isDone ? " done" : ""}`}>
                      <button
                        type="button"
                        className="check"
                        aria-pressed={isDone}
                        aria-label={action.step}
                        onClick={() =>
                          setDone((current) => {
                            const next = new Set(current);
                            if (next.has(index)) next.delete(index);
                            else next.add(index);
                            return next;
                          })
                        }
                      >
                        <Check size={16} aria-hidden />
                      </button>
                      <div>
                        <div className="action-step" dir="auto">
                          {action.step}
                        </div>
                        {action.how && <p className="action-how">{action.how}</p>}
                        {(action.deadline || action.deadlineText) && (
                          <div className="chips">
                            {action.deadline ? (
                              <DueChip
                                iso={action.deadline}
                                today={today}
                                locale={locale}
                                prefix={labels.due}
                              />
                            ) : (
                              <span className="chip chip-muted">
                                <CalendarDays size={14} aria-hidden /> {action.deadlineText}
                              </span>
                            )}
                          </div>
                        )}
                        <SourceQuote quote={action.sourceQuote} label={labels.whereItSays} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {analysis.fields.length > 0 && (
            <section id="fields" className="panel">
              <h3>
                <PenLine size={22} aria-hidden /> {labels.fillingIn}
              </h3>
              <ul className="list">
                {analysis.fields.map((field, index) => (
                  <li key={index} className="field">
                    <div className="field-label">
                      <strong dir="auto">{field.label}</strong>
                      {field.alreadyFilled ? (
                        <span className="chip chip-ok">
                          <Check size={14} aria-hidden /> {labels.alreadyFilled}
                        </span>
                      ) : field.required === "required" ? (
                        <span className="chip">{labels.required}</span>
                      ) : field.required === "optional" ? (
                        <span className="chip chip-muted">{labels.optional}</span>
                      ) : (
                        <span className="chip chip-warn">{labels.maybeRequired}</span>
                      )}
                    </div>
                    <p className="field-meaning">{field.meaning}</p>
                    <dl className="field-detail">
                      <dt>{labels.whatToWrite}</dt>
                      <dd>{field.whatToWrite}</dd>
                      {field.whereToFind && (
                        <>
                          <dt>{labels.whereToFind}</dt>
                          <dd>{field.whereToFind}</dd>
                        </>
                      )}
                      {field.example && (
                        <>
                          <dt>{labels.example}</dt>
                          <dd>
                            <em>{field.example}</em>
                          </dd>
                        </>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section id="watch" className="panel">
              <h3>
                <TriangleAlert size={22} aria-hidden /> {labels.watchOut}
              </h3>
              <ul className="list">
                {warnings.map((warning, index) => {
                  const style = WARNING_STYLE[warning.kind];
                  const Icon = style.icon;
                  return (
                    <li key={index} className={`warning tone-${style.tone}`}>
                      <span className="warning-icon">
                        <Icon size={18} aria-hidden />
                      </span>
                      <div>
                        <div className="warning-kind">{labels[style.label]}</div>
                        <div>{warning.text}</div>
                        {warning.sourceQuote ? (
                          <SourceQuote quote={warning.sourceQuote} label={labels.whereItSays} />
                        ) : (
                          <div className="chips">
                            <span className="chip chip-muted">{labels.generalTip}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {analysis.money.length > 0 && (
            <section id="money" className="panel">
              <h3>
                <Banknote size={22} aria-hidden /> {labels.money}
              </h3>
              <ul className="list">
                {analysis.money.map((item, index) => (
                  <li key={index} className="money-item">
                    <span className="money-amount" dir="auto">
                      {item.amount}
                    </span>
                    <div>
                      <div>{item.meaning}</div>
                      {item.dueDate && (
                        <div className="chips">
                          <DueChip
                            iso={item.dueDate}
                            today={today}
                            locale={locale}
                            prefix={labels.due}
                          />
                        </div>
                      )}
                      <SourceQuote quote={item.sourceQuote} label={labels.whereItSays} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {analysis.dates.length > 0 && (
            <section id="dates" className="panel">
              <h3>
                <CalendarDays size={22} aria-hidden /> {labels.dates}
              </h3>
              <ul className="list">
                {[...analysis.dates]
                  .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
                  .map((item, index) => {
                    const days = item.date ? daysBetween(today, item.date) : null;
                    return (
                      <li
                        key={index}
                        className={`date-item${days !== null && days < 0 ? " past" : ""}`}
                      >
                        <span className="date-when">
                          {item.date ? formatDate(item.date, locale) : item.dateText}
                          {days !== null && <small>{relativeDays(days, locale)}</small>}
                        </span>
                        <div>
                          <div>{item.label}</div>
                          <SourceQuote quote={item.sourceQuote} label={labels.whereItSays} />
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {analysis.glossary.length > 0 && (
            <section id="words" className="panel">
              <h3>
                <BookOpen size={22} aria-hidden /> {labels.wordsToKnow}
              </h3>
              <dl className="glossary">
                {analysis.glossary.map((entry, index) => (
                  <div key={index}>
                    <dt dir="auto">{entry.term}</dt>
                    <dd>{entry.plain}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {(analysis.contacts.length > 0 || analysis.questionsToAsk.length > 0) && (
            <section id="contacts" className="panel">
              {analysis.contacts.length > 0 && (
                <>
                  <h3>
                    <Users size={22} aria-hidden /> {labels.contacts}
                  </h3>
                  <div className="contacts">
                    {analysis.contacts.map((contact, index) => (
                      <div key={index} className="contact">
                        <div className="contact-name" dir="auto">
                          {contact.name}
                        </div>
                        <p className="contact-purpose">{contact.purpose}</p>
                        {contact.phone && (
                          <div className="contact-line">
                            <Phone size={16} aria-hidden />
                            <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} dir="ltr">
                              {contact.phone}
                            </a>
                          </div>
                        )}
                        {contact.email && (
                          <div className="contact-line">
                            <Mail size={16} aria-hidden />
                            <a href={`mailto:${contact.email}`} dir="ltr">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.address && (
                          <div className="contact-line">
                            <MapPin size={16} aria-hidden />{" "}
                            <span dir="auto">{contact.address}</span>
                          </div>
                        )}
                        {contact.hours && (
                          <div className="contact-line">
                            <Clock size={16} aria-hidden /> <span dir="auto">{contact.hours}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {analysis.questionsToAsk.length > 0 && (
                <>
                  <h3 style={{ marginTop: analysis.contacts.length ? 22 : 0 }}>
                    <CircleHelp size={22} aria-hidden /> {labels.questionsToAsk}
                  </h3>
                  <ul className="bullets">
                    {analysis.questionsToAsk.map((question, index) => (
                      <li key={index} dir="auto">
                        {question}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <AskPanel
            analysis={analysis}
            pages={pages}
            language={language}
            labels={labels}
            today={today}
            disabled={saved}
          />

          <p className="disclaimer" dir="auto">
            <Info size={16} aria-hidden /> {labels.notAdvice}
          </p>
        </article>
      </div>
    </div>
  );
}
