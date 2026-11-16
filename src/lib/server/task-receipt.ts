import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/**
 * A picture or clip task id as handed to the browser: "<provider task id>.<signature>".
 * Only tasks this server started can be polled or animated, so nobody can read or reuse
 * other generations on the same provider account by guessing or copying their ids.
 */
const RECEIPT = /^([A-Za-z0-9_-]{6,80})\.([A-Za-z0-9_-]{43})$/;
const sign = (taskId: string) => createHmac("sha256", env.signingSecret()).update(`visual-task:${taskId}`).digest("base64url");

export function issueTaskReceipt(taskId: string): string {
  return `${taskId}.${sign(taskId)}`;
}

/** The provider's task id, or null if the receipt is malformed or wasn't signed by this server. */
export function readTaskReceipt(receipt: unknown): string | null {
  if (typeof receipt !== "string") return null;
  const match = RECEIPT.exec(receipt);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1]));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? match[1] : null;
}
