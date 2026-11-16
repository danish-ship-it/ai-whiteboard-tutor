import { z } from "zod";

/**
 * The lesson manifest Claude generates. It is semantic: elements sit on a
 * 10x5 grid, and pixel geometry is computed by `board/layout.ts`.
 *
 * This schema is sent to the API as a structured-output format, so it avoids
 * numeric/length constraints (the provider ignores most of them). Bounds and
 * cross-references are enforced afterwards by `validate.ts`.
 */

export const TONES = ["ink", "blue", "red", "green", "orange", "purple"] as const;
export const Tone = z.enum(TONES);
export type Tone = z.infer<typeof Tone>;

export const GRID_COLS = 10;
export const GRID_ROWS = 5;

const cue = z
  .string()
  .describe(
    "A word or short phrase copied exactly from this beat's sentence; the action appears when the narrator says it. Empty string = at the start of the sentence.",
  );

const AddAction = z.object({
  kind: z.literal("add"),
  id: z.string().describe("Unique element id, e.g. 'leaf'"),
  shape: z.enum(["box", "circle", "pill", "note", "none"]).describe("'none' = a free-standing label"),
  label: z.string().describe("Short text inside the shape, at most 3 words"),
  col: z.number().int().describe("Grid column 0-9"),
  row: z.number().int().describe("Grid row 0-4"),
  w: z.number().int().describe("Width in grid cells, 1-4"),
  h: z.number().int().describe("Height in grid cells, 1-2"),
  tone: Tone,
  cue,
});

const ConnectAction = z.object({
  kind: z.literal("connect"),
  id: z.string(),
  from: z.string().describe("id of an element added earlier in this scene"),
  to: z.string().describe("id of an element added earlier in this scene"),
  label: z.string().describe("Short label on the connector, or empty string"),
  style: z.enum(["arrow", "line", "double"]),
  tone: Tone,
  cue,
});

const WriteAction = z.object({
  kind: z.literal("write"),
  id: z.string(),
  text: z.string().describe("Equation, formula or notation to write by hand, e.g. 'a² + b² = c²'"),
  col: z.number().int(),
  row: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
  tone: Tone,
  cue,
});

const IconAction = z.object({
  kind: z.literal("icon"),
  id: z.string(),
  // A plain string: a 169-value enum makes the structured-output grammar too large. validateLesson resolves it.
  icon: z.string().describe("Name from the icon list in the instructions, e.g. Saturn → 'planet-ringed', Jupiter → 'planet-banded', Earth → 'earth', sun → 'sun', plant → 'sprout'"),
  label: z.string().describe("Caption under the picture, at most 3 words, or empty string"),
  col: z.number().int(),
  row: z.number().int(),
  w: z.number().int().describe("Width in grid cells, 1-3"),
  h: z.number().int().describe("Height in grid cells, 1-2"),
  tone: Tone,
  cue,
});

const SketchAction = z.object({
  kind: z.literal("sketch"),
  id: z.string(),
  // A string, not an array of objects: nested arrays inside the action union overflow the structured-output grammar.
  points: z.string().describe('2-24 points as "x,y" pairs separated by spaces, e.g. "5,95 5,5 95,95": x and y from 0 (left/top) to 100 (right/bottom) of the element\'s own box'),
  closed: z.boolean().describe("true joins the last point back to the first (a triangle, a planet outline)"),
  smooth: z.boolean().describe("true draws a smooth curve through the points (waves, orbits, graphs); false draws straight segments"),
  label: z.string().describe("Caption under the drawing, at most 3 words, or empty string"),
  col: z.number().int(),
  row: z.number().int(),
  w: z.number().int().describe("Width in grid cells, 1-6"),
  h: z.number().int().describe("Height in grid cells, 1-3"),
  tone: Tone,
  cue,
});

/** A Cartesian graph drawn exactly by code from a short spec (see board/graph.ts). */
const GraphAction = z.object({
  kind: z.literal("graph"),
  id: z.string(),
  spec: z.string(),
  label: z.string(),
  col: z.number().int(),
  row: z.number().int(),
  w: z.number().int(),
  h: z.number().int(),
  tone: Tone,
  cue,
});

const HighlightAction = z.object({
  kind: z.literal("highlight"),
  target: z.string().describe("id of an element already on the board in this scene"),
  style: z.enum(["circle", "underline"]),
  cue,
});

export interface Point {
  x: number;
  y: number;
}

/** Reads a sketch's "x,y x,y" string; malformed pairs are skipped. */
export function parsePoints(points: string): Point[] {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(",").map(Number))
    .filter((xy) => xy.length === 2 && xy.every(Number.isFinite))
    .map(([x, y]) => ({ x, y }));
}

export const Action = z.discriminatedUnion("kind", [AddAction, ConnectAction, WriteAction, IconAction, SketchAction, GraphAction, HighlightAction]);
export type Action = z.infer<typeof Action>;
export type AddAction = z.infer<typeof AddAction>;
export type ConnectAction = z.infer<typeof ConnectAction>;
export type WriteAction = z.infer<typeof WriteAction>;
export type HighlightAction = z.infer<typeof HighlightAction>;
export type IconAction = z.infer<typeof IconAction>;
export type SketchAction = z.infer<typeof SketchAction>;
export type GraphAction = z.infer<typeof GraphAction>;
/** Actions that put an element on the board (everything except connectors and highlights). */
export type ElementAction = AddAction | WriteAction | IconAction | SketchAction | GraphAction;
export const isElement = (a: Action): a is ElementAction => a.kind === "add" || a.kind === "write" || a.kind === "icon" || a.kind === "sketch" || a.kind === "graph";

/**
 * What the model writes for a drawing: one "picture" kind that is either a catalogue icon
 * , a sketch or a Cartesian graph. The six-kind union overflows the structured-output grammar, so the
 * model sees five kinds and validateLesson splits pictures into "icon", "sketch" and "graph".
 */
const PictureAction = z.object({
  kind: z.literal("picture"),
  id: z.string(),
  draw: z
    .string()
    .describe('An icon name from the icon list (e.g. "planet-ringed"); or a sketch: "x,y" points from 0 to 100 inside the element\'s box separated by spaces, optionally starting with "~" for a smooth curve and ending with "z" to close the shape, e.g. "5,95 5,5 95,95 z"; or an exact graph on Cartesian axes starting with "graph", items separated by ";", e.g. "graph y = x^2 - 2x; (1,-1) vertex; x -2..4; y -2..8"'),
  label: z.string().describe("Caption under the picture, at most 3 words, or empty string"),
  col: z.number().int(),
  row: z.number().int(),
  w: z.number().int().describe("Width in grid cells: 1-3 for an icon, 1-6 for a sketch, 4-6 for a graph"),
  h: z.number().int().describe("Height in grid cells: 1-2 for an icon, 1-3 for a sketch, 3-4 for a graph"),
  tone: Tone,
  cue,
});
export type PictureAction = z.infer<typeof PictureAction>;

const DraftAction = z.discriminatedUnion("kind", [AddAction, ConnectAction, WriteAction, PictureAction, HighlightAction]);
export type DraftAction = z.infer<typeof DraftAction>;

export const Beat = z.object({
  id: z.string(),
  sentence: z
    .string()
    .describe("One spoken sentence in plain prose. Spell out symbols (say 'a squared', not 'a²')."),
  actions: z.array(Action).describe("0-3 board actions synchronized with this sentence"),
});
export type Beat = z.infer<typeof Beat>;

export const Scene = z.object({
  id: z.string(),
  title: z.string().describe("Short heading written at the top of the board"),
  beats: z.array(Beat),
});
export type Scene = z.infer<typeof Scene>;

export const RecallQuestion = z.object({
  question: z.string().describe("A short question about something taught earlier in the lesson"),
  options: z.array(z.string()).describe("2-3 short answer options; exactly one is correct"),
  answer: z.number().int().describe("Index of the correct option in options"),
  explanation: z.string().describe("One sentence saying why the correct option is right"),
  sceneId: z.string().describe("id of the scene that taught this"),
});
export type RecallQuestion = z.infer<typeof RecallQuestion>;

export const Lesson = z.object({
  title: z.string(),
  objective: z.string().describe("One sentence: what the learner will understand"),
  scenes: z.array(Scene).describe("2-4 scenes; each scene is a fresh board"),
  suggestedQuestions: z.array(z.string()).describe("3 natural follow-up questions"),
  recall: z.array(RecallQuestion).describe("2-3 end-of-lesson retrieval questions, ideally from different scenes"),
});
export type Lesson = z.infer<typeof Lesson>;

const DraftBeat = Beat.extend({ actions: z.array(DraftAction).describe("0-3 board actions synchronized with this sentence") });
const DraftScene = Scene.extend({ beats: z.array(DraftBeat) });
/** The structured output requested from the model; validateLesson turns it into a Lesson. */
export const LessonDraft = Lesson.extend({ scenes: z.array(DraftScene).describe("2-4 scenes; each scene is a fresh board") });
export type LessonDraft = z.infer<typeof LessonDraft>;

export const FollowUpAnswer = z.object({
  answer: z.string().describe("A clear, friendly answer in 2-6 sentences, plain text"),
  highlight: z
    .array(z.string())
    .describe("ids of board elements from the lesson that the answer refers to; may be empty"),
  sceneId: z.string().describe("id of the scene most relevant to the answer, or empty string"),
});
export type FollowUpAnswer = z.infer<typeof FollowUpAnswer>;
