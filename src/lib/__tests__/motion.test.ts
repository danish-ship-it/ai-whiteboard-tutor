import { describe, expect, it } from "vitest";
import { BOARD_H, BOARD_W, layoutLesson } from "../board/layout";
import { WIDE, boardCamera, iconMotion } from "../board/motion";
import { buildNarration } from "../lesson/narration";
import { validateLesson } from "../lesson/validate";
import { buildCharClock } from "../timeline/align";
import { boardStateAt, compileTimeline } from "../timeline/timeline";
import { pythagoras, steadyAlignment } from "./fixtures";

function setup() {
  const { lesson } = validateLesson(pythagoras);
  const { text } = buildNarration(lesson);
  const timeline = compileTimeline(lesson, buildCharClock(text, steadyAlignment(text), null));
  return { timeline, scenes: layoutLesson(lesson) };
}

/** The board area visible through the camera, in board units. */
const view = (c: typeof WIDE) => ({ x: (-c.x * BOARD_W) / c.scale, y: (-c.y * BOARD_H) / c.scale, w: BOARD_W / c.scale, h: BOARD_H / c.scale });

describe("boardCamera", () => {
  it("leans in on what is being drawn and keeps it fully in view", () => {
    const { timeline, scenes } = setup();
    let zoomed = 0;
    for (let t = 0; t <= timeline.duration; t += 0.2) {
      const state = boardStateAt(timeline, t);
      const scene = scenes[state.sceneIndex];
      const camera = boardCamera(scene, state, {});
      expect(camera.scale).toBeGreaterThanOrEqual(1);
      expect(camera.scale).toBeLessThanOrEqual(1.25);
      const v = view(camera);
      // Never shows anything outside the board.
      expect(v.x).toBeGreaterThanOrEqual(-0.5);
      expect(v.y).toBeGreaterThanOrEqual(-0.5);
      expect(v.x + v.w).toBeLessThanOrEqual(BOARD_W + 0.5);
      expect(v.y + v.h).toBeLessThanOrEqual(BOARD_H + 0.5);
      const drawing = state.elements.find((e) => e.progress > 0 && e.progress < 1 && scene.shapes[e.id]);
      if (camera.scale > 1 && drawing) {
        zoomed++;
        const s = scene.shapes[drawing.id];
        expect(s.x).toBeGreaterThanOrEqual(v.x - 1);
        expect(s.x + s.w).toBeLessThanOrEqual(v.x + v.w + 1);
      }
    }
    expect(zoomed).toBeGreaterThan(0);
  });

  it("shows the whole board at the end, under reduced motion and while the title is written", () => {
    const { timeline, scenes } = setup();
    const end = boardStateAt(timeline, timeline.duration);
    expect(boardCamera(scenes[end.sceneIndex], end, {})).toEqual(WIDE);
    const mid = boardStateAt(timeline, timeline.duration / 2);
    expect(boardCamera(scenes[mid.sceneIndex], mid, { reducedMotion: true })).toEqual(WIDE);
    expect(boardCamera(scenes[mid.sceneIndex], mid, { titleProgress: 0.5 })).toEqual(WIDE);
  });

  it("is a pure function of the board state, so seeking lands on the same camera", () => {
    const { timeline, scenes } = setup();
    const t = timeline.duration * 0.3;
    const a = boardStateAt(timeline, t);
    expect(boardCamera(scenes[a.sceneIndex], a, {})).toEqual(boardCamera(scenes[a.sceneIndex], boardStateAt(timeline, t), {}));
  });
});

describe("iconMotion", () => {
  it("gives living things and machines a fitting motion", () => {
    expect(iconMotion("sun")).toBe("spin");
    expect(iconMotion("leaf")).toBe("sway");
    expect(iconMotion("planet-ringed")).toBe("float");
    expect(iconMotion("heart")).toBe("pulse");
    expect(iconMotion("car")).toBe("drive");
    expect(iconMotion("calculator")).toBeUndefined();
  });
});
