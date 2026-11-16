"use client";

import { memo, useMemo } from "react";
import { BOARD_H, BOARD_W, center, type Box, type ConnectorGeometry, type SceneLayout, type ShapeGeometry } from "@/lib/board/layout";
import { CAMERA_TRANSITION, WIDE, cameraSvgTransform, type Camera } from "@/lib/board/motion";
import { arrowHead, sketchEllipse, sketchLine, sketchRect, sketchUnderline } from "@/lib/board/sketch";
import type { BoardState } from "@/lib/timeline/timeline";

interface Props {
  scenes: SceneLayout[];
  state: BoardState;
  /** 0..1, how much of the scene title has been written. */
  titleProgress: number;
  /** Elements a follow-up answer points at; drawn with current-element emphasis. */
  emphasis?: string[];
  reducedMotion?: boolean;
  description?: string;
  /** Where the camera looks (see motion.ts). */
  camera?: Camera;
  /** Moving parts run only while the lesson plays. */
  playing?: boolean;
  /**
   * Line boil: which of three hand-drawn takes every stroke uses. Stepping it a few times a second
   * makes the lines tremble like an animated pencil drawing; the structure of each shape never moves.
   */
  boil?: number;
  /**
   * How far the scene has slid in (spring, 0..1+). Only the video export passes it; the live board
   * plays the same entrance as a CSS animation.
   */
  enter?: number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ink = (tone: string) => `var(--ink-${tone})`;
const tint = (tone: string) => `var(--tint-${tone})`;
/** Rendered stroke width in CSS pixels, independent of board scale (spec §5). */
const STROKE = 2.5;
const EMPHASIS_STROKE = 3;
const TITLE = { x: 64, y: 104, size: 76 };
/** Hand lettering for everything on the board (equations keep the mono face). */
const HAND_FONT = "var(--font-hand), var(--font-instrument), cursive";
/** Number of hand-drawn takes the line boil cycles through. */
export const TAKES = 3;
/** The same seed for take 0 (the board's settled look), a different tremor for the others. */
const seedFor = (key: string, take: number) => (take ? `${key}~${take}` : key);

/** Inline version of the board-scene-in animation, for frames rendered one at a time. */
function sceneEnterStyle(enter: number): React.CSSProperties {
  const left = 1 - enter;
  return {
    transform: `translate(${(left * 70).toFixed(2)}px, 0px) rotate(${(-left * 0.8).toFixed(3)}deg)`,
    transformOrigin: `${BOARD_W / 2}px ${BOARD_H / 2}px`,
    opacity: clamp01(enter * 1.6),
  };
}

/**
 * Renders one board state. It owns no timers or animation state: everything
 * visible is derived from `state`, which is derived from media time, so seeking
 * shows the correct final state immediately.
 *
 * Every element is drawn in two phases, the way a teacher works at a board:
 * the marker first draws the outline or picture, then writes the label.
 */
export const Whiteboard = memo(function Whiteboard({ scenes, state, titleProgress, emphasis = [], reducedMotion, description, camera = WIDE, playing = false, boil = 0, enter }: Props) {
  const scene = scenes[state.sceneIndex];
  const take = boil % TAKES;
  const paths = useMemo(() => buildPaths(scene, take), [scene, take]);
  if (!scene) return null;

  const reveal = (n: number) => (reducedMotion ? (n > 0 ? 1 : 0) : n);
  const emphasized = new Set(emphasis.filter((id) => scene.shapes[id]));
  const quiet = state.ended && emphasized.size === 0;
  const title = reveal(titleProgress);
  // Finished drawings keep moving while the lesson plays; paused, they hold still where they are.
  const motion = reducedMotion ? undefined : ({ animationPlayState: playing ? "running" : "paused" } as const);

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="block h-full w-full select-none" role="img" aria-labelledby="board-title board-desc">
      <title id="board-title">{`Whiteboard: ${scene.title}`}</title>
      <desc id="board-desc">{describeBoard(scene, state, description)}</desc>

      <defs>
        <filter id="board-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <PaperDefs />
      </defs>
      <g
        aria-hidden="true"
        fontFamily={HAND_FONT}
        style={{ transform: cameraSvgTransform(camera), transformOrigin: "0 0", transition: reducedMotion || enter !== undefined ? undefined : CAMERA_TRANSITION }}
      >
        <Paper />
        {/* Keyed on the scene, so each new step slides onto the page with a little spring. */}
        <g
          key={state.sceneIndex}
          className={enter === undefined && !reducedMotion ? "board-scene-in" : undefined}
          style={enter === undefined ? undefined : sceneEnterStyle(enter)}
        >
        <SceneTitle text={scene.title} progress={title} take={take} />

        {state.elements.map((el) => {
          const shape = scene.shapes[el.id];
          if (!shape) return null;
          // The "current" tint appears once the element is drawn, so it never frames an empty space.
          const current = !quiet && (emphasized.size ? emphasized.has(el.id) : el.active && el.progress >= 1);
          return current ? <Emphasis key={`em-${el.id}`} shape={shape} sweep={!reducedMotion && playing} take={take} /> : null;
        })}

        {state.elements.map((el) => {
          const shape = scene.shapes[el.id];
          const connector = scene.connectors[el.id];
          const earlier = !quiet && (emphasized.size ? !emphasized.has(el.id) : el.dimmed);
          if (shape)
            return (
              <ShapeView
                key={el.id}
                shape={shape}
                path={paths.shapes[el.id]}
                pass={paths.passes[el.id]}
                progress={reveal(el.progress)}
                earlier={earlier}
                motion={motion}
                tracing={!!motion && el.active}
                take={take}
              />
            );
          if (connector)
            return <ConnectorView key={el.id} c={connector} path={paths.connectors[el.id]} progress={reveal(el.progress)} earlier={earlier} motion={earlier ? undefined : motion} />;
          return null;
        })}

        {!quiet &&
          state.highlights.map((h) => {
            const target = scene.shapes[h.target];
            return target ? <HighlightMark key={`hl-${h.target}`} shape={target} style={h.style} progress={reveal(h.progress)} glow={!reducedMotion && playing} take={take} /> : null;
          })}

        {!state.ended && <Nib at={nibPosition(scene, state, paths, title, take, reducedMotion)} animate={!reducedMotion && enter === undefined} />}
        </g>
      </g>
    </svg>
  );
});

/** How far each phase of an element is: `art` draws the outline or picture, `text` writes the label. */
function phases(shape: ShapeGeometry, hasPath: boolean, progress: number): { art: number; text: number } {
  if (shape.kind === "picture") {
    if (!shape.lines.length) return { art: progress, text: 0 };
    return { art: clamp01(progress / 0.7), text: clamp01((progress - 0.7) / 0.3) };
  }
  if (hasPath) return { art: clamp01(progress / 0.6), text: clamp01((progress - 0.6) / 0.4) };
  return { art: 1, text: progress };
}

interface TextLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  cx: number;
  /** Baseline of the first line. */
  top: number;
  /** Estimated width of the widest line. */
  width: number;
}

function textLayout(shape: ShapeGeometry): TextLayout {
  const box: Box = shape.textBox ?? shape;
  const lineHeight = shape.fontSize * 1.2;
  const top = box.y + box.h / 2 - (shape.lines.length * lineHeight) / 2 + shape.fontSize * 0.86;
  const mono = shape.kind === "write";
  const width = Math.max(...shape.lines.map((l) => l.length), 1) * shape.fontSize * (mono ? 0.6 : 0.52);
  return { lines: shape.lines, fontSize: shape.fontSize, lineHeight, cx: box.x + box.w / 2, top, width: Math.min(width, Math.max(box.w, 40)) };
}

/** Plain-language summary of what is drawn so far, for screen readers (the drawing itself is aria-hidden). */
function describeBoard(scene: SceneLayout, state: BoardState, prefix?: string): string {
  const drawn = state.elements.filter((el) => el.progress > 0);
  const text = (id: string) => scene.shapes[id]?.lines.join(" ") ?? id;
  const parts = drawn.flatMap((el) => {
    const shape = scene.shapes[el.id];
    if (shape) {
      if (shape.kind === "write") return [`the equation ${text(el.id)}`];
      if (shape.kind === "picture") return [shape.lines.length ? `a drawing labelled ${text(el.id)}` : "a drawing"];
      return [text(el.id)];
    }
    const c = scene.connectors[el.id];
    return c ? [`an arrow from ${text(c.fromId)} to ${text(c.toId)}${c.label ? ` labelled ${c.label}` : ""}`] : [];
  });
  const board = parts.length ? `On the board: ${parts.join("; ")}.` : "The board is empty.";
  return [prefix, scene.title, board].filter(Boolean).join(" ");
}

interface NibAt {
  x: number;
  y: number;
  /** True while the nib is laying down a stroke; false when it rests beside the current element. */
  drawing: boolean;
}

/**
 * Where the marker nib sits for this board state: on the tip of whatever is
 * being drawn or written, otherwise resting beside the current element.
 * Pointing at the element being explained is the one tutor "presence" the
 * learning research supports (see research/learning-ux-report.md §4).
 */
function nibPosition(scene: SceneLayout, state: BoardState, paths: ReturnType<typeof buildPaths>, title: number, take: number, reducedMotion?: boolean): NibAt | null {
  if (!reducedMotion) {
    if (title > 0 && title < 1) return { x: TITLE.x + titleWidth(scene.title) * title, y: TITLE.y + 6, drawing: true };

    for (const h of [...state.highlights].reverse()) {
      const shape = scene.shapes[h.target];
      if (shape && h.progress > 0 && h.progress < 1) {
        const p = pointOnPath(highlightPath(shape, h.style, take), h.progress);
        if (p) return { ...p, drawing: true };
      }
    }
    for (const el of [...state.elements].reverse()) {
      if (el.progress <= 0 || el.progress >= 1) continue;
      const shape = scene.shapes[el.id];
      const connector = scene.connectors[el.id];
      if (shape) {
        const { art, text } = phases(shape, !!paths.shapes[el.id], el.progress);
        if (art < 1) {
          const pic = shape.picture;
          const p = pic ? pointOnPath(pic.d, art) : pointOnPath(paths.shapes[el.id], art);
          if (p) return pic ? { x: pic.tx + p.x * pic.scale, y: pic.ty + p.y * pic.scale, drawing: true } : { ...p, drawing: true };
        } else if (text < 1 && shape.lines.length) {
          const t = textLayout(shape);
          const line = Math.min(t.lines.length - 1, Math.floor(text * t.lines.length));
          const within = text * t.lines.length - line;
          return { x: t.cx - t.width / 2 + t.width * within, y: t.top + line * t.lineHeight + 6, drawing: true };
        }
      } else if (connector && paths.connectors[el.id]) {
        const frac = el.progress / 0.8;
        const p = frac < 1 ? pointOnPath(paths.connectors[el.id].line, frac) : connector.to;
        if (p) return { x: p.x, y: p.y, drawing: true };
      }
    }
  }
  const active = state.elements.find((el) => el.active && el.progress > 0);
  if (!active) return null;
  const shape = scene.shapes[active.id];
  if (shape) return { x: shape.x + shape.w + 10, y: shape.y + shape.h - 6, drawing: false };
  const connector = scene.connectors[active.id];
  return connector ? { x: connector.labelAt.x + 24, y: connector.labelAt.y + 24, drawing: false } : null;
}

const titleWidth = (text: string) => Math.min(1440, text.length * TITLE.size * 0.5);

const measured = new Map<string, { el: SVGPathElement; length: number }>();

/** Point at `frac` of a path's length, measured on a detached SVG path (cached per path). */
function pointOnPath(d: string | undefined, frac: number): { x: number; y: number } | null {
  if (!d || typeof document === "undefined") return null;
  let entry = measured.get(d);
  if (!entry) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
    el.setAttribute("d", d);
    entry = { el, length: el.getTotalLength() };
    if (measured.size > 400) measured.clear();
    measured.set(d, entry);
  }
  const p = entry.el.getPointAtLength(clamp01(frac) * entry.length);
  return { x: p.x, y: p.y };
}

/** A felt-tip marker whose tip sits exactly on `at`. Glides between resting spots; follows strokes frame by frame. */
function Nib({ at, animate }: { at: NibAt | null; animate: boolean }) {
  if (!at) return null;
  return (
    <g
      style={{
        transform: `translate(${at.x}px, ${at.y}px)`,
        transition: animate && !at.drawing ? "transform 260ms cubic-bezier(0.2, 0, 0, 1)" : undefined,
      }}
    >
      <g transform="rotate(32)">
        <path d="M0 0 L-8 -20 L8 -20 Z" fill={ink("ink")} />
        <rect x={-13} y={-92} width={26} height={74} rx={6} fill="var(--board)" stroke={ink("ink")} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <rect x={-13} y={-110} width={26} height={22} rx={5} fill={ink("ink")} />
      </g>
    </g>
  );
}

/**
 * Every outline and arrow for one take of the boil. Each shape also gets a thin second pass that
 * doesn't quite agree with the first, the way an outline is pencilled in and then inked over.
 */
function buildPaths(scene: SceneLayout | undefined, take = 0) {
  const shapes: Record<string, string> = {};
  const passes: Record<string, string> = {};
  const connectors: Record<string, { line: string; pass: string; heads: string[] }> = {};
  if (!scene) return { shapes, passes, connectors };
  for (const s of Object.values(scene.shapes)) {
    if (s.kind !== "shape" || s.shape === "none") continue;
    const outline = (seed: string) => {
      if (s.shape === "circle") {
        const c = center(s);
        return sketchEllipse(c.x, c.y, s.w / 2, s.h / 2, seed);
      }
      return sketchRect(s.x, s.y, s.w, s.h, seed, s.shape === "pill" ? s.h / 2 : s.shape === "note" ? 6 : 14);
    };
    shapes[s.id] = outline(seedFor(s.id, take));
    passes[s.id] = outline(seedFor(`${s.id}:pass`, take));
  }
  for (const c of Object.values(scene.connectors)) {
    const heads = c.style === "line" ? [] : [arrowHead(c.from, c.to, seedFor(c.id, take))];
    if (c.style === "double") heads.push(arrowHead(c.to, c.from, seedFor(`${c.id}:b`, take)));
    connectors[c.id] = { line: sketchLine(c.from, c.to, seedFor(c.id, take)), pass: sketchLine(c.from, c.to, seedFor(`${c.id}:pass`, take)), heads };
  }
  return { shapes, passes, connectors };
}

/** Paper: a faint dot grid, a warm vignette at the edges and a coffee ring in one corner. */
function PaperDefs() {
  return (
    <>
      <pattern id="paper-dots" width={48} height={48} patternUnits="userSpaceOnUse">
        <circle cx={24} cy={24} r={1.7} fill={ink("ink")} opacity={0.12} />
      </pattern>
      <radialGradient id="paper-vignette" cx="50%" cy="46%" r="72%">
        <stop offset="62%" stopColor={ink("orange")} stopOpacity={0} />
        <stop offset="100%" stopColor={ink("orange")} stopOpacity={0.09} />
      </radialGradient>
      <radialGradient id="paper-smudge">
        <stop offset="0%" stopColor={ink("ink")} stopOpacity={0.05} />
        <stop offset="100%" stopColor={ink("ink")} stopOpacity={0} />
      </radialGradient>
    </>
  );
}

function Paper() {
  return (
    <g>
      <rect width={BOARD_W} height={BOARD_H} fill="var(--board)" />
      <rect width={BOARD_W} height={BOARD_H} fill="url(#paper-dots)" />
      <ellipse cx={300} cy={930} rx={260} ry={90} fill="url(#paper-smudge)" transform="rotate(-8 300 930)" />
      <ellipse cx={1500} cy={210} rx={220} ry={70} fill="url(#paper-smudge)" transform="rotate(12 1500 210)" />
      <path d={sketchEllipse(1770, 965, 118, 112, "paper:ring")} fill="none" stroke={ink("orange")} strokeWidth={9} opacity={0.06} />
      <path d={sketchEllipse(1764, 970, 104, 99, "paper:ring2")} fill="none" stroke={ink("orange")} strokeWidth={2} opacity={0.07} />
      <rect width={BOARD_W} height={BOARD_H} fill="url(#paper-vignette)" />
    </g>
  );
}

const strokeProps = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
  pathLength: 1,
  strokeDasharray: "1 1",
};

/** Text written left to right as the marker moves across it (revealed through a growing clip). */
function WrittenText({ id, shape, progress }: { id: string; shape: ShapeGeometry; progress: number }) {
  if (progress <= 0 || !shape.lines.length) return null;
  const t = textLayout(shape);
  const isEquation = shape.kind === "write";
  const left = t.cx - t.width / 2 - 24;
  const clipId = `write-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  // Reveal line by line so multi-line labels are written in reading order.
  const lineProgress = progress * t.lines.length;
  return (
    <g>
      {progress < 1 && (
        <clipPath id={clipId}>
          {t.lines.map((_, i) => {
            const p = clamp01(lineProgress - i);
            return p > 0 ? <rect key={i} x={left} y={t.top + i * t.lineHeight - t.fontSize} width={(t.width + 48) * p} height={t.lineHeight + 8} /> : null;
          })}
        </clipPath>
      )}
      <text
        fill={isEquation || shape.kind === "picture" ? ink(shape.tone) : ink("ink")}
        fontSize={shape.fontSize}
        fontWeight={isEquation ? 500 : 700}
        fontFamily={isEquation ? "var(--font-plex-mono), monospace" : undefined}
        textAnchor="middle"
        clipPath={progress < 1 ? `url(#${clipId})` : undefined}
      >
        {t.lines.map((line, i) => (
          <tspan key={i} x={t.cx} y={t.top + i * t.lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function SceneTitle({ text, progress, take }: { text: string; progress: number; take: number }) {
  if (progress <= 0) return null;
  const width = titleWidth(text);
  return (
    <g>
      {progress < 1 && (
        <clipPath id="write-title">
          <rect x={TITLE.x - 10} y={TITLE.y - TITLE.size} width={(width + 40) * progress} height={TITLE.size + 30} />
        </clipPath>
      )}
      <text x={TITLE.x} y={TITLE.y} fontSize={TITLE.size} fontWeight={700} fill={ink("ink")} clipPath={progress < 1 ? "url(#write-title)" : undefined}>
        {text}
      </text>
      {/* A red marker underline marks the title, as in a sketchbook. */}
      <path d={sketchUnderline(TITLE.x, 132, width, seedFor(`title:${text}`, take))} {...strokeProps} strokeDashoffset={1 - clamp01(progress)} stroke={ink("red")} strokeWidth={3} opacity={0.7} />
    </g>
  );
}

type MotionStyle = { animationPlayState: "running" | "paused" } | undefined;

function ShapeView({
  shape,
  path,
  pass,
  progress,
  earlier,
  motion,
  tracing,
  take,
}: {
  shape: ShapeGeometry;
  path?: string;
  /** The thinner second stroke over the outline. */
  pass?: string;
  take: number;
  progress: number;
  earlier: boolean;
  motion: MotionStyle;
  /** A sketch being explained: a dot runs along it, like a pointer tracing the curve. */
  tracing: boolean;
}) {
  const color = ink(shape.tone);
  const { art, text } = phases(shape, !!path, progress);
  const opacity = earlier ? 0.85 : 1;
  // Icons move once fully drawn; the class sits on a wrapper so it doesn't replace the drawing's own transform.
  const moving = motion && art >= 1 && shape.motion && shape.motion !== "trace" ? shape.motion : undefined;
  return (
    <g>
      {path && shape.shape === "note" && art > 0.2 && <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={6} fill={tint(shape.tone)} />}
      {path && <path d={path} {...strokeProps} strokeDashoffset={1 - art} stroke={color} strokeWidth={STROKE} opacity={opacity} />}
      {pass && <path d={pass} {...strokeProps} strokeDashoffset={1 - art} stroke={color} strokeWidth={1.2} opacity={opacity * 0.45} />}
      {shape.picture && art > 0 && (
        <g className={moving ? `board-motion board-${moving}` : undefined} style={moving ? motion : undefined}>
        <g transform={`${tremor(shape, take)} translate(${shape.picture.tx} ${shape.picture.ty}) scale(${shape.picture.scale})`}>
          {/* Stroke width is divided by the scale instead of using non-scaling-stroke, which breaks the
              pathLength-based reveal on scaled multi-part paths (circles drew only halfway). */}
          <path
            d={shape.picture.d}
            {...strokeProps}
            vectorEffect="none"
            strokeDashoffset={1 - art}
            stroke={color}
            strokeWidth={(shape.kind === "picture" ? 3 : STROKE) / shape.picture.scale}
            opacity={opacity}
          />
          {tracing && art >= 1 && shape.motion === "trace" && (
            <circle
              r={9 / shape.picture.scale}
              fill={color}
              className="board-trace"
              style={{ ...motion, offsetPath: `path("${shape.picture.d.split(/(?=M)/)[0]}")` }}
            />
          )}
        </g>
        </g>
      )}
      {/* Labels stay fully opaque even when earlier geometry dims, to keep AA contrast. */}
      <WrittenText id={shape.id} shape={shape} progress={text} />
    </g>
  );
}

function ConnectorView({
  c,
  path,
  progress,
  earlier,
  motion,
}: {
  c: ConnectorGeometry;
  path?: { line: string; pass: string; heads: string[] };
  progress: number;
  earlier: boolean;
  motion: MotionStyle;
}) {
  if (!path) return null;
  const color = ink(c.tone);
  const line = clamp01(progress / 0.8);
  const head = clamp01((progress - 0.75) / 0.25);
  return (
    <g>
      <g stroke={color} opacity={earlier ? 0.85 : 1}>
        <path d={path.line} {...strokeProps} strokeDashoffset={1 - line} strokeWidth={STROKE} />
        <path d={path.pass} {...strokeProps} strokeDashoffset={1 - line} strokeWidth={1.2} opacity={0.45} />
        {path.heads.map((d, i) => (
          <path key={i} d={d} {...strokeProps} strokeDashoffset={1 - head} strokeWidth={STROKE} />
        ))}
        {/* Once drawn, dots flow along the arrow in its direction, so the diagram reads as a process. */}
        {motion && progress >= 1 && c.style !== "line" && (
          <path d={path.line} {...strokeProps} strokeDasharray="0.001 0.07" strokeWidth={7} opacity={0.55} className="board-flow" style={motion} />
        )}
      </g>
      {c.label && head > 0 && (
        <text x={c.labelAt.x} y={c.labelAt.y + 12} fill={color} stroke="var(--board)" strokeWidth={14} paintOrder="stroke" fontSize={46} fontWeight={700} textAnchor="middle" opacity={head}>
          {c.label}
        </text>
      )}
    </g>
  );
}

/** Current element: a tint behind it, swept on left to right like a highlighter, plus a 3px underline. */
function Emphasis({ shape, sweep, take }: { shape: ShapeGeometry; sweep: boolean; take: number }) {
  const pad = 16;
  return (
    <g>
      <rect
        x={shape.x - pad}
        y={shape.y - pad}
        width={shape.w + pad * 2}
        height={shape.h + pad * 2}
        rx={14}
        fill={tint(shape.tone)}
        className={sweep ? "board-sweep" : undefined}
      />
      <path
        d={sketchUnderline(shape.x + shape.w * 0.15, shape.y + shape.h + pad - 4, shape.w * 0.7, seedFor(`cur:${shape.id}`, take))}
        {...strokeProps}
        strokeDashoffset={0}
        stroke={ink(shape.tone)}
        strokeWidth={EMPHASIS_STROKE}
        className={sweep ? "board-underline" : undefined}
      />
    </g>
  );
}

function highlightPath(shape: ShapeGeometry, style: "circle" | "underline", take: number) {
  const c = center(shape);
  return style === "circle"
    ? sketchEllipse(c.x, c.y, shape.w / 2 + 30, shape.h / 2 + 26, seedFor(`hl:${shape.id}`, take))
    : sketchUnderline(shape.x, shape.y + shape.h + 18, shape.w, seedFor(`ul:${shape.id}`, take));
}

/** A drawn picture trembles with the boil: a pixel or two of shift and a fraction of a degree, around its centre. */
function tremor(shape: ShapeGeometry, take: number): string {
  if (!take) return "";
  const r = (n: number) => (((Math.sin((take * 12.9898 + n) * 78.233 + shape.x) * 43758.5453) % 1) + 1) % 1 - 0.5;
  const c = center(shape);
  return `translate(${(r(1) * 3).toFixed(2)} ${(r(2) * 3).toFixed(2)}) rotate(${(r(3) * 0.8).toFixed(2)} ${c.x.toFixed(0)} ${c.y.toFixed(0)})`;
}

/** A marker circle or underline, laid over a soft highlighter band; when it closes, a brief glow. */
function HighlightMark({ shape, style, progress, glow, take }: { shape: ShapeGeometry; style: "circle" | "underline"; progress: number; glow: boolean; take: number }) {
  const d = highlightPath(shape, style, take);
  const color = ink(shape.tone === "ink" ? "red" : shape.tone);
  return (
    <g>
      {glow && progress >= 1 && <path d={d} {...strokeProps} strokeDashoffset={0} stroke={color} strokeWidth={14} filter="url(#board-glow)" className="board-glow" />}
      <path d={d} {...strokeProps} strokeDashoffset={1 - progress} stroke={color} strokeWidth={style === "underline" ? 22 : 12} opacity={0.18} />
      <path d={d} {...strokeProps} strokeDashoffset={1 - progress} stroke={color} strokeWidth={EMPHASIS_STROKE} />
    </g>
  );
}
