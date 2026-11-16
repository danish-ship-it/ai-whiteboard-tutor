"use client";

import { memo, useMemo } from "react";
import { BOARD_H, BOARD_W, center, type ConnectorGeometry, type SceneLayout, type ShapeGeometry } from "@/lib/board/layout";
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
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ink = (tone: string) => `var(--ink-${tone})`;
const tint = (tone: string) => `var(--tint-${tone})`;
/** Rendered stroke width in CSS pixels, independent of board scale (spec §5). */
const STROKE = 2.5;
const EMPHASIS_STROKE = 3;

/**
 * Renders one board state. It owns no timers or animation state: everything
 * visible is derived from `state`, which is derived from media time, so seeking
 * shows the correct final state immediately.
 */
export const Whiteboard = memo(function Whiteboard({ scenes, state, titleProgress, emphasis = [], reducedMotion, description }: Props) {
  const scene = scenes[state.sceneIndex];
  const paths = useMemo(() => buildPaths(scene), [scene]);
  if (!scene) return null;

  const reveal = (n: number) => (reducedMotion ? (n > 0 ? 1 : 0) : n);
  const emphasized = new Set(emphasis.filter((id) => scene.shapes[id]));
  const quiet = state.ended && emphasized.size === 0;

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="block h-full w-full select-none" role="img" aria-labelledby="board-title board-desc">
      <title id="board-title">{`Whiteboard: ${scene.title}`}</title>
      <desc id="board-desc">{description ?? state.caption}</desc>

      <g aria-hidden="true" fontFamily="var(--font-instrument), Arial, sans-serif">
        <SceneTitle text={scene.title} progress={reveal(titleProgress)} />

        {state.elements.map((el) => {
          const shape = scene.shapes[el.id];
          if (!shape) return null;
          const current = !quiet && (emphasized.size ? emphasized.has(el.id) : el.active);
          return current ? <Emphasis key={`em-${el.id}`} shape={shape} /> : null;
        })}

        {state.elements.map((el) => {
          const shape = scene.shapes[el.id];
          const connector = scene.connectors[el.id];
          const earlier = !quiet && (emphasized.size ? !emphasized.has(el.id) : el.dimmed);
          if (shape) return <ShapeView key={el.id} shape={shape} path={paths.shapes[el.id]} progress={reveal(el.progress)} earlier={earlier} />;
          if (connector) return <ConnectorView key={el.id} c={connector} path={paths.connectors[el.id]} progress={reveal(el.progress)} earlier={earlier} />;
          return null;
        })}

        {!quiet &&
          state.highlights.map((h) => {
            const target = scene.shapes[h.target];
            return target ? <HighlightMark key={`hl-${h.target}`} shape={target} style={h.style} progress={reveal(h.progress)} /> : null;
          })}
      </g>
    </svg>
  );
});

function buildPaths(scene: SceneLayout | undefined) {
  const shapes: Record<string, string> = {};
  const connectors: Record<string, { line: string; heads: string[] }> = {};
  if (!scene) return { shapes, connectors };
  for (const s of Object.values(scene.shapes)) {
    if (s.kind === "write" || s.shape === "none") continue;
    if (s.shape === "circle") {
      const c = center(s);
      shapes[s.id] = sketchEllipse(c.x, c.y, s.w / 2, s.h / 2, s.id);
    } else {
      shapes[s.id] = sketchRect(s.x, s.y, s.w, s.h, s.id, s.shape === "pill" ? s.h / 2 : s.shape === "note" ? 6 : 14);
    }
  }
  for (const c of Object.values(scene.connectors)) {
    const heads = c.style === "line" ? [] : [arrowHead(c.from, c.to, c.id)];
    if (c.style === "double") heads.push(arrowHead(c.to, c.from, `${c.id}:b`));
    connectors[c.id] = { line: sketchLine(c.from, c.to, c.id), heads };
  }
  return { shapes, connectors };
}

const strokeProps = {
  fill: "none",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  vectorEffect: "non-scaling-stroke" as const,
  pathLength: 1,
  strokeDasharray: "1 1",
};

/** Labels appear at their cue (spec: no letter-by-letter typing), with a short fade. */
function Label({ shape, visible }: { shape: ShapeGeometry; visible: boolean }) {
  if (!visible) return null;
  const isEquation = shape.kind === "write";
  const lineHeight = shape.fontSize * 1.2;
  const top = shape.y + shape.h / 2 - (shape.lines.length * lineHeight) / 2 + shape.fontSize * 0.86;
  return (
    <text
      fill={isEquation ? ink(shape.tone) : ink("ink")}
      fontSize={shape.fontSize}
      fontWeight={isEquation ? 500 : 600}
      fontFamily={isEquation ? "var(--font-plex-mono), monospace" : undefined}
      textAnchor="middle"
      style={{ animation: "board-label-in 120ms ease-out" }}
    >
      {shape.lines.map((line, i) => (
        <tspan key={i} x={shape.x + shape.w / 2} y={top + i * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function SceneTitle({ text, progress }: { text: string; progress: number }) {
  if (progress <= 0) return null;
  return (
    <g>
      <text x={64} y={104} fontSize={76} fontWeight={600} fill={ink("ink")} style={{ animation: "board-label-in 120ms ease-out" }}>
        {text}
      </text>
      <path d={sketchUnderline(64, 128, Math.min(1440, text.length * 38), `title:${text}`)} {...strokeProps} strokeDashoffset={1 - clamp01(progress)} stroke={ink("ink")} strokeWidth={1.5} opacity={0.3} />
    </g>
  );
}

function ShapeView({ shape, path, progress, earlier }: { shape: ShapeGeometry; path?: string; progress: number; earlier: boolean }) {
  const color = ink(shape.tone);
  const outline = path ? clamp01(progress / 0.7) : 1;
  return (
    <g>
      {path && shape.shape === "note" && outline > 0.2 && <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={6} fill={tint(shape.tone)} />}
      {path && <path d={path} {...strokeProps} strokeDashoffset={1 - outline} stroke={color} strokeWidth={STROKE} opacity={earlier ? 0.85 : 1} />}
      {/* Labels stay fully opaque even when earlier geometry dims, to keep AA contrast. */}
      <Label shape={shape} visible={path ? progress >= 0.45 : progress > 0} />
    </g>
  );
}

function ConnectorView({ c, path, progress, earlier }: { c: ConnectorGeometry; path?: { line: string; heads: string[] }; progress: number; earlier: boolean }) {
  if (!path) return null;
  const color = ink(c.tone);
  const line = clamp01(progress / 0.8);
  const head = clamp01((progress - 0.75) / 0.25);
  return (
    <g>
      <g stroke={color} opacity={earlier ? 0.85 : 1}>
        <path d={path.line} {...strokeProps} strokeDashoffset={1 - line} strokeWidth={STROKE} />
        {path.heads.map((d, i) => (
          <path key={i} d={d} {...strokeProps} strokeDashoffset={1 - head} strokeWidth={STROKE} />
        ))}
      </g>
      {c.label && head > 0 && (
        <text x={c.labelAt.x} y={c.labelAt.y + 12} fill={color} stroke="var(--board)" strokeWidth={14} paintOrder="stroke" fontSize={40} fontWeight={600} textAnchor="middle">
          {c.label}
        </text>
      )}
    </g>
  );
}

/** Current element: a solid tint behind it plus a 3px underline (spec §5; no glow or pulse). */
function Emphasis({ shape }: { shape: ShapeGeometry }) {
  const pad = 16;
  return (
    <g>
      <rect x={shape.x - pad} y={shape.y - pad} width={shape.w + pad * 2} height={shape.h + pad * 2} rx={14} fill={tint(shape.tone)} />
      <path d={sketchUnderline(shape.x + shape.w * 0.15, shape.y + shape.h + pad - 4, shape.w * 0.7, `cur:${shape.id}`)} {...strokeProps} strokeDashoffset={0} stroke={ink(shape.tone)} strokeWidth={EMPHASIS_STROKE} />
    </g>
  );
}

function HighlightMark({ shape, style, progress }: { shape: ShapeGeometry; style: "circle" | "underline"; progress: number }) {
  const c = center(shape);
  const d =
    style === "circle"
      ? sketchEllipse(c.x, c.y, shape.w / 2 + 30, shape.h / 2 + 26, `hl:${shape.id}`)
      : sketchUnderline(shape.x, shape.y + shape.h + 18, shape.w, `ul:${shape.id}`);
  return <path d={d} {...strokeProps} strokeDashoffset={1 - progress} stroke={ink(shape.tone === "ink" ? "red" : shape.tone)} strokeWidth={EMPHASIS_STROKE} />;
}
