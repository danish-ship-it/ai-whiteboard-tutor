import { generateLesson } from "@/lib/server/claude";
import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { issueLessonToken } from "@/lib/server/lesson-token";

export const maxDuration = 120;

const TOPIC_MIN = 2;
const TOPIC_MAX = 140;

export async function POST(request: Request) {
  const limited = limitOrNull(request, "lesson", 6, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson(request, 2_000);
  const topic = typeof body?.topic === "string" ? body.topic.replace(/\s+/g, " ").trim() : "";
  if (topic.length < TOPIC_MIN || topic.length > TOPIC_MAX) {
    return jsonError(`Please enter a topic between ${TOPIC_MIN} and ${TOPIC_MAX} characters.`, 400);
  }

  try {
    const started = Date.now();
    const { lesson, issues } = await generateLesson(topic, request.signal);
    console.info(`lesson ready in ${Date.now() - started} ms (${issues.length} repairs)`, issues.slice(0, 10));
    return Response.json({ lesson, token: issueLessonToken(lesson) });
  } catch (error) {
    return errorResponse(error);
  }
}
