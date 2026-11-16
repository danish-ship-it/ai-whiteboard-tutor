import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RunwayError, getTask, runwayConfigured, startImage, startVideo } from "../../server/runway";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("RUNWAYML_API_SECRET", "test-secret");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("runway client", () => {
  it("is off without a key", () => {
    vi.stubEnv("RUNWAYML_API_SECRET", "");
    expect(runwayConfigured()).toBe(false);
  });

  it("starts an image with the versioned, authorised request", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "task-1" }));
    await expect(startImage("the rocky planets")).resolves.toBe("task-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dev.runwayml.com/v1/text_to_image");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-secret", "X-Runway-Version": "2024-11-06" });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "gen4_image", ratio: "1280:720" });
    expect(body.promptText).toContain("the rocky planets");
    expect(body.promptText).toContain("No text");
  });

  it("animates an image into a five second clip", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "task-2" }));
    await startVideo("https://cdn.example/image.png", "a leaf");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ model: "gen4_turbo", duration: 5, promptImage: "https://cdn.example/image.png" });
  });

  it("maps a 429 to a friendly busy error and hides other API details", async () => {
    fetchMock.mockResolvedValueOnce(new Response("slow down", { status: 429 }));
    await expect(startImage("x")).rejects.toMatchObject({ status: 429 });
    fetchMock.mockResolvedValueOnce(new Response("secret detail", { status: 400 }));
    const error = await startImage("x").catch((e) => e);
    expect(error).toBeInstanceOf(RunwayError);
    expect(error.status).toBe(502);
    expect(error.message).not.toContain("secret detail");
  });

  it("reads a task", async () => {
    fetchMock.mockResolvedValueOnce(ok({ id: "t", status: "SUCCEEDED", output: ["https://cdn.example/out.mp4"] }));
    await expect(getTask("t")).resolves.toMatchObject({ status: "SUCCEEDED", output: ["https://cdn.example/out.mp4"] });
  });
});
