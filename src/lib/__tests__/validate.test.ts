import { describe, expect, it } from "vitest";
import type { Lesson, LessonDraft } from "../lesson/schema";
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

  it("keeps the same correct answer when blank options are dropped", () => {
    const raw = clone();
    raw.recall = [{ question: "2 + 2?", options: ["", "Four", "Five"], answer: 1, explanation: "", sceneId: "triangle" }];
    const { recall } = validateLesson(raw).lesson;
    expect(recall[0].options).toEqual(["Four", "Five"]);
    expect(recall[0].options[recall[0].answer]).toBe("Four");
  });

  it("drops a question whose correct option was blank", () => {
    const raw = clone();
    raw.recall = [{ question: "Q", options: ["", "a", "b"], answer: 0, explanation: "", sceneId: "triangle" }];
    expect(validateLesson(raw).lesson.recall).toHaveLength(0);
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

describe("icons", () => {
  const withIcon = (icon: string) => {
    const raw = clone();
    raw.scenes[0].beats[0].actions.push({ kind: "icon", id: "pic", icon, label: "", col: 7, row: 3, w: 2, h: 2, tone: "blue", cue: "" });
    return validateLesson(raw).lesson.scenes[0].beats[0].actions.find((a) => "id" in a && a.id === "pic")!;
  };

  it("keeps catalogue names and maps near misses", () => {
    expect(withIcon("sun")).toMatchObject({ kind: "icon", icon: "sun" });
    expect(withIcon("Saturn")).toMatchObject({ kind: "icon", icon: "planet-ringed" });
    expect(withIcon("planets")).toMatchObject({ kind: "icon", icon: "planet-small" });
  });

  it("turns an unknown picture into a labelled circle", () => {
    expect(withIcon("unicorn")).toMatchObject({ kind: "add", shape: "circle", label: "unicorn" });
  });
});

describe("pictures from the model", () => {
  it("splits a picture into an icon or a sketch", () => {
    const raw = structuredClone(pythagoras) as unknown as LessonDraft;
    const base = { label: "", col: 6, row: 2, w: 2, h: 2, tone: "blue", cue: "" } as const;
    raw.scenes[0].beats[0].actions.push(
      { ...base, kind: "picture", id: "p1", draw: "earth" },
      { ...base, kind: "picture", id: "p2", draw: "~ 5,95 5,5 120,95 bad z", col: 0, row: 3 },
    );
    const actions = validateLesson(raw).lesson.scenes[0].beats[0].actions;
    expect(actions.find((a) => "id" in a && a.id === "p1")).toMatchObject({ kind: "icon", icon: "earth" });
    expect(actions.find((a) => "id" in a && a.id === "p2")).toMatchObject({ kind: "sketch", points: "5,95 5,5 100,95", closed: true, smooth: true });
  });
});
