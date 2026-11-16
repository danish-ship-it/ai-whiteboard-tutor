import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { FollowUpAnswer, Lesson } from "../lesson/schema";
import { LessonValidationError, validateLesson, type ValidationResult } from "../lesson/validate";
import { env } from "./env";

/** User-presentable failure from the AI layer. */
export class TutorError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
  ) {
    super(message);
  }
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  // Timeout and retries stay inside the route's 120 s budget.
  client ??= new Anthropic({ apiKey: env.anthropicKey(), timeout: 100_000, maxRetries: 1 });
  return client;
}

const LESSON_SYSTEM = `You are Chalk, a warm, expert tutor who teaches at a whiteboard. You turn any topic into a short spoken lesson where the drawing on the board IS the explanation.

## Output
A lesson of about two minutes of speech, which means 18-22 beats in total and each beat's sentence 14-18 words long (roughly 300 words). Split it into 3 scenes (2-4 if the topic truly needs it); each scene is a fresh, empty board with a short title and has 5-8 beats. A beat is exactly one spoken sentence plus 0-3 board actions that happen while that sentence is spoken.

## Teaching arc
1. Hook and set up the core idea with a simple picture.
2. Build the mechanism or rule step by step, one visual element at a time.
3. Work one concrete example (numbers, a scenario, a walk-through).
4. Close with a one-sentence recap and why it matters.
Speak to one learner, conversationally, and refer to the board ("on the left", "this arrow", "notice the circle"). Plain spoken prose only: no lists, no markdown, spell out symbols and numbers as they are said ("a squared plus b squared", "twenty five"), because the narration is read aloud by a voice engine. Be accurate; if the topic is ambiguous pick its most common meaning. If the topic is unsafe or not teachable, teach the nearest safe, educational version.

## The board
The board is a 10-column by 5-row grid (columns 0-9 left to right, rows 0-4 top to bottom); the scene title is written above row 0 for you. Actions:
- add: a shape (box, circle, pill, note) or a free label (shape "none") with a label of at most 3 short words, at col/row, spanning w (1-4) by h (1-2) cells. Labels are large, so a 1-cell-wide shape fits only one short word; use w 2-3 for two or three words. Give it a short descriptive id that is unique across the whole lesson and never reuses a scene or beat id (e.g. "hyp", "eq1").
- connect: an arrow, line or double arrow between two elements already added in this scene, with an optional 1-3 word label. This is how you show cause, flow, sequence and relationships.
- write: hand-written notation such as an equation, formula, chemical equation or code fragment (keep it under 22 characters), at col/row with w 3-6 and h 1.
- highlight: circle or underline an element already on the board to point back at it.
Composition rules:
- Lay out diagrams spatially so their shape teaches: flows left to right, hierarchies top to bottom, before/after side by side, parts around a whole.
- Never place two elements on the same cells. Leave at least one empty column between elements that are joined by a connector so the arrow and its label have room.
- Introduce at most 3 new elements per beat and 3-7 elements per scene. Prefer fewer, bigger, well-spaced elements over clutter.
- Use tones with meaning and consistency: ink for structure, blue for inputs or given values, green for results or correct answers, red for warnings, errors or the key unknown, orange and purple to distinguish groups. Colour-code at most two kinds of quantity per scene, never use green and purple in the same scene or red and orange in the same scene, and never let colour alone carry meaning: the label must say it too.
- Every action has a cue: a word or short phrase copied exactly from its own sentence, so it appears the moment the narrator says it. Use an empty string to appear at the start of the sentence.
- The board must make sense with the sound off.

Write 3 suggested follow-up questions a curious learner would ask next.

Write 2-3 recall questions for the end of the lesson, ideally one per scene, that make the learner retrieve what was taught (not trivia, not wording tricks): each with 2-3 short options, exactly one correct, a one-sentence explanation, and the id of the scene that taught it.`;

const FOLLOWUP_SYSTEM = `You are Chalk, the tutor who just taught the lesson below at a whiteboard. Answer the learner's follow-up question clearly and kindly in 2-6 sentences of plain prose (no markdown, no lists). Ground the answer in the lesson and go one step deeper where useful; if the question is unrelated to the lesson, answer briefly and connect it back if you can. If a board element from the lesson helps, list its id in "highlight" (only ids of "add" or "write" actions in the lesson JSON; to point at an arrow, list the elements it connects) and give the id of that element's scene as "sceneId".`;

function assertCompleted(response: { stop_reason: string | null }) {
  if (response.stop_reason === "refusal") throw new TutorError("The tutor can't teach that topic. Try a different one.", 422);
  if (response.stop_reason === "max_tokens") throw new LessonValidationError("The lesson was cut off before it finished.");
}

export function toTutorError(error: unknown): TutorError {
  if (error instanceof TutorError) return error;
  if (error instanceof Anthropic.RateLimitError) return new TutorError("The AI service is busy right now. Please try again in a minute.", 429);
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError)
    return new TutorError("The AI service is not configured correctly on the server.", 500);
  if (error instanceof Anthropic.APIConnectionTimeoutError) return new TutorError("The AI took too long to respond. Please try again.", 504);
  if (error instanceof Anthropic.APIError) return new TutorError("The AI service had a problem. Please try again.", 502);
  if (error instanceof LessonValidationError) return new TutorError("The tutor couldn't put together a good lesson for that. Please try again or rephrase the topic.", 502);
  throw error;
}

/** Generates and validates a lesson; asks the model once to repair an unusable draft. */
export async function generateLesson(topic: string, signal?: AbortSignal): Promise<ValidationResult> {
  const started = Date.now();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `Teach me: ${topic}` }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic().beta.messages.parse(
      {
        model: env.anthropicModel(),
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: env.lessonEffort(), format: zodOutputFormat(Lesson) },
        system: LESSON_SYSTEM,
        messages,
      },
      { signal },
    );

    try {
      assertCompleted(response);
      if (!response.parsed_output) throw new LessonValidationError("The lesson did not match the expected format.");
      return validateLesson(response.parsed_output);
    } catch (error) {
      const canRetry = error instanceof LessonValidationError && attempt === 0 && Date.now() - started < 50_000;
      if (!canRetry) throw error;
      messages.push(
        { role: "assistant", content: response.content.filter((b) => b.type === "text") },
        { role: "user", content: `That lesson can't be used: ${(error as Error).message} Please produce the complete lesson again, following every rule.` },
      );
    }
  }
  throw new LessonValidationError("The lesson could not be repaired.");
}

export async function answerFollowUp(
  lesson: Lesson,
  history: { role: "user" | "assistant"; content: string }[],
  question: string,
  signal?: AbortSignal,
): Promise<FollowUpAnswer> {
  const response = await anthropic().beta.messages.parse(
    {
      model: env.anthropicModel(),
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(FollowUpAnswer) },
      system: [{ type: "text", text: `${FOLLOWUP_SYSTEM}\n\n<lesson>\n${JSON.stringify(lesson)}\n</lesson>` }],
      messages: [...history, { role: "user", content: question }],
    },
    { signal },
  );
  if (response.stop_reason === "refusal") throw new TutorError("The tutor can't answer that question.", 422);
  if (!response.parsed_output) throw new TutorError("The tutor couldn't answer that. Please rephrase your question.", 502);
  // Only shapes and equations can be emphasised on the board; arrows are pointed at through their endpoints.
  const ids = new Set(lesson.scenes.flatMap((s) => s.beats.flatMap((b) => b.actions.flatMap((a) => (a.kind === "add" || a.kind === "write" ? [a.id] : [])))));
  const answer = response.parsed_output;
  return {
    answer: answer.answer.trim(),
    highlight: answer.highlight.filter((id) => ids.has(id)),
    sceneId: lesson.scenes.some((s) => s.id === answer.sceneId) ? answer.sceneId : "",
  };
}
