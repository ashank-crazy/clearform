# Devpost submission: draft

Draft text for the Devpost page. Make "Inspiration" your own story, and add the demo video link and screenshots before submitting.

## Project name

**ClearForm: understand any form or letter, in your language**

## Tagline

Photograph a confusing bill, form, or official letter. ClearForm tells you what it says, what to do, and by when, in plain words and in your language.

## Inspiration

Official paperwork decides whether people keep their benefits, pay the right amount, or show up on time, and it's written in language that's hard for almost everyone. It's hardest for people reading in a second language, older people, and families helping each other over the phone. A missed line like "within 30 days of this notice" can mean late fees, a lost benefit, or a bill sent to collections. And scammers copy the same official tone.

## What it does

- Reads a photo, screenshot, or PDF (up to 6 pages) and explains it in 16 languages at about a 6th-grade reading level.
- Starts with how urgent it is ("Act now", "Act soon") and how many days are left.
- Turns the document into a checklist of steps, with how and when to do each one.
- For forms, explains every blank: what it's asking, what to write, where to find that information, and a made-up example.
- Lists the amounts, dates, words to know, and who to contact.
- Flags penalties, rights and help the document mentions, unclear parts, and signs of a scam.
- Every point has "Where it says this", which shows the exact words from the page so you can check it.
- Answers follow-up questions about the document in the same language.
- Reads the explanation aloud, copies the checklist, adds upcoming deadlines to your calendar, or prints it.

## How we built it

- **Next.js 16 + React 19 + TypeScript.** One page with three states: upload, progress, result.
- **Gemini 3.8 Flash through the Gemini API (Google AI Studio).** Images and PDFs go straight to the model. Structured output (a Zod schema converted to JSON Schema) gives the answer the same shape every time, so the interface can render urgency, steps, fields, and warnings as real components instead of a wall of text.
- **Faithfulness by design.** The prompt requires exact quotes from the document for every claim, exact dates only when they can be worked out, and "not stated" instead of guesses. It also masks ID and account numbers and treats instructions inside the document as content, never commands.
- **Streaming.** The server streams progress (reading → thinking → writing, driven by Gemini's thought summaries) and the answer as NDJSON. Follow-up chat streams too.
- **Translated interface.** The model returns the section headings in the reader's language along with the explanation, so a Hindi or Arabic reader never sees English headings. Arabic and Urdu render right-to-left.
- **Resilience.** Brief overloads are retried automatically. A blocked or cut-off answer becomes a plain instruction ("cover the ID numbers and try again", "upload fewer pages") instead of a broken page.
- **Testing without a key.** The test suite runs the real Gemini SDK against a local mock of the streaming API to check requests, blocked and cut-off answers, retries, and quota errors.

## Challenges we ran into

- **Trust.** An explanation that's confidently wrong about a deadline is worse than none. Requiring an exact quote for each point, and showing it on demand, made the output checkable.
- **Structured output while streaming.** A cut-off or blocked answer still arrives as partial JSON. We check why the answer stopped before parsing it, so the person gets a useful message instead of an error.
- **Many languages.** Hand-translating the interface into 16 languages wasn't realistic, so the model translates the labels along with the explanation. Dates and "in 21 days" use the browser's built-in `Intl` formatting.

## Accomplishments that we're proud of

- It catches the scam sample and explains why, point by point, with the scam's own words as evidence.
- A school meals form becomes a field-by-field guide that says which blanks you can skip.
- It works on a phone, where people actually photograph their mail.

## What we learned

Plain language takes more than translation. It needs structure: what to do first, by when, and what happens if you don't. Showing the source next to each point makes people more willing to trust it.

## What's next

- Let people cover ID numbers on the photo before upload.
- Reminders before each deadline, by text message.
- Letting a caseworker or family member open a shared explanation.
- Partnering with libraries, clinics, and community centers that already help people with paperwork.

## Built with

nextjs, react, typescript, gemini, google-ai-studio, zod, lucide

## Try it out

- GitHub: https://github.com/ashank-crazy/clearform
- Demo video: _(add link)_
