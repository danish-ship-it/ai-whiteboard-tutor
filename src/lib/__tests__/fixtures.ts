import type { Lesson } from "../lesson/schema";
import type { CharAlignment } from "../timeline/align";

const s = (text: string) => text;

/** A small but realistic lesson (≈130 words) used across tests. */
export const pythagoras: Lesson = {
  title: "The Pythagorean theorem",
  objective: "Understand how the sides of a right triangle are related.",
  scenes: [
    {
      id: "triangle",
      title: "A right triangle",
      beats: [
        {
          id: "b1",
          sentence: s("Let's start with a right triangle, which is a triangle with one perfect square corner."),
          actions: [
            { kind: "add", id: "tri", shape: "box", label: "right triangle", col: 1, row: 1, w: 3, h: 2, tone: "ink", cue: "right triangle" },
          ],
        },
        {
          id: "b2",
          sentence: s("The two shorter sides are called legs, and we will name them a and b."),
          actions: [
            { kind: "add", id: "a", shape: "circle", label: "a", col: 5, row: 1, w: 1, h: 1, tone: "blue", cue: "legs" },
            { kind: "add", id: "b", shape: "circle", label: "b", col: 5, row: 3, w: 1, h: 1, tone: "blue", cue: "b" },
          ],
        },
        {
          id: "b3",
          sentence: s("The longest side, opposite the square corner, is the hypotenuse, which we call c."),
          actions: [
            { kind: "add", id: "c", shape: "circle", label: "c", col: 8, row: 2, w: 1, h: 1, tone: "red", cue: "hypotenuse" },
            { kind: "connect", id: "ac", from: "a", to: "c", label: "", style: "arrow", tone: "ink", cue: "" },
          ],
        },
      ],
    },
    {
      id: "rule",
      title: "The rule",
      beats: [
        {
          id: "b4",
          sentence: s("Here is the big idea: a squared plus b squared equals c squared."),
          actions: [{ kind: "write", id: "eq", text: "a² + b² = c²", col: 2, row: 1, w: 6, h: 1, tone: "ink", cue: "big idea" }],
        },
        {
          id: "b5",
          sentence: s("If the legs are three and four, then nine plus sixteen gives twenty five, so the hypotenuse is five."),
          actions: [
            { kind: "write", id: "ex", text: "3² + 4² = 25 → c = 5", col: 2, row: 3, w: 6, h: 1, tone: "green", cue: "three and four" },
            { kind: "highlight", target: "eq", style: "underline", cue: "so the hypotenuse" },
          ],
        },
        {
          id: "b6",
          sentence: s("This works for every right triangle, and it lets you find any missing side when you know the other two."),
          actions: [],
        },
        {
          id: "b7",
          sentence: s("Builders, map makers and game designers use this rule every single day to measure distances they cannot reach."),
          actions: [],
        },
        {
          id: "b8",
          sentence: s("Next time you see a ladder leaning on a wall, picture the triangle and the rule."),
          actions: [],
        },
      ],
    },
  ],
  suggestedQuestions: ["Why does it only work for right triangles?", "How do I find a leg?", "Who discovered it?"],
  recall: [
    { question: "Which side is the hypotenuse?", options: ["The longest side", "The shortest side"], answer: 0, explanation: "It faces the right angle, so it is always the longest.", sceneId: "triangle" },
  ],
};

/** Exact per-character alignment at a steady 15 chars/second. */
export function steadyAlignment(text: string, cps = 15): CharAlignment {
  const chars = [...text];
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i / cps),
    character_end_times_seconds: chars.map((_, i) => (i + 1) / cps),
  };
}
