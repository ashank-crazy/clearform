import { analyzeDocument, describeError, liveAiEnabled } from "@/lib/ai";
import { findLanguage } from "@/lib/languages";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import { AnalyzeRequestSchema, type AnalyzeEvent } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!liveAiEnabled()) {
    return fail("Live explanations are off. Add GEMINI_API_KEY to .env.local and restart.", 503);
  }
  if (!allowRequest(clientKey(request, "analyze"), 30)) {
    return fail("You've explained a lot of documents this hour. Please try again later.", 429);
  }

  const parsed = AnalyzeRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("That upload couldn't be read. Try a JPG, PNG, or PDF.", 400);
  const language = findLanguage(parsed.data.language);
  if (!language) return fail("Unknown language.", 400);

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalyzeEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      send({ type: "stage", stage: "reading" });
      try {
        const analysis = await analyzeDocument(parsed.data, language, send, request.signal);
        send({ type: "result", analysis });
      } catch (error) {
        if (!request.signal.aborted) send({ type: "error", message: describeError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
