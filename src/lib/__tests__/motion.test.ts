import { describe, expect, it } from "vitest";
import { BOARD_H, BOARD_W, layoutLesson } from "../board/layout";
import { WIDE, boardCamera, followCamera, iconMotion, spring } from "../board/motion";
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

describe("spring", () => {
  it("starts at rest, overshoots a little and settles on 1", () => {
    expect(spring(0)).toBe(0);
    expect(spring(-1)).toBe(0);
    const samples = Array.from({ length: 200 }, (_, i) => spring(i / 100));
    const peak = Math.max(...samples);
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.15);
    expect(spring(3)).toBeCloseTo(1, 3);
  });

  it("is a pure function of time", () => {
    expect(spring(0.37)).toBe(spring(0.37));
  });
});

describe("followCamera", () => {
  it("eases toward the target without passing it", () => {
    const target = { scale: 1.2, x: -0.1, y: -0.05 };
    let c = WIDE;
    for (let i = 0; i < 120; i++) {
      c = followCamera(c, target, 1 / 24);
      expect(c.scale).toBeLessThanOrEqual(target.scale + 1e-9);
    }
    expect(c.scale).toBeCloseTo(1.2, 3);
    expect(followCamera(WIDE, target, 0)).toEqual(WIDE);
  });
});
