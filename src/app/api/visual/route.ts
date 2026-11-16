import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { visualPrompt } from "@/lib/lesson/visual-prompt";
import { readLessonToken } from "@/lib/server/lesson-token";
import { RunwayError, getTask, runwayConfigured, startImage, startVideo } from "@/lib/server/runway";

export const maxDuration = 30;

const TASK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function runwayError(error: unknown) {
  return error instanceof RunwayError ? jsonError(error.message, error.status) : errorResponse(error);
}

/**
 * Starts a Runway illustration for one scene of a signed lesson.
 * {kind: "image", token, sceneId} or {kind: "video", token, sceneId, imageTask}.
 * Only lessons this server signed can be illustrated, and only with their own scene prompt.
 */
export async function POST(request: Request) {
  if (!runwayConfigured()) return jsonError("Illustrations aren't set up on this server.", 501);
  const body = await readJson(request, 220_000);
  const kind = body?.kind === "video" ? "video" : body?.kind === "image" ? "image" : null;
  if (!body || !kind || typeof body.sceneId !== "string") return jsonError("Bad request.", 400);

  const limited = kind === "video" ? limitOrNull(request, "visual-video", 6, 10 * 60_000) : limitOrNull(request, "visual-image", 24, 10 * 60_000);
  if (limited) return limited;

  try {
    const lesson = readLessonToken(body.token);
    const scene = lesson.scenes.find((s) => s.id === body.sceneId);
    if (!scene) return jsonError("Unknown scene.", 400);
    const prompt = visualPrompt(lesson, scene);

    if (kind === "image") return Response.json({ taskId: await startImage(prompt) });

    if (typeof body.imageTask !== "string" || !TASK_ID.test(body.imageTask)) return jsonError("Bad request.", 400);
    const image = await getTask(body.imageTask);
    const url = image.status === "SUCCEEDED" ? image.output?.[0] : undefined;
    if (!url) return jsonError("Make the picture first.", 409);
    return Response.json({ taskId: await startVideo(url, prompt) });
  } catch (error) {
    return runwayError(error);
  }
}

/** Polls a task: {status, progress, url?}. Runway asks for at most one poll every five seconds. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("task");
  // Without a task id this only says whether illustrations are switched on.
  if (id === null) return Response.json({ available: runwayConfigured() });
  if (!runwayConfigured()) return jsonError("Illustrations aren't set up on this server.", 501);
  const limited = limitOrNull(request, "visual-poll", 240, 10 * 60_000);
  if (limited) return limited;
  if (!TASK_ID.test(id)) return jsonError("Bad request.", 400);
  try {
    const task = await getTask(id);
    const done = task.status === "SUCCEEDED";
    const failed = task.status === "FAILED" || task.status === "CANCELLED";
    return Response.json(
      { status: done ? "done" : failed ? "failed" : "working", progress: task.progress ?? 0, url: done ? task.output?.[0] : undefined },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return runwayError(error);
  }
}
