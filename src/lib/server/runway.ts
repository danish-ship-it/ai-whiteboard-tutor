import "server-only";
import { ConfigError } from "./env";

/**
 * Minimal Runway API client (https://docs.dev.runwayml.com/api).
 * Generation is asynchronous: start a task, then poll it.
 */

const BASE = "https://api.dev.runwayml.com/v1";
const VERSION = "2024-11-06";
const STYLE = "Clear, accurate, richly detailed educational illustration. No text, letters, labels or watermarks.";

export type TaskStatus = "PENDING" | "THROTTLED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface RunwayTask {
  id: string;
  status: TaskStatus;
  progress?: number;
  output?: string[];
  failure?: string;
}

export class RunwayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function runwayConfigured(): boolean {
  const key = process.env.RUNWAYML_API_SECRET?.trim();
  return !!key && !key.startsWith("your-");
}

function key(): string {
  if (!runwayConfigured()) throw new ConfigError("Server is missing the RUNWAYML_API_SECRET environment variable.");
  return process.env.RUNWAYML_API_SECRET!.trim();
}

async function call<T>(path: string, init: RequestInit & { signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "X-Runway-Version": VERSION,
      "Content-Type": "application/json",
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(`Runway ${path} failed: ${response.status} ${detail.slice(0, 300)}`);
    throw new RunwayError(
      response.status === 429 ? "The picture service is busy. Try again in a minute." : "The picture service couldn't make this one.",
      response.status === 429 ? 429 : 502,
    );
  }
  return (await response.json()) as T;
}

/** About 5 credits ($0.05) per 720p image. */
export async function startImage(prompt: string): Promise<string> {
  const { id } = await call<{ id: string }>("/text_to_image", {
    method: "POST",
    body: JSON.stringify({ model: "gen4_image", ratio: "1280:720", promptText: `${prompt.slice(0, 700)} ${STYLE}` }),
  });
  return id;
}

/** About 25 credits ($0.25) for a 5 second clip. */
export async function startVideo(imageUrl: string, prompt: string): Promise<string> {
  const { id } = await call<{ id: string }>("/image_to_video", {
    method: "POST",
    body: JSON.stringify({
      model: "gen4_turbo",
      ratio: "1280:720",
      duration: 5,
      promptImage: imageUrl,
      promptText: `${prompt.slice(0, 600)} Gentle, slow, natural motion; the camera drifts slowly.`,
    }),
  });
  return id;
}

export async function getTask(id: string): Promise<RunwayTask> {
  return call<RunwayTask>(`/tasks/${encodeURIComponent(id)}`);
}
