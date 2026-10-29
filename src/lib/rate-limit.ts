const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

/** In-memory sliding window per client and bucket. Enough for a single-instance demo. */
export function allowRequest(key: string, limit: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientKey(request: Request, bucket: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${bucket}:${forwarded || request.headers.get("x-real-ip") || "local"}`;
}
