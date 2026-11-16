import { requireUser } from "@/lib/server/auth";
import type { DemoRecording, DemoSlug } from "@/lib/demos";
import { demoVisuals, isDemoSlug } from "@/lib/demos";
import { validateLesson } from "@/lib/lesson/validate";
import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { issueLessonToken } from "@/lib/server/lesson-token";

const recordings: Record<DemoSlug, () => Promise<{ default: unknown }>> = {
  "solar-system": () => import("@/lib/demos/solar-system.json"),
  photosynthesis: () => import("@/lib/demos/photosynthesis.json"),
  pythagoras: () => import("@/lib/demos/pythagoras.json"),
};

/**
 * Returns a pre-recorded lesson with a freshly signed token, so follow-up
 * questions work on demos without the 12-hour token ever going stale.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.denied) return auth.denied;
  const limited = limitOrNull(request, "demo", 60, 10 * 60_000, auth.userId);
  if (limited) return limited;

  const body = await readJson(request, 200);
  if (!isDemoSlug(body?.id)) return jsonError("Unknown demo.", 404);

  try {
    const recording = (await recordings[body.id]()).default as DemoRecording;
    // Re-validated so a demo recorded with an older schema still plays correctly.
    const { lesson } = validateLesson(recording.lesson);
    return Response.json({
      topic: recording.topic,
      lesson,
      token: issueLessonToken(lesson),
      audioUrl: `/demos/${body.id}.mp3`,
      alignment: recording.alignment,
      normalizedAlignment: recording.normalizedAlignment,
      visuals: demoVisuals(body.id, lesson),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
