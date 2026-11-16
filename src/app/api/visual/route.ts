import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { visualPrompt } from "@/lib/lesson/visual-prompt";
import { readLessonToken } from "@/lib/server/lesson-token";
import { isProviderError, visualProvider } from "@/lib/server/visuals";

export const maxDuration = 30;

// Runway task ids are UUIDs; BBANANA's look like "gvi_1794840579106_gh0zsj".
const TASK_ID = /^[A-Za-z0-9_-]{6,80}$/;

function providerError(error: unknown) {
  return isProviderError(error) ? jsonError(error.message, error.status) : errorResponse(error);
}

/**
 * Starts an AI illustration for one scene of a signed lesson.
 * {kind: "image", token, sceneId} or {kind: "video", token, sceneId, imageTask}.
 * Only lessons this server signed can be illustrated, and only with their own scene prompt.
 */
export async function POST(request: Request) {
  const provider = visualProvider();
  if (!provider) return jsonError("Illustrations aren't set up on this server.", 501);
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

    if (kind === "image") return Response.json({ taskId: await provider.startImage(prompt) });

    // The clip is animated from the picture this server made, looked up by its task, never from a URL the browser sends.
    if (typeof body.imageTask !== "string" || !TASK_ID.test(body.imageTask)) return jsonError("Bad request.", 400);
    const image = await provider.getTask(body.imageTask);
    if (image.status !== "done" || !image.url) return jsonError("Make the picture first.", 409);
    return Response.json({ taskId: await provider.startVideo(image.url, prompt) });
  } catch (error) {
    return providerError(error);
  }
}

/** Polls a task: {status, progress, url?}. The browser polls at most once every five seconds. */
export async function GET(request: Request) {
  const provider = visualProvider();
  const id = new URL(request.url).searchParams.get("task");
  // Without a task id this only says whether illustrations are switched on, and by whom.
  if (id === null) return Response.json({ available: !!provider, provider: provider?.name });
  if (!provider) return jsonError("Illustrations aren't set up on this server.", 501);
  const limited = limitOrNull(request, "visual-poll", 240, 10 * 60_000);
  if (limited) return limited;
  if (!TASK_ID.test(id)) return jsonError("Bad request.", 400);
  try {
    const task = await provider.getTask(id);
    return Response.json(
      { status: task.status, progress: task.progress ?? 0, url: task.status === "done" ? task.url : undefined },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return providerError(error);
  }
}
