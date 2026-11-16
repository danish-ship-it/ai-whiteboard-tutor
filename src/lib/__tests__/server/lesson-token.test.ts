import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../../server/env";
import { InvalidTokenError, issueLessonToken, readLessonToken, tokenExpiresAt } from "../../server/lesson-token";
import { pythagoras } from "../fixtures";

vi.mock("server-only", () => ({}));
vi.mock("../../server/env", () => ({
  env: { signingSecret: vi.fn(() => "lesson-token-test-secret") },
}));

const NOW = Date.UTC(2026, 10, 16);
const LIFETIME_MS = 12 * 60 * 60 * 1000;

// Construct the original wire format independently to check compatibility.
function signedPayload(json: string): string {
  const payload = Buffer.from(json).toString("base64url");
  const signature = createHmac("sha256", "lesson-token-test-secret").update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function tokenAt(iat: number): string {
  return signedPayload(JSON.stringify({ lesson: pythagoras, iat }));
}

function expectInvalid(token: unknown) {
  expect(() => readLessonToken(token)).toThrow(InvalidTokenError);
  expect(tokenExpiresAt(token)).toBeNull();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("lesson tokens", () => {
  it("round-trips a lesson and exposes its expiry in milliseconds", () => {
    const token = issueLessonToken(pythagoras);

    expect(readLessonToken(token)).toEqual(pythagoras);
    expect(tokenExpiresAt(token)).toBe(NOW + LIFETIME_MS);
    expect(token).toBe(tokenAt(NOW));
  });

  it("accepts existing tokens until their original 12-hour expiry", () => {
    const token = tokenAt(NOW - LIFETIME_MS + 1);

    expect(readLessonToken(token)).toEqual(pythagoras);
    expect(tokenExpiresAt(token)).toBe(NOW + 1);
  });

  it.each([0, 1])("rejects tokens at expiry or later (offset %i ms)", (offset) => {
    expectInvalid(tokenAt(NOW - LIFETIME_MS - offset));
  });

  it("accepts an issue time up to 60 seconds ahead for clock skew", () => {
    const token = tokenAt(NOW + 60_000);
    expect(readLessonToken(token)).toEqual(pythagoras);
    expect(tokenExpiresAt(token)).toBe(NOW + 60_000 + LIFETIME_MS);
  });

  it("rejects issue times beyond the clock skew", () => {
    expectInvalid(tokenAt(NOW + 60_001));
  });

  it("rejects a tampered payload with the original signature", () => {
    const [, signature] = tokenAt(NOW).split(".");
    const payload = Buffer.from(JSON.stringify({ lesson: { ...pythagoras, title: "Tampered" }, iat: NOW })).toString("base64url");
    expectInvalid(`${payload}.${signature}`);
  });

  it("rejects a tampered signature", () => {
    const [payload, signature] = tokenAt(NOW).split(".");
    const changed = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
    expectInvalid(`${payload}.${changed}`);
  });

  it.each([".extra", ".", ".extra.more"])("rejects extra token segments (%s)", (suffix) => {
    expectInvalid(tokenAt(NOW) + suffix);
  });

  it.each([undefined, null, 42, "", ".", "payload", ".signature", "payload."])("rejects missing or malformed tokens (%s)", (token) => {
    expectInvalid(token);
  });

  it.each(["=", "+", "/", " ", "\n"])("rejects non-base64url characters in either segment (%j)", (character) => {
    const [payload, signature] = tokenAt(NOW).split(".");
    expectInvalid(`${payload}${character}.${signature}`);
    expectInvalid(`${payload}.${signature}${character}`);
  });

  it("rejects a noncanonical signature that decodes to the same bytes", () => {
    const [payload, signature] = tokenAt(NOW).split(".");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const last = alphabet.indexOf(signature.at(-1)!);
    const noncanonical = signature.slice(0, -1) + alphabet[last + 1];

    expect(Buffer.from(noncanonical, "base64url")).toEqual(Buffer.from(signature, "base64url"));
    expectInvalid(`${payload}.${noncanonical}`);
  });

  it.each(["A", "AAA"])("rejects malformed or short signature lengths (%s)", (signature) => {
    const [payload] = tokenAt(NOW).split(".");
    expectInvalid(`${payload}.${signature}`);
  });

  it.each(["null", "[]", "42", '"text"', "{", "{}"])("rejects signed malformed payloads (%s)", (json) => {
    expectInvalid(signedPayload(json));
  });

  it.each(["null", '"1763251200000"', "true", "[]", "{}", "1e400", "-1e400"])("rejects signed invalid issue times (%s)", (iat) => {
    expectInvalid(signedPayload(`{"lesson":${JSON.stringify(pythagoras)},"iat":${iat}}`));
  });

  it("rejects a signed payload missing an issue time", () => {
    expectInvalid(signedPayload(JSON.stringify({ lesson: pythagoras })));
  });

  it("rejects signed invalid or missing lessons", () => {
    expectInvalid(signedPayload(JSON.stringify({ lesson: { title: "Incomplete" }, iat: NOW })));
    expectInvalid(signedPayload(JSON.stringify({ iat: NOW })));
  });

  it("does not hide signing configuration failures as invalid tokens", () => {
    const token = tokenAt(NOW);
    const error = new Error("Test configuration failure");
    vi.mocked(env.signingSecret).mockImplementationOnce(() => { throw error; });
    expect(() => tokenExpiresAt(token)).toThrow(error);
  });
});
