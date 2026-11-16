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

const sign = (payload: string) => createHmac("sha256", env.signingSecret()).update(payload).digest("base64url");

export function issueLessonToken(lesson: Lesson): string {
  const payload = Buffer.from(JSON.stringify({ lesson, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export class InvalidTokenError extends Error {}

export function readLessonToken(token: unknown): Lesson {
  if (typeof token !== "string" || token.length > 200_000) throw new InvalidTokenError("Missing lesson token.");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new InvalidTokenError("Malformed lesson token.");

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new InvalidTokenError("Invalid lesson token.");

  const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { lesson: unknown; iat: number };
  if (Date.now() - data.iat > MAX_AGE_MS) throw new InvalidTokenError("This lesson has expired. Please generate it again.");
  return Lesson.parse(data.lesson);
}
