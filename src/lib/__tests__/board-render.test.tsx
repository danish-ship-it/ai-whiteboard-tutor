import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Whiteboard } from "@/components/board/Whiteboard";
import { frameAt } from "../export/record-video";
import { layoutLesson } from "../board/layout";
import { WIDE } from "../board/motion";
import { buildNarration } from "../lesson/narration";
import { validateLesson } from "../lesson/validate";
import { buildCharClock } from "../timeline/align";
import { compileTimeline } from "../timeline/timeline";
import { pythagoras, steadyAlignment } from "./fixtures";

function setup() {
  const { lesson } = validateLesson(pythagoras);
  const { text } = buildNarration(lesson);
  return { timeline: compileTimeline(lesson, buildCharClock(text, steadyAlignment(text), null)), scenes: layoutLesson(lesson) };
}

describe("video frames", () => {
  it("render the same markup for the same time, so a recording is repeatable", () => {
    const { timeline, scenes } = setup();
    const render = (t: number) => {
      const f = frameAt(scenes, timeline, t, WIDE, 0);
      return renderToStaticMarkup(<Whiteboard scenes={scenes} state={f.state} titleProgress={f.titleProgress} camera={f.camera} enter={f.enter} boil={f.boil} />);
    };
    const t = timeline.duration / 2;
    expect(render(t)).toBe(render(t));
    expect(render(t)).toContain("paper-dots");
  });

  it("boil changes the tremor of the lines but not what is drawn", () => {
    const { timeline, scenes } = setup();
    const f = frameAt(scenes, timeline, timeline.duration - 1, WIDE, 0);
    const at = (boil: number) => renderToStaticMarkup(<Whiteboard scenes={scenes} state={f.state} titleProgress={1} boil={boil} />);
    expect(at(0)).not.toBe(at(1));
    expect(at(0)).toBe(at(3)); // three takes, cycling
    const count = (s: string) => (s.match(/<path/g) ?? []).length;
    expect(count(at(1))).toBe(count(at(0)));
  });

  it("slides a new scene in with a spring", () => {
    const { timeline, scenes } = setup();
    const second = timeline.scenes[1].start;
    const early = frameAt(scenes, timeline, second + 0.05, WIDE, 0);
    const later = frameAt(scenes, timeline, second + 3, WIDE, 0);
    expect(early.enter).toBeLessThan(0.3);
    expect(later.enter).toBeCloseTo(1, 2);
  });
});
