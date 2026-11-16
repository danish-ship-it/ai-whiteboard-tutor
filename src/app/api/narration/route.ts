import { requireUser } from "@/lib/server/auth";
import { buildNarration } from "@/lib/lesson/narration";
import { synthesizeNarration } from "@/lib/server/elevenlabs";
import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { readLessonToken } from "@/lib/server/lesson-token";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.denied) return auth.denied;
  const limited = limitOrNull(request, "narration", 10, 10 * 60_000, auth.userId);
  if (limited) return limited;

  const body = await readJson(request, 200_000);
  if (!body) return jsonError("Invalid request.", 400);

  try {
    const lesson = readLessonToken(body.token);
    const { text } = buildNarration(lesson);
    const started = Date.now();
    const audio = await synthesizeNarration(text, request.signal);
    console.info(`narration ready in ${Date.now() - started} ms, ${Math.round((audio.audioBase64.length * 3) / 4 / 1024)} KB`);
    return Response.json(audio, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
