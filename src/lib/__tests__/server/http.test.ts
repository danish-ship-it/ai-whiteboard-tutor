import { afterEach, describe, expect, it, vi } from "vitest";
import { limitOrNull, readJson } from "../../server/http";

vi.mock("server-only", () => ({}));
vi.mock("../../server/env", () => ({ ConfigError: class extends Error {} }));
vi.mock("../../server/lesson-token", () => ({ InvalidTokenError: class extends Error {} }));
vi.mock("../../server/claude", () => ({ toTutorError: vi.fn() }));

const encoder = new TextEncoder();

function streamedRequest(chunks: Uint8Array[], headers?: HeadersInit) {
  let index = 0;
  const cancel = vi.fn();
  const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => {
    if (index < chunks.length) controller.enqueue(chunks[index++]);
    else controller.close();
  });
  const body = new ReadableStream({ pull, cancel }, { highWaterMark: 0 });
  const init: RequestInit & { duplex: "half" } = { method: "POST", body, headers, duplex: "half" };
  return { request: new Request("https://example.test/api/lesson", init), pull, cancel };
}

afterEach(() => vi.useRealTimers());

describe("readJson", () => {
  it("reads a JSON object across chunks at the byte limit", async () => {
    const { request } = streamedRequest([encoder.encode('{"ok":'), encoder.encode("true}")]);
    await expect(readJson(request, 11)).resolves.toEqual({ ok: true });
    expect(request.body?.locked).toBe(false);
  });

  it("cancels an oversized body without Content-Length before reading the rest", async () => {
    const { request, pull, cancel } = streamedRequest([
      encoder.encode('{"text":"'),
      encoder.encode("too long"),
      encoder.encode('"}'),
    ]);
    expect(request.headers.has("content-length")).toBe(false);
    await expect(readJson(request, 10)).resolves.toBeNull();
    expect(pull).toHaveBeenCalledTimes(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(request.body?.locked).toBe(false);
  });

  it("rejects a declared oversize body before reading any chunks", async () => {
    const { request, pull } = streamedRequest([encoder.encode("{}")], { "Content-Length": "100" });
    await expect(readJson(request, 10)).resolves.toBeNull();
    expect(pull).not.toHaveBeenCalled();
    expect(request.bodyUsed).toBe(false);
  });

  it.each(["1", "invalid"])("enforces the actual byte limit with Content-Length %s", async (length) => {
    const { request, cancel } = streamedRequest([encoder.encode('{"text":"too long"}')], { "Content-Length": length });
    await expect(readJson(request, 10)).resolves.toBeNull();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("counts multibyte characters as UTF-8 bytes", async () => {
    const text = '{"text":"한😀"}';
    const bytes = encoder.encode(text);
    expect(bytes.byteLength).toBeGreaterThan(text.length);
    const { request } = streamedRequest([bytes]);
    await expect(readJson(request, bytes.byteLength - 1)).resolves.toBeNull();
  });

  it("decodes multibyte characters split across chunks at the exact byte limit", async () => {
    const value = { text: "한😀" };
    const bytes = encoder.encode(JSON.stringify(value));
    const { request } = streamedRequest(Array.from(bytes, (byte) => Uint8Array.of(byte)));
    await expect(readJson(request, bytes.byteLength)).resolves.toEqual(value);
  });

  it.each(["", "{", "[]", "null", "true", "1", '"text"'])("returns null for invalid or non-object JSON: %j", async (text) => {
    const { request } = streamedRequest([encoder.encode(text)]);
    await expect(readJson(request, 100)).resolves.toBeNull();
  });

  it("returns null for a missing body", async () => {
    await expect(readJson(new Request("https://example.test"), 100)).resolves.toBeNull();
  });

  it("preserves stream errors and releases the reader", async () => {
    const error = new Error("stream failed");
    const body = new ReadableStream({ start: (controller) => controller.error(error) });
    const init: RequestInit & { duplex: "half" } = { method: "POST", body, duplex: "half" };
    const request = new Request("https://example.test", init);
    await expect(readJson(request, 100)).rejects.toBe(error);
    expect(body.locked).toBe(false);
  });
});

describe("limitOrNull", () => {
  it("returns Retry-After in seconds on a 429 response", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const request = new Request("https://example.test", { headers: { "x-forwarded-for": "192.0.2.1" } });
    expect(limitOrNull(request, "http-test", 1, 10_000)).toBeNull();

    vi.advanceTimersByTime(1_500);
    const response = limitOrNull(request, "http-test", 1, 10_000);
    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("9");
    await expect(response?.json()).resolves.toEqual({ error: "You're going a bit fast. Please wait a moment and try again." });

    vi.advanceTimersByTime(8_500);
    expect(limitOrNull(request, "http-test", 1, 10_000)).toBeNull();
  });
});
