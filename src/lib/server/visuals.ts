import "server-only";
import { bbanana, BbananaError } from "./bbanana";
import { RunwayError, getTask, runwayConfigured, startImage, startVideo } from "./runway";

/** One step's picture or clip, as the route reports it to the browser. */
export interface VisualTask {
  status: "working" | "done" | "failed";
  progress?: number;
  url?: string;
}

/** A service that makes a picture from a prompt and a short clip from a picture. */
export interface VisualProvider {
  name: string;
  configured: () => boolean;
  startImage: (prompt: string) => Promise<string>;
  startVideo: (imageUrl: string, prompt: string) => Promise<string>;
  getTask: (id: string) => Promise<VisualTask>;
}

const runway: VisualProvider = {
  name: "Runway",
  configured: runwayConfigured,
  startImage,
  startVideo,
  async getTask(id) {
    const task = await getTask(id);
    if (task.status === "SUCCEEDED") return { status: "done", progress: 1, url: task.output?.[0] };
    if (task.status === "FAILED" || task.status === "CANCELLED") return { status: "failed" };
    return { status: "working", progress: task.progress ?? 0 };
  },
};

/** BBANANA when its key is set (cheaper, permanent links), otherwise Runway, otherwise none. */
export function visualProvider(): VisualProvider | null {
  return [bbanana, runway].find((p) => p.configured()) ?? null;
}

export function isProviderError(error: unknown): error is RunwayError | BbananaError {
  return error instanceof RunwayError || error instanceof BbananaError;
}
