import "server-only";

/**
 * Sliding-window limiter kept in memory. On Vercel each function instance has
 * its own window, so this is a per-instance guard against bursts, not a global
 * quota (see README, "Known limitations").
 */
const windows = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 5000) windows.clear();
  return { ok: true, retryAfter: 0 };
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
