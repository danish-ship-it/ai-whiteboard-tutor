import "server-only";
import { ConfigError } from "./env";
import { InvalidTokenError } from "./lesson-token";
import { clientIp, rateLimit } from "./rate-limit";
import { toTutorError } from "./claude";

export function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json({ error: message }, { status, headers });
}

export async function readJson(request: Request, maxBytes: number): Promise<Record<string, unknown> | null> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

/** Returns a 429 response when the caller exceeded the route's budget, otherwise null. */
export function limitOrNull(request: Request, route: string, limit: number, windowMs: number) {
  const result = rateLimit(`${route}:${clientIp(request)}`, limit, windowMs);
  return result.ok
    ? null
    : jsonError("You're going a bit fast. Please wait a moment and try again.", 429, { "Retry-After": String(result.retryAfter) });
}

/** Maps any thrown error to a safe, user-presentable JSON response. */
export function errorResponse(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return jsonError("Request cancelled.", 499);
  if (error instanceof InvalidTokenError) return jsonError(error.message, 400);
  if (error instanceof ConfigError) {
    console.error(error.message);
    return jsonError("This service isn’t set up on the server yet.", 503);
  }
  try {
    const tutor = toTutorError(error);
    return jsonError(tutor.message, tutor.status);
  } catch (unknownError) {
    console.error(unknownError);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}
