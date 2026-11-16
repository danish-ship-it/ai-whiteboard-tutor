import { ICONS, type IconName } from "../board/icons";
import { graphHasContent, parseGraph } from "../board/graph";
import { GRID_COLS, GRID_ROWS, isElement, parsePoints, type Action, type DraftAction, type Lesson, type LessonDraft, type PictureAction, type Scene, type Tone } from "./schema";

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

export function validateLesson(raw: Lesson | LessonDraft): ValidationResult {
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

        for (const draft of (beat.actions as (Action | DraftAction)[]).slice(0, LIMITS.actionsPerBeat)) {
          const action = draft.kind === "picture" ? fromPicture(draft) : draft;
          const cue = findCue(beat.sentence, action.cue) === -1 ? "" : action.cue.trim();
          if (action.cue.trim() && !cue) issues.push(`cue "${action.cue}" not in sentence; using sentence start`);

          switch (action.kind) {
            case "icon": {
              const icon = resolveIcon(action.icon);
              if (icon) {
                action.icon = icon;
              } else {
                // Unknown picture: keep the idea on the board as a labelled circle.
                issues.push(`unknown icon "${action.icon}"; drawing a labelled circle`);
                const label = action.label.trim() || action.icon.slice(0, 20);
                delete (action as Partial<typeof action>).icon;
                Object.assign(action, { kind: "add", shape: "circle", label });
              }
            }
            // falls through
            case "add":
            case "write":
            case "graph":
            case "sketch": {
              const id = uniqueId(action.id, `${sceneId}-el${actions.length + 1}`);
              onBoard.set(action.id, id);
              const maxW = { add: 4, write: 6, icon: 3, sketch: 6, graph: 6 }[action.kind];
              // A one-cell picture is too small to recognise, so pictures are at least 2x2; a graph needs
              // room for its axes and numbers, so it is at least 4x3.
              const graph = action.kind === "graph";
              const minSide = action.kind === "icon" || action.kind === "sketch" ? 2 : 1;
              const w = clamp(action.w, graph ? 4 : minSide, maxW);
              const h = clamp(action.h, graph ? 3 : minSide, graph ? 4 : action.kind === "sketch" ? 3 : 2);
              actions.push({
                ...action,
                id,
                cue,
                w,
                h,
                col: clamp(action.col, 0, GRID_COLS - w),
                row: clamp(action.row, 0, GRID_ROWS - h),
                ...(action.kind === "write" ? { text: action.text.trim() } : { label: action.label.trim() }),
                ...(action.kind === "sketch"
                  ? { points: parsePoints(action.points).slice(0, 24).map((p) => `${clamp(Math.round(p.x), 0, 100)},${clamp(Math.round(p.y), 0, 100)}`).join(" ") }
                  : {}),
              } as Action);
              if (action.kind === "sketch" && parsePoints(action.points).length < 2) {
                actions.pop();
                onBoard.delete(action.id);
                issues.push(`dropped sketch "${action.id}": fewer than 2 points`);
              }
              if (action.kind === "graph" && !graphHasContent(parseGraph(action.spec))) {
                actions.pop();
                onBoard.delete(action.id);
                issues.push(`dropped graph "${action.id}": nothing in it could be plotted`);
              }
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
      .map((q) => {
        // Dropping blank options shifts the others, so the answer is re-pointed at the same option.
        const kept = q.options.map((o, i) => ({ text: o.trim(), i })).filter((o) => o.text).slice(0, 3);
        return {
          question: q.question.trim(),
          options: kept.map((o) => o.text),
          answer: kept.findIndex((o) => o.i === q.answer),
          explanation: q.explanation.trim(),
          sceneId: sceneIds.get(q.sceneId) ?? "",
        };
      })
      .filter((q) => {
        const ok = q.question && q.options.length >= 2 && q.answer >= 0 && q.answer < q.options.length;
        if (!ok) issues.push(`dropped recall question "${q.question}"`);
        return ok;
      })
      .slice(0, 3),
  };

  const beats = lesson.scenes.flatMap((s) => s.beats);
  const words = countWords(beats.map((b) => b.sentence).join(" "));
  const drawn = beats.flatMap((b) => b.actions).filter(isElement).length;

  if (!lesson.title) throw new LessonValidationError("Lesson has no title.");
  if (lesson.scenes.length < LIMITS.scenes[0]) throw new LessonValidationError("Lesson has no scenes.");
  if (beats.length < LIMITS.beatsTotal[0] || beats.length > LIMITS.beatsTotal[1])
    throw new LessonValidationError(`Lesson has ${beats.length} sentences; expected ${LIMITS.beatsTotal.join("-")}.`);
  if (words < LIMITS.words[0] || words > LIMITS.words[1])
    throw new LessonValidationError(`Narration is ${words} words; expected ${LIMITS.words.join("-")}.`);
  if (drawn < LIMITS.drawnElements) throw new LessonValidationError("Lesson draws too little on the board.");

  return { lesson, issues };
}

/** Splits the model's "picture" into a catalogue icon or a freehand sketch ("~" smooth, "z" closed). */
export function fromPicture({ draw, ...rest }: PictureAction): Action {
  const text = draw.trim();
  if (/^graph\b/i.test(text)) return { ...rest, kind: "graph", spec: text.replace(/^graph\b:?/i, "").trim().slice(0, 500) };
  if (!/\d/.test(text)) return { ...rest, kind: "icon", icon: text };
  const smooth = text.startsWith("~");
  const closed = /z$/i.test(text);
  const points = text.replace(/^~/, "").replace(/z$/i, "").trim();
  return { ...rest, kind: "sketch", points, closed, smooth };
}

const ICON_ALIASES: Record<string, IconName> = {
  planet: "planet-small", saturn: "planet-ringed", jupiter: "planet-banded", uranus: "planet-ringed", neptune: "planet-banded",
  mars: "planet-small", mercury: "planet-small", venus: "planet-small", world: "earth", "solar-system": "orbit", stars: "star",
  water: "droplet", rain: "cloud-rain", light: "lightbulb", idea: "lightbulb", electricity: "zap", energy: "zap", plant: "sprout",
  person: "user", people: "users", money: "coins", computer: "laptop", phone: "smartphone", chart: "chart-line", graph: "chart-line",
  search: "magnifier", ocean: "waves", sea: "waves", fire: "flame", heat: "flame", cold: "snowflake", tree: "tree-deciduous",
};

/** Maps a model-written icon name onto the catalogue, or null when nothing fits. */
export function resolveIcon(raw: string): IconName | null {
  const name = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const candidates = [name, name.replace(/s$/, ""), name.replace(/-icon$/, "")];
  for (const c of candidates) {
    if (c in ICONS) return c as IconName;
    if (c in ICON_ALIASES) return ICON_ALIASES[c];
  }
  return null;
}
