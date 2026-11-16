import { describe, expect, it } from "vitest";
import type { Lesson } from "../lesson/schema";
import { validateLesson } from "../lesson/validate";
import { pythagoras } from "./fixtures";

const clone = (): Lesson => structuredClone(pythagoras);

describe("recall questions", () => {
  it("keeps valid questions and their scene", () => {
    const { lesson } = validateLesson(clone());
    expect(lesson.recall).toHaveLength(1);
    expect(lesson.recall[0].sceneId).toBe("triangle");
  });

  it("drops questions whose answer index is out of range or that have too few options", () => {
    const raw = clone();
    raw.recall = [
      { question: "Q1", options: ["a", "b"], answer: 2, explanation: "", sceneId: "triangle" },
      { question: "Q2", options: ["only"], answer: 0, explanation: "", sceneId: "triangle" },
    ];
    const { lesson, issues } = validateLesson(raw);
    expect(lesson.recall).toHaveLength(0);
    expect(issues.filter((i) => i.startsWith("dropped recall"))).toHaveLength(2);
  });

  it("clears a scene id that does not exist", () => {
    const raw = clone();
    raw.recall[0].sceneId = "nope";
    expect(validateLesson(raw).lesson.recall[0].sceneId).toBe("");
  });
});

describe("tone clashes", () => {
  it("recolours purple when a scene also uses green", () => {
    const raw = clone();
    const adds = raw.scenes[0].beats.flatMap((b) => b.actions).filter((a) => a.kind === "add");
    adds[0].tone = "green";
    adds[1].tone = "purple";
    const { lesson, issues } = validateLesson(raw);
    const tones = lesson.scenes[0].beats.flatMap((b) => b.actions).flatMap((a) => ("tone" in a ? [a.tone] : []));
    expect(tones).not.toContain("purple");
    expect(issues.some((i) => i.includes("purple next to green"))).toBe(true);
  });
});
