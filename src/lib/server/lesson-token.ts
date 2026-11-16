import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Lesson } from "../lesson/schema";
import { env } from "./env";

/**
 * A lesson token is `base64url(payload).base64url(hmac)`. The narration and
 * follow-up routes only accept lessons this server generated, so they cannot
 * be used as a general-purpose text-to-speech or chat proxy.
 */

const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

const sign = (payload: string) => createHmac("sha256", env.signingSecret()).update(payload).digest("base64url");

export function issueLessonToken(lesson: Lesson): string {
  const payload = Buffer.from(JSON.stringify({ lesson, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export class InvalidTokenError extends Error {}

function isBase64Url(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value) && Buffer.from(value, "base64url").toString("base64url") === value;
}

function verifyLessonToken(token: unknown): { lesson: Lesson; expiresAt: number } {
  if (typeof token !== "string" || token.length > 200_000) throw new InvalidTokenError("Missing lesson token.");
  const parts = token.split(".");
  if (parts.length !== 2 || !parts.every(isBase64Url)) throw new InvalidTokenError("Malformed lesson token.");
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload), "base64url");
  const given = Buffer.from(signature, "base64url");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new InvalidTokenError("Invalid lesson token.");

  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new InvalidTokenError("Malformed lesson token.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || !("iat" in data) || !("lesson" in data)) {
    throw new InvalidTokenError("Malformed lesson token.");
  }

  const now = Date.now();
  if (typeof data.iat !== "number" || !Number.isFinite(data.iat) || data.iat > now + CLOCK_SKEW_MS) {
    throw new InvalidTokenError("Invalid lesson token.");
  }
  const expiresAt = data.iat + MAX_AGE_MS;
  if (now >= expiresAt) throw new InvalidTokenError("This lesson has expired. Please generate it again.");

  const lesson = Lesson.safeParse(data.lesson);
  if (!lesson.success) throw new InvalidTokenError("Malformed lesson token.");
  return { lesson: lesson.data, expiresAt };
}

export function readLessonToken(token: unknown): Lesson {
  return verifyLessonToken(token).lesson;
}

/** Returns the verified token's expiry as Unix epoch milliseconds, or null if invalid. */
export function tokenExpiresAt(token: unknown): number | null {
  try {
    return verifyLessonToken(token).expiresAt;
  } catch (error) {
    if (error instanceof InvalidTokenError) return null;
    throw error;
  }
}
