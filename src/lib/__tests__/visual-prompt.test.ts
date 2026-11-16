import { describe, expect, it } from "vitest";
import { validateLesson } from "../lesson/validate";
import { visualPrompt } from "../lesson/visual-prompt";
import { pythagoras } from "./fixtures";

describe("visualPrompt", () => {
  it("names the subject, the scene and its opening, within the API limit", () => {
    const { lesson } = validateLesson(structuredClone(pythagoras));
    const prompt = visualPrompt(lesson, lesson.scenes[0]);
    expect(prompt).toContain(lesson.title);
    expect(prompt).toContain(lesson.scenes[0].title);
    expect(prompt).toContain(lesson.scenes[0].beats[0].sentence.slice(0, 20));
    expect(prompt.length).toBeLessThanOrEqual(700);
  });
});
