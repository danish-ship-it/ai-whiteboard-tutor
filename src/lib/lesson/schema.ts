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

const HighlightAction = z.object({
  kind: z.literal("highlight"),
  target: z.string().describe("id of an element already on the board in this scene"),
  style: z.enum(["circle", "underline"]),
  cue,
});

export const Action = z.discriminatedUnion("kind", [AddAction, ConnectAction, WriteAction, HighlightAction]);
export type Action = z.infer<typeof Action>;
export type AddAction = z.infer<typeof AddAction>;
export type ConnectAction = z.infer<typeof ConnectAction>;
export type WriteAction = z.infer<typeof WriteAction>;
export type HighlightAction = z.infer<typeof HighlightAction>;

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

export const FollowUpAnswer = z.object({
  answer: z.string().describe("A clear, friendly answer in 2-6 sentences, plain text"),
  highlight: z
    .array(z.string())
    .describe("ids of board elements from the lesson that the answer refers to; may be empty"),
  sceneId: z.string().describe("id of the scene most relevant to the answer, or empty string"),
});
export type FollowUpAnswer = z.infer<typeof FollowUpAnswer>;
