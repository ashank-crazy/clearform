import { askAboutDocument, liveAiEnabled } from "@/lib/ai";
import { findLanguage } from "@/lib/languages";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { AskRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!liveAiEnabled()) {
    return fail("Questions need a live connection. Add GEMINI_API_KEY to .env.local.", 503);
  }
  if (!allowRequest(clientKey(request, "ask"), 120)) {
    return fail("You've asked a lot of questions this hour. Please try again later.", 429);
  }

  const parsed = AskRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("That question couldn't be sent.", 400);
  const language = findLanguage(parsed.data.language);
  if (!language) return fail("Unknown language.", 400);

  return new Response(askAboutDocument(parsed.data, language, request.signal), {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
