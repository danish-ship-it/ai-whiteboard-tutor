import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BbananaError, bbanana, bbananaConfigured } from "../../server/bbanana";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("BBANANA_API_KEY", "bba_test");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

/** BBANANA answers JSON-RPC as a one-event stream. */
const sse = (result: unknown) =>
  new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result })}\n\n`, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
const initialized = () => sse({ protocolVersion: "2025-06-18", capabilities: {} });
const tool = (structuredContent: unknown) => sse({ content: [{ type: "text", text: "ok" }], structuredContent });

describe("bbanana client", () => {
  it("is off without a key or with the placeholder", () => {
    vi.stubEnv("BBANANA_API_KEY", "");
    expect(bbananaConfigured()).toBe(false);
    vi.stubEnv("BBANANA_API_KEY", "your-key");
    expect(bbananaConfigured()).toBe(false);
  });

  it("starts a 16:9 picture with the key as a Bearer token", async () => {
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(tool({ taskId: "gvi_1_abc", state: "queued" }));
    await expect(bbanana.startImage("the rocky planets")).resolves.toBe("gvi_1_abc");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://www.bbanana.ai/mcp");
    expect(init.headers).toMatchObject({ Authorization: "Bearer bba_test" });
    const body = JSON.parse(init.body);
    expect(body.method).toBe("tools/call");
    expect(body.params.name).toBe("generate_image");
    expect(body.params.arguments).toMatchObject({ model: "Nano Banana 2.1", aspect_ratio: "16:9", resolution: "1K" });
    expect(body.params.arguments.prompt).toContain("the rocky planets");
    expect(body.params.arguments.prompt).toContain("No text");
  });

  it("animates a picture from its URL", async () => {
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(tool({ taskId: "gvv_2_def" }));
    await expect(bbanana.startVideo("https://cdn.example/p.png", "orbits")).resolves.toBe("gvv_2_def");
    const args = JSON.parse(fetchMock.mock.calls[1][1].body).params.arguments;
    expect(args).toMatchObject({ image_urls: ["https://cdn.example/p.png"], duration: 5 });
  });

  it("maps task states", async () => {
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(tool({ state: "generating", progress: 50 }));
    await expect(bbanana.getTask("gvi_1_abc")).resolves.toEqual({ status: "working", progress: 0.5 });
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(tool({ state: "success", resultUrls: ["https://cdn.example/p.png"] }));
    await expect(bbanana.getTask("gvi_1_abc")).resolves.toMatchObject({ status: "done", url: "https://cdn.example/p.png" });
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(tool({ state: "timeout", errorMessage: "slow" }));
    await expect(bbanana.getTask("gvi_1_abc")).resolves.toEqual({ status: "failed" });
  });

  it("turns tool errors and HTTP failures into friendly errors", async () => {
    fetchMock.mockResolvedValueOnce(initialized()).mockResolvedValueOnce(sse({ content: [{ type: "text", text: "Not enough credits" }], isError: true }));
    await expect(bbanana.startImage("x")).rejects.toMatchObject({ status: 502 });
    fetchMock.mockResolvedValueOnce(new Response("slow down", { status: 429 }));
    const error = await bbanana.startImage("x").catch((e) => e);
    expect(error).toBeInstanceOf(BbananaError);
    expect(error.status).toBe(429);
  });
});
