import { describe, expect, it } from "vitest";
import { buildNarration } from "../lesson/narration";
import { validateLesson, LessonValidationError } from "../lesson/validate";
import { buildCharClock } from "../timeline/align";
import { boardStateAt, compileTimeline } from "../timeline/timeline";
import { pythagoras, steadyAlignment } from "./fixtures";

function build() {
  const { lesson } = validateLesson(pythagoras);
  const { text } = buildNarration(lesson);
  const clock = buildCharClock(text, steadyAlignment(text), null);
  return { lesson, text, timeline: compileTimeline(lesson, clock) };
}

describe("compileTimeline", () => {
  it("fires each action when its cue word is spoken", () => {
    const { text, timeline } = build();
    const event = timeline.events.find((e) => e.action.kind === "add" && e.action.id === "c")!;
    expect(event.start).toBeCloseTo(text.indexOf("hypotenuse, which") / 15, 5);
  });

  it("starts connectors after both endpoints exist", () => {
    const { timeline } = build();
    const shown = (id: string) => timeline.events.find((e) => "id" in e.action && e.action.id === id)!.start;
    expect(shown("ac")).toBeGreaterThan(shown("a"));
    expect(shown("ac")).toBeGreaterThan(shown("c"));
  });

  it("covers the whole audio with contiguous sentences", () => {
    const { timeline } = build();
    expect(timeline.beats[0].start).toBe(0);
    for (let i = 1; i < timeline.beats.length; i++) expect(timeline.beats[i].start).toBe(timeline.beats[i - 1].end);
    expect(timeline.beats.at(-1)!.end).toBe(timeline.duration);
  });
});

describe("one marker", () => {
  it("never starts a stroke before its cue and never draws two at once", () => {
    const { lesson, text, timeline } = build();
    const { spans } = buildNarration(lesson);
    const drawn = timeline.events.filter((e) => e.action.kind !== "highlight");
    for (const e of drawn) {
      const span = spans[e.beatIndex];
      const sentence = lesson.scenes[span.sceneIndex].beats[span.beatIndex].sentence;
      const cue = e.action.cue ? sentence.indexOf(e.action.cue) : 0;
      const cueTime = text.indexOf(sentence) / 15 + Math.max(cue, 0) / 15;
      expect(e.start).toBeGreaterThanOrEqual(cueTime - 1e-6);
    }
    for (let i = 1; i < drawn.length; i++) {
      if (drawn[i].sceneIndex === drawn[i - 1].sceneIndex) expect(drawn[i].start).toBeGreaterThanOrEqual(drawn[i - 1].end - 1e-6);
    }
  });
});

describe("crowded scene endings", () => {
  it("never overlaps strokes or overruns the scene when several are cued at its last words", () => {
    const lesson = structuredClone(pythagoras);
    const last = lesson.scenes[0].beats.at(-1)!;
    last.actions = ["x", "y", "z"].map((id, i) => ({ kind: "add" as const, id, shape: "box" as const, label: id, col: 2 * i, row: 4, w: 1, h: 1, tone: "ink" as const, cue: "call c" }));
    const text = buildNarration(lesson).text;
    const timeline = compileTimeline(lesson, buildCharClock(text, steadyAlignment(text), null));
    const sceneEnd = timeline.scenes[0].end;
    const crowded = timeline.events.filter((e) => "id" in e.action && ["x", "y", "z"].includes(e.action.id));
    expect(crowded).toHaveLength(3);
    for (let i = 1; i < crowded.length; i++) expect(crowded[i].start).toBeGreaterThanOrEqual(crowded[i - 1].end - 1e-6);
    for (const e of crowded) expect(e.end).toBeLessThanOrEqual(sceneEnd + 0.05 + 1e-6);
  });
});

describe("boardStateAt", () => {
  it("is a pure function of time: seeking equals playing", () => {
    const { timeline } = build();
    const played = [] as ReturnType<typeof boardStateAt>[];
    for (let t = 0; t <= timeline.duration; t += 0.25) played.push(boardStateAt(timeline, t));
    const seekOrder = played.map((_, i) => i).reverse();
    for (const i of seekOrder) expect(boardStateAt(timeline, played[i].t)).toEqual(played[i]);
  });

  it("shows a fresh board for each scene", () => {
    const { timeline } = build();
    const inScene2 = boardStateAt(timeline, timeline.scenes[1].start + 0.01);
    expect(inScene2.sceneIndex).toBe(1);
    expect(inScene2.elements.map((e) => e.id)).not.toContain("tri");
  });

  it("shows the completed final board at the end", () => {
    const { timeline } = build();
    const end = boardStateAt(timeline, timeline.duration);
    expect(end.ended).toBe(true);
    expect(end.elements.every((e) => e.progress === 1)).toBe(true);
    expect(end.elements.map((e) => e.id).sort()).toEqual(["eq", "ex"]);
  });

  it("clamps out-of-range seeks", () => {
    const { timeline } = build();
    expect(boardStateAt(timeline, -5).t).toBe(0);
    expect(boardStateAt(timeline, 1e9).t).toBe(timeline.duration);
  });

  it("tracks the spoken word inside the caption", () => {
    const { text, timeline } = build();
    const t = text.indexOf("hypotenuse, which") / 15 + 0.01;
    const state = boardStateAt(timeline, t);
    expect(state.caption).toContain("hypotenuse");
    expect(state.caption.split(/\s+/)[state.spokenWordIndex]).toBe("hypotenuse,");
  });
});

describe("buildCharClock", () => {
  it("maps normalized alignment back onto the original text", () => {
    const text = "Take 3 apples.";
    const spoken = "Take three apples.";
    const clock = buildCharClock(text, null, steadyAlignment(spoken));
    expect(clock.quality).toBe("mapped");
    expect(clock.times[text.indexOf("apples")]).toBeCloseTo(spoken.indexOf("apples") / 15, 5);
    for (let i = 1; i < clock.times.length; i++) expect(clock.times[i]).toBeGreaterThanOrEqual(clock.times[i - 1]);
  });

  it("estimates timing when alignment is missing or broken", () => {
    const broken = { characters: ["a"], character_start_times_seconds: [NaN], character_end_times_seconds: [1] };
    const clock = buildCharClock("hello world", broken, null, 4);
    expect(clock.quality).toBe("estimated");
    expect(clock.duration).toBe(4);
  });
});

describe("validateLesson", () => {
  it("drops references to elements that are not on the board yet", () => {
    const bad = structuredClone(pythagoras);
    bad.scenes[0].beats[0].actions.push({ kind: "connect", id: "x", from: "tri", to: "ghost", label: "", style: "arrow", tone: "ink", cue: "" });
    const { lesson, issues } = validateLesson(bad);
    expect(lesson.scenes[0].beats[0].actions.some((a) => a.kind === "connect")).toBe(false);
    expect(issues.some((i) => i.includes("dropped connector"))).toBe(true);
  });

  it("clears cues that are not in the sentence and clamps the grid", () => {
    const bad = structuredClone(pythagoras);
    const add = bad.scenes[0].beats[0].actions[0] as Extract<(typeof bad.scenes)[0]["beats"][0]["actions"][0], { kind: "add" }>;
    Object.assign(add, { cue: "not there", col: 40, w: 9 });
    const out = validateLesson(bad).lesson.scenes[0].beats[0].actions[0];
    expect(out).toMatchObject({ cue: "", w: 4, col: 6 });
  });

  it("rejects lessons that are far too short to teach", () => {
    const tiny = structuredClone(pythagoras);
    tiny.scenes = [tiny.scenes[0]];
    expect(() => validateLesson(tiny)).toThrow(LessonValidationError);
  });
});
