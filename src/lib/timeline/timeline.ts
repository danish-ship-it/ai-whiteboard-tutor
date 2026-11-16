import type { Action, Lesson } from "../lesson/schema";
import { buildNarration } from "../lesson/narration";
import { findCue } from "../lesson/validate";
import type { CharClock, SyncQuality } from "./align";

export interface TimedWord {
  text: string;
  start: number;
}

export interface TimedBeat {
  id: string;
  sceneIndex: number;
  sentence: string;
  start: number;
  end: number;
  words: TimedWord[];
}

export interface TimedScene {
  id: string;
  title: string;
  start: number;
  end: number;
}

export interface TimelineEvent {
  seq: number;
  sceneIndex: number;
  beatIndex: number;
  start: number;
  /** When the drawing animation (or highlight) finishes. */
  end: number;
  action: Action;
}

export interface Timeline {
  duration: number;
  quality: SyncQuality;
  scenes: TimedScene[];
  beats: TimedBeat[];
  events: TimelineEvent[];
}

// Slow enough to watch the marker trace each stroke and write each label.
const DRAW_SECONDS: Record<Action["kind"], number> = { add: 1.5, write: 1.8, connect: 1.1, icon: 2.2, sketch: 2.2, highlight: 0.8 };
const MIN_HIGHLIGHT = 1.6;
/** Shortest a stroke may be squeezed to so it still reads as drawn. */
/** Shortest stroke when a scene is out of time: effectively appears at once. */
const SNAP_SECONDS = 0.05;
const MIN_DRAW = 0.4;
/** A dependent action starts at least this long after the element it uses. */
const DEPENDENCY_GAP = 0.25;

/** Resolves every sentence and action to absolute media time. Pure and deterministic. */
export function compileTimeline(lesson: Lesson, clock: CharClock): Timeline {
  const { spans } = buildNarration(lesson);
  const timeAt = (offset: number) => clock.times[Math.min(offset, clock.times.length - 1)] ?? 0;

  const beats: TimedBeat[] = spans.map((span, i) => {
    const beat = lesson.scenes[span.sceneIndex].beats[span.beatIndex];
    const start = i === 0 ? 0 : timeAt(span.start);
    const end = i + 1 < spans.length ? timeAt(spans[i + 1].start) : clock.duration;
    return { id: beat.id, sceneIndex: span.sceneIndex, sentence: beat.sentence, start, end: Math.max(end, start), words: timeWords(beat.sentence, span.start, timeAt) };
  });

  const scenes: TimedScene[] = lesson.scenes.map((scene, si) => {
    const own = beats.filter((b) => b.sceneIndex === si);
    return { id: scene.id, title: scene.title, start: own[0]?.start ?? 0, end: own[own.length - 1]?.end ?? 0 };
  });

  const events: TimelineEvent[] = [];
  const doneAt = new Map<string, number>();
  let seq = 0;
  // One marker: a stroke starts only when the previous one is finished.
  let penFree = 0;

  spans.forEach((span, beatIndex) => {
    const beat = lesson.scenes[span.sceneIndex].beats[span.beatIndex];
    const timedBeat = beats[beatIndex];
    const sceneEnd = scenes[span.sceneIndex].end;
    if (beatIndex > 0 && spans[beatIndex - 1].sceneIndex !== span.sceneIndex) penFree = timedBeat.start;

    for (const action of beat.actions) {
      const cueOffset = findCue(beat.sentence, action.cue);
      const cued = cueOffset === -1 ? timedBeat.start : timeAt(span.start + cueOffset);
      let start = Math.max(cued, penFree);

      const deps = action.kind === "connect" ? [action.from, action.to] : action.kind === "highlight" ? [action.target] : [];
      for (const dep of deps) start = Math.max(start, (doneAt.get(dep) ?? start) + DEPENDENCY_GAP);

      // If the marker has fallen behind the narration, it draws faster to catch up.
      const lag = start - cued;
      let draw = DRAW_SECONDS[action.kind] * (lag > 1.5 ? 0.5 : lag > 0.6 ? 0.75 : 1);
      // Near the end of a scene the stroke gets quicker so it finishes with the scene. It never starts
      // early (before its cue, the previous stroke or what it connects), so strokes never overlap;
      // in a crowded ending the last ones snap in.
      const room = Math.max(SNAP_SECONDS, sceneEnd - start);
      draw = Math.min(Math.max(draw, MIN_DRAW), room);

      const end = action.kind === "highlight" ? Math.min(sceneEnd, Math.max(timedBeat.end, start + MIN_HIGHLIGHT)) : start + draw;
      penFree = start + (action.kind === "highlight" ? Math.min(draw, end - start) : draw);

      if (action.kind !== "highlight") doneAt.set(action.id, start + draw);
      events.push({ seq: seq++, sceneIndex: span.sceneIndex, beatIndex, start, end, action });
    }
  });

  packCrowdedEndings(events, scenes.map((s) => s.end));
  events.sort((a, b) => a.start - b.start || a.seq - b.seq);
  return { duration: clock.duration, quality: clock.quality, scenes, beats, events };
}

/**
 * When strokes queue past the end of their scene, walk back from the end and pack them so each
 * still draws in turn and the last one finishes as the scene ends. They may start a little before
 * their cue; that beats overlapping or never finishing.
 */
function packCrowdedEndings(events: TimelineEvent[], sceneEnds: number[]): void {
  sceneEnds.forEach((sceneEnd, sceneIndex) => {
    const strokes = events.filter((e) => e.sceneIndex === sceneIndex && e.action.kind !== "highlight");
    let limit = sceneEnd;
    for (let i = strokes.length - 1; i >= 0; i--) {
      const e = strokes[i];
      if (e.end <= limit) break;
      const draw = Math.max(SNAP_SECONDS, Math.min(e.end - e.start, MIN_DRAW));
      e.end = limit;
      e.start = Math.max(0, limit - draw);
      limit = e.start;
    }
  });
}

function timeWords(sentence: string, offset: number, timeAt: (i: number) => number): TimedWord[] {
  const words: TimedWord[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence))) words.push({ text: m[0], start: timeAt(offset + m.index) });
  return words;
}

export interface ElementState {
  id: string;
  /** Drawing progress, 0..1. */
  progress: number;
  active: boolean;
  dimmed: boolean;
}

export interface HighlightState {
  target: string;
  style: "circle" | "underline";
  progress: number;
}

export interface BoardState {
  t: number;
  sceneIndex: number;
  beatIndex: number;
  elements: ElementState[];
  highlights: HighlightState[];
  caption: string;
  spokenWordIndex: number;
  ended: boolean;
}

const progressOf = (e: TimelineEvent, t: number) => (e.end <= e.start ? 1 : Math.min(1, Math.max(0, (t - e.start) / (e.end - e.start))));

function lastIndexAtOrBefore<T extends { start: number }>(items: T[], t: number): number {
  let index = 0;
  for (let i = 0; i < items.length; i++) if (items[i].start <= t) index = i;
  return index;
}

/**
 * The whole board at media time `t`. Because this is a pure function of time,
 * playing, seeking and replaying to the same `t` always render the same board.
 */
export function boardStateAt(timeline: Timeline, rawT: number): BoardState {
  const t = Math.min(Math.max(rawT, 0), timeline.duration);
  const sceneIndex = lastIndexAtOrBefore(timeline.scenes, t);
  const beatIndex = lastIndexAtOrBefore(timeline.beats, t);
  const beat = timeline.beats[beatIndex];

  const visible = timeline.events.filter((e) => e.sceneIndex === sceneIndex && e.start <= t);
  const highlights: HighlightState[] = visible
    .filter((e) => e.action.kind === "highlight" && t < e.end)
    .map((e) => {
      const a = e.action as Extract<Action, { kind: "highlight" }>;
      return { target: a.target, style: a.style, progress: Math.min(1, (t - e.start) / DRAW_SECONDS.highlight) };
    });

  const drawn = visible.filter((e) => e.action.kind !== "highlight");
  const activeIds = new Set<string>([
    ...drawn.filter((e) => e.beatIndex === beatIndex).map((e) => (e.action as { id: string }).id),
    ...highlights.map((h) => h.target),
  ]);

  const elements: ElementState[] = drawn.map((e) => {
    const id = (e.action as { id: string }).id;
    const active = activeIds.has(id);
    return { id, progress: progressOf(e, t), active, dimmed: activeIds.size > 0 && !active };
  });

  let spokenWordIndex = -1;
  beat?.words.forEach((w, i) => {
    if (w.start <= t) spokenWordIndex = i;
  });

  return {
    t,
    sceneIndex,
    beatIndex,
    elements,
    highlights,
    caption: beat?.sentence ?? "",
    spokenWordIndex,
    ended: t >= timeline.duration - 0.05,
  };
}
