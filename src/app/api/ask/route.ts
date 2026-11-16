import { answerFollowUp } from "@/lib/server/claude";
import { errorResponse, jsonError, limitOrNull, readJson } from "@/lib/server/http";
import { readLessonToken } from "@/lib/server/lesson-token";

export const maxDuration = 60;

const MAX_QUESTION = 500;
const MAX_HISTORY = 8;

type Turn = { role: "user" | "assistant"; content: string };

function readHistory(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (t): t is Turn =>
        !!t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 2_000) }));
}

export async function POST(request: Request) {
  const limited = limitOrNull(request, "ask", 30, 10 * 60_000);
  if (limited) return limited;

  const body = await readJson(request, 220_000);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!body || !question) return jsonError("Please type a question.", 400);
  if (question.length > MAX_QUESTION) return jsonError(`Please keep your question under ${MAX_QUESTION} characters.`, 400);

  try {
    const lesson = readLessonToken(body.token);
    // History must start with the learner and alternate; drop a dangling leading assistant turn.
    const history = readHistory(body.history);
    while (history[0]?.role === "assistant") history.shift();
    return Response.json(await answerFollowUp(lesson, history, question, request.signal));
  } catch (error) {
    return errorResponse(error);
  }
}
