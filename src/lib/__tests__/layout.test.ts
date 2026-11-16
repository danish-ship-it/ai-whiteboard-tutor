import { describe, expect, it } from "vitest";
import { BOARD_H, BOARD_W, fitText, layoutLesson, placeWithoutOverlap, type Box } from "../board/layout";
import { validateLesson } from "../lesson/validate";
import { pythagoras } from "./fixtures";

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("layoutLesson", () => {
  it("keeps every shape on the board", () => {
    for (const scene of layoutLesson(validateLesson(pythagoras).lesson)) {
      for (const s of Object.values(scene.shapes)) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.x + s.w).toBeLessThanOrEqual(BOARD_W);
        expect(s.y + s.h).toBeLessThanOrEqual(BOARD_H);
      }
    }
  });

  it("moves colliding elements instead of stacking them", () => {
    const lesson = structuredClone(validateLesson(pythagoras).lesson);
    for (const action of lesson.scenes[0].beats.flatMap((b) => b.actions)) {
      if (action.kind === "add") Object.assign(action, { col: 0, row: 0, w: 2, h: 2 });
    }
    const shapes = Object.values(layoutLesson(lesson)[0].shapes);
    for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) expect(overlaps(shapes[i], shapes[j])).toBe(false);
  });
});

describe("placeWithoutOverlap", () => {
  it("keeps a free spot as requested", () => {
    expect(placeWithoutOverlap({ col: 2, row: 2, w: 2, h: 1 }, new Set())).toEqual({ col: 2, row: 2, w: 2, h: 1 });
  });
});

describe("fitText", () => {
  it("wraps long labels and shrinks the font to fit", () => {
    const { lines, fontSize } = fitText("light energy from the sun", 260, 240, 56);
    expect(lines.length).toBeGreaterThan(1);
    expect(fontSize).toBeLessThanOrEqual(56);
    expect(lines.length * fontSize * 1.2).toBeLessThanOrEqual(240);
  });
});
