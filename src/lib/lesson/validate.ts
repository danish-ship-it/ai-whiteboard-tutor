import { GRID_COLS, GRID_ROWS, type Action, type Lesson, type Scene, type Tone } from "./schema";

export class LessonValidationError extends Error {}

export interface ValidationResult {
  lesson: Lesson;
  /** Repairs applied to the model output, for logging. */
  issues: string[];
}

const LIMITS = {
  scenes: [1, 5],
  beatsTotal: [5, 32],
  actionsPerBeat: 4,
  // The upper bound keeps the narration MP3 (96 kbps, base64) under Vercel's 4.5 MB response limit.
  words: [120, 420],
  drawnElements: 3,
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Case-insensitive, whole-word position of `cue` in `sentence`, or -1. */
export function findCue(sentence: string, cue: string): number {
  const needle = cue.trim().toLowerCase();
  if (!needle) return -1;
  const hay = sentence.toLowerCase();
  let from = 0;
  while (from <= hay.length) {
    const i = hay.indexOf(needle, from);
    if (i === -1) return -1;
    const before = hay[i - 1];
    const after = hay[i + needle.length];
    const boundary = (c: string | undefined) => c === undefined || !/[\p{L}\p{N}]/u.test(c);
    if (boundary(before) && boundary(after)) return i;
    from = i + 1;
  }
  return -1;
}

/**
 * Turns raw model output into a lesson the player can trust: unique ids,
 * references that point backwards within a scene, grid values in range and
 * cues that occur in their sentence. Structural problems that cannot be
 * repaired throw `LessonValidationError`.
 */
/**
 * Tone pairs that colour-vision-deficient learners struggle to tell apart
 * (research/learning-ux-report.md §1): green vs teal ("purple") and brick ("red")
 * vs ochre ("orange"). When a scene uses both, the second tone becomes blue,
 * or graphite if blue is already taken, so colour never carries a distinction
 * the learner cannot see.
 */
const CLASHES: Array<[Tone, Tone]> = [
  ["green", "purple"],
  ["red", "orange"],
];

function separateClashingTones(scene: Scene, issues: string[]) {
  const actions = scene.beats.flatMap((b) => b.actions).filter((a): a is Exclude<Action, { kind: "highlight" }> => a.kind !== "highlight");
  const used = new Set(actions.map((a) => a.tone));
  for (const [keep, swap] of CLASHES) {
    if (!used.has(keep) || !used.has(swap)) continue;
    const replacement: Tone = used.has("blue") ? "ink" : "blue";
    for (const a of actions) if (a.tone === swap) a.tone = replacement;
    used.delete(swap);
    used.add(replacement);
    issues.push(`scene "${scene.id}": ${swap} next to ${keep} recoloured ${replacement}`);
  }
}

export function validateLesson(raw: Lesson): ValidationResult {
  const issues: string[] = [];
  const usedIds = new Set<string>();

  const uniqueId = (wanted: string, fallback: string) => {
    const base = (wanted.trim() || fallback).replace(/\s+/g, "-");
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    if (id !== base) issues.push(`renamed duplicate id "${base}" to "${id}"`);
    usedIds.add(id);
    return id;
  };

  const scenes = raw.scenes.slice(0, LIMITS.scenes[1]).map((scene, si) => {
    const sceneId = uniqueId(scene.id, `scene-${si + 1}`);
    const onBoard = new Map<string, string>(); // model id -> unique id, this scene only

    const beats = scene.beats
      .map((beat, bi) => ({ ...beat, sentence: beat.sentence.trim(), bi }))
      .filter((beat) => beat.sentence.length > 0)
      .map((beat) => {
        const beatId = uniqueId(beat.id, `${sceneId}-b${beat.bi + 1}`);
        const actions: Action[] = [];

        for (const action of beat.actions.slice(0, LIMITS.actionsPerBeat)) {
          const cue = findCue(beat.sentence, action.cue) === -1 ? "" : action.cue.trim();
          if (action.cue.trim() && !cue) issues.push(`cue "${action.cue}" not in sentence; using sentence start`);

          switch (action.kind) {
            case "add":
            case "write": {
              const id = uniqueId(action.id, `${sceneId}-el${actions.length + 1}`);
              onBoard.set(action.id, id);
              const w = clamp(action.w, 1, action.kind === "write" ? 6 : 4);
              const h = clamp(action.h, 1, 2);
              actions.push({
                ...action,
                id,
                cue,
                w,
                h,
                col: clamp(action.col, 0, GRID_COLS - w),
                row: clamp(action.row, 0, GRID_ROWS - h),
                ...(action.kind === "add" ? { label: action.label.trim() } : { text: action.text.trim() }),
              } as Action);
              break;
            }
            case "connect": {
              const from = onBoard.get(action.from);
              const to = onBoard.get(action.to);
              if (!from || !to || from === to) {
                issues.push(`dropped connector "${action.id}": endpoints not on the board yet`);
                break;
              }
              actions.push({ ...action, id: uniqueId(action.id, `${sceneId}-link`), from, to, cue, label: action.label.trim() });
              break;
            }
            case "highlight": {
              const target = onBoard.get(action.target);
              if (!target) {
                issues.push(`dropped highlight: "${action.target}" not on the board yet`);
                break;
              }
              actions.push({ ...action, target, cue });
              break;
            }
          }
        }
        return { id: beatId, sentence: beat.sentence, actions };
      });

    return { id: sceneId, title: scene.title.trim() || `Part ${si + 1}`, beats };
  });

  const kept = scenes.filter((s) => s.beats.length > 0);
  for (const scene of kept) separateClashingTones(scene, issues);
  const sceneIds = new Map(raw.scenes.map((s, i) => [s.id, scenes[i]?.id]));

  const lesson: Lesson = {
    title: raw.title.trim(),
    objective: raw.objective.trim(),
    scenes: kept,
    suggestedQuestions: raw.suggestedQuestions.map((q) => q.trim()).filter(Boolean).slice(0, 3),
    recall: (raw.recall ?? [])
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean).slice(0, 3),
        answer: q.answer,
        explanation: q.explanation.trim(),
        sceneId: sceneIds.get(q.sceneId) ?? "",
      }))
      .filter((q) => {
        const ok = q.question && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length;
        if (!ok) issues.push(`dropped recall question "${q.question}"`);
        return ok;
      })
      .slice(0, 3),
  };

  const beats = lesson.scenes.flatMap((s) => s.beats);
  const words = countWords(beats.map((b) => b.sentence).join(" "));
  const drawn = beats.flatMap((b) => b.actions).filter((a) => a.kind === "add" || a.kind === "write").length;

  if (!lesson.title) throw new LessonValidationError("Lesson has no title.");
  if (lesson.scenes.length < LIMITS.scenes[0]) throw new LessonValidationError("Lesson has no scenes.");
  if (beats.length < LIMITS.beatsTotal[0] || beats.length > LIMITS.beatsTotal[1])
    throw new LessonValidationError(`Lesson has ${beats.length} sentences; expected ${LIMITS.beatsTotal.join("-")}.`);
  if (words < LIMITS.words[0] || words > LIMITS.words[1])
    throw new LessonValidationError(`Narration is ${words} words; expected ${LIMITS.words.join("-")}.`);
  if (drawn < LIMITS.drawnElements) throw new LessonValidationError("Lesson draws too little on the board.");

  return { lesson, issues };
}
