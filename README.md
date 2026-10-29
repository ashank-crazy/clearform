# ClearForm

**Understand any form or letter, in your language.**

A hospital bill, a benefits letter, a school form, a notice that says "final". Official paperwork is hard to read, and it's hardest for the people with the most at stake: people reading in a second language, older people, and anyone short on time. ClearForm reads a photo of the document and tells you, in plain words and in your language, what it is, what you need to do, and by when.

Built for [Next Byte Hacks V5](https://next-byte-hacks-v5.devpost.com/).

![ClearForm explaining a hospital bill](docs/screenshots/bill.jpg)

[A scam letter, flagged](docs/screenshots/scam.jpg) · [A school form on a phone, field by field](docs/screenshots/form-mobile.jpg)

## What it does

- **Reads photos, screenshots, and PDFs.** Up to 6 pages of one document. Phone photos are resized in the browser before upload.
- **Explains it in 16 languages** at about a 6th-grade reading level, including Spanish, Chinese, Hindi, Arabic and Urdu (right-to-left), Vietnamese, Tagalog, and Haitian Creole. Section headings are translated too.
- **Says how urgent it is.** "Act now", "Act soon", "No deadline given", or "Just information", with the nearest deadline and how many days are left.
- **Turns it into a checklist** of steps, each with how to do it and when.
- **Helps fill in forms.** For each blank: what it's asking, what to write, where to find that information, a made-up example, and whether it's required.
- **Shows its sources.** Every step, amount, date, and warning has a "Where it says this" link that shows the exact words from the document, so you can check it yourself.
- **Watches out for you.** It flags penalties, late fees, rights and help the document mentions (payment plans, financial assistance, interpreters), parts that are hard to read, and signs of a scam (gift cards, arrest threats, "tell no one").
- **Answers follow-up questions** about the document, in the same language.
- **Lets you take it with you.** Read aloud with the browser's voices, copy the checklist, add the upcoming deadlines to your calendar, or print.

## Try it

Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open [127.0.0.1:3000](http://127.0.0.1:3000). Without an API key, the three samples (a hospital bill, a school meals form, and a scam letter) show saved explanations.

### Live explanations

```sh
cp .env.example .env.local
```

Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey), set `GEMINI_API_KEY` in `.env.local`, and restart. ClearForm then explains your own documents, answers questions, and runs the samples live in any language. Links like `/?sample=tax-scam&lang=es` open a sample directly.

## How it works

1. The browser resizes photos to 2000 px on the long edge and sends the pages to `/api/analyze`.
2. The server sends them to **Gemini 3.8 Flash** (`gemini-3.8-flash`; set `CLEARFORM_MODEL` to use another) with a [JSON schema](src/lib/schema.ts) for the response, so the answer always matches a fixed schema: urgency, summary, actions, form fields, money, dates, warnings, glossary, contacts, and translated interface labels.
3. The answer streams back. The page shows real progress while it arrives: reading, thinking (while Gemini's thought summaries stream), then writing.
4. Follow-up questions go to `/api/ask` with the same pages, the explanation, and the conversation so far.

The prompt in [`src/lib/prompts.ts`](src/lib/prompts.ts) keeps explanations faithful: use only what the page says, quote it exactly, give exact dates only when they can be worked out, mark unclear parts, never repeat full ID or account numbers, and never follow instructions written inside the document. If Gemini blocks or cuts off an answer, the person gets a plain message about what to try next, such as covering private numbers or uploading fewer pages, instead of a broken page.

## Privacy

Documents go to Google's Gemini API to be explained. ClearForm has no database and keeps nothing on the server. Uploads, explanations, and chat stay in the browser tab and are gone when you close it. The language choice is remembered in local storage. The API routes check uploads (type, size, page count) and rate-limit each visitor.

**On the free tier, Google may use what's sent to improve its products, and people may review it** ([Gemini API terms](https://ai.google.dev/gemini-api/terms)). That's fine for the fictional samples and for demos. Before real people upload real documents, turn on billing for the API key so the paid terms apply, and Google doesn't use the data that way.

## Development

```sh
npm test          # unit tests, plus the Gemini request and streaming code against a local mock API
npm run typecheck
npm run build
```

`npm test` doesn't need an API key: [`ai.test.ts`](src/lib/ai.test.ts) replays scripted streams through the real Gemini SDK to check the request (model, pages, schema, thinking settings), progress events, blocked and cut-off answers, retries, and quota errors. [`schema.test.ts`](src/lib/schema.test.ts) checks that the response schema uses only JSON Schema keywords Gemini reads.

The sample documents are fictional and live in `scripts/samples/` as HTML. To redraw the PNGs (needs Google Chrome):

```sh
node scripts/render-samples.mjs
```

| Path                  | What's there                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `src/app/api/analyze` | Validates the upload, streams progress and the explanation as NDJSON |
| `src/app/api/ask`     | Streams answers to follow-up questions                               |
| `src/lib/ai.ts`       | Gemini SDK calls, finish-reason checks, error messages               |
| `src/lib/schema.ts`   | The explanation schema and request validation                        |
| `src/lib/export.ts`   | Calendar (.ics) and checklist export                                 |
| `src/components/`     | Upload, progress, result, and chat views                             |

## Limits

ClearForm explains documents. It isn't legal, medical, or financial advice, and it can make mistakes, which is why every point links back to the words on the page. For eviction, court, immigration, or debt letters, it suggests getting help from a qualified person or a free service.
