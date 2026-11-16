import "server-only";
import { ConfigError } from "./env";
import type { VisualProvider, VisualTask } from "./visuals";

/**
 * BBANANA (https://www.bbanana.ai) through its MCP endpoint, which takes the
 * account's API key as a Bearer token. Each call is a short JSON-RPC session:
 * initialize, then one tools/call.
 */

const ENDPOINT = "https://www.bbanana.ai/mcp";
const PROTOCOL = "2025-06-18";
const IMAGE_MODEL = "Nano Banana 2.1"; // 1 credit per 1K image
const VIDEO_MODEL = "Grok Imagine Video 1.5 Lite"; // about 4.8 credits for 5 s at 720p
const STYLE = "Clear, accurate, richly detailed educational illustration. No text, letters, labels or watermarks.";

export class BbananaError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function bbananaConfigured(): boolean {
  const key = process.env.BBANANA_API_KEY?.trim();
  return !!key && !key.startsWith("your-");
}

function key(): string {
  if (!bbananaConfigured()) throw new ConfigError("Server is missing the BBANANA_API_KEY environment variable.");
  return process.env.BBANANA_API_KEY!.trim();
}

/** Reads a JSON-RPC reply sent either as plain JSON or as a server-sent event stream. */
async function readRpc(response: Response): Promise<{ result?: unknown; error?: { message?: string } }> {
  const text = await response.text();
  if ((response.headers.get("content-type") ?? "").includes("text/event-stream")) {
    const data = text
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .filter(Boolean)
      .pop();
    return data ? JSON.parse(data) : {};
  }
  return text ? JSON.parse(text) : {};
}

async function post(body: object, session?: string) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": PROTOCOL,
      ...(session ? { "Mcp-Session-Id": session } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  }).catch((error: Error) => {
    // A slow answer is reported as "busy" so the browser keeps polling instead of giving up.
    console.error(`BBANANA request failed: ${error.name}`);
    throw new BbananaError("The picture service is busy. Try again in a minute.", error.name === "TimeoutError" ? 504 : 502);
  });
  if (!response.ok && response.status !== 202) {
    const detail = await response.text().catch(() => "");
    console.error(`BBANANA ${response.status}: ${detail.slice(0, 300)}`);
    throw new BbananaError(
      response.status === 429 ? "The picture service is busy. Try again in a minute." : "The picture service couldn't make this one.",
      response.status === 429 ? 429 : 502,
    );
  }
  return response;
}

/** Calls one BBANANA tool and returns its structured result. */
export async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const init = await post({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "chalk-tutor", version: "1.0" } },
  });
  // The server is stateless today (no session id), but follow the protocol if that changes.
  const session = init.headers.get("mcp-session-id") ?? undefined;
  await readRpc(init);
  if (session) await post({ jsonrpc: "2.0", method: "notifications/initialized" }, session);

  const reply = await readRpc(await post({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name, arguments: args } }, session));
  const result = reply.result as { content?: { type: string; text?: string }[]; structuredContent?: T; isError?: boolean } | undefined;
  if (reply.error || result?.isError || !result?.structuredContent) {
    const text = result?.content?.find((c) => c.type === "text")?.text ?? "";
    console.error(`BBANANA ${name} failed: ${(reply.error?.message ?? text).slice(0, 300)}`);
    throw new BbananaError("The picture service couldn't make this one.", 502);
  }
  return result.structuredContent;
}

type Started = { taskId?: string };
const taskIdOf = (r: Started) => {
  if (!r.taskId) throw new BbananaError("The picture service couldn't make this one.", 502);
  return r.taskId;
};

export const bbanana: VisualProvider = {
  name: "BBANANA",
  configured: bbananaConfigured,

  async startImage(prompt) {
    return taskIdOf(
      await callTool<Started>("generate_image", {
        model: IMAGE_MODEL,
        prompt: `${prompt.slice(0, 1500)} ${STYLE}`,
        aspect_ratio: "16:9",
        resolution: "1K",
      }),
    );
  },

  async startVideo(imageUrl, prompt) {
    return taskIdOf(
      await callTool<Started>("generate_video", {
        model: VIDEO_MODEL,
        prompt: `${prompt.slice(0, 1200)} Gentle, slow, natural motion; the camera drifts slowly.`,
        image_urls: [imageUrl],
        duration: 5,
        resolution: "720p",
        aspect_ratio: "16:9",
      }),
    );
  },

  async getTask(id): Promise<VisualTask> {
    // States: queued, generating, success, error, timeout. Progress is 0-100.
    const r = await callTool<{ state?: string; resultUrls?: string[]; progress?: number; errorMessage?: string }>("get_status", { taskId: id });
    if (r.state === "success" && r.resultUrls?.[0]) return { status: "done", progress: 1, url: r.resultUrls[0] };
    if (r.state === "error" || r.state === "timeout") {
      console.error(`BBANANA task ${id} ${r.state}: ${(r.errorMessage ?? "").slice(0, 200)}`);
      return { status: "failed" };
    }
    return { status: "working", progress: typeof r.progress === "number" ? r.progress / 100 : 0 };
  },
};
