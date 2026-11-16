import { GRID_COLS, GRID_ROWS, type Lesson, type Tone } from "../lesson/schema";

export const BOARD_W = 1600;
export const BOARD_H = 900;

const GRID = { x: 64, y: 150, w: 1472, h: 700 };
const CELL_W = GRID.w / GRID_COLS;
const CELL_H = GRID.h / GRID_ROWS;
const INSET = 14;
const MIN_FONT = 40;

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapeGeometry extends Box {
  id: string;
  kind: "shape" | "write";
  shape: "box" | "circle" | "pill" | "note" | "none";
  lines: string[];
  fontSize: number;
  tone: Tone;
}

export interface ConnectorGeometry {
  id: string;
  /** Ids of the shapes this connector joins. */
  fromId: string;
  toId: string;
  from: Point;
  to: Point;
  label: string;
  labelAt: Point;
  style: "arrow" | "line" | "double";
  tone: Tone;
}

export interface SceneLayout {
  sceneId: string;
  title: string;
  shapes: Record<string, ShapeGeometry>;
  connectors: Record<string, ConnectorGeometry>;
}

interface Cells {
  col: number;
  row: number;
  w: number;
  h: number;
}

const cellsToBox = (c: Cells): Box => ({
  x: GRID.x + c.col * CELL_W + INSET,
  y: GRID.y + c.row * CELL_H + INSET,
  w: c.w * CELL_W - INSET * 2,
  h: c.h * CELL_H - INSET * 2,
});

/** Deterministic, model-independent geometry for every scene of a lesson. */
export function layoutLesson(lesson: Lesson): SceneLayout[] {
  return lesson.scenes.map((scene) => {
    const occupied = new Set<string>();
    const shapes: Record<string, ShapeGeometry> = {};
    const connectors: Record<string, ConnectorGeometry> = {};

    for (const action of scene.beats.flatMap((b) => b.actions)) {
      if (action.kind === "add" || action.kind === "write") {
        const cells = placeWithoutOverlap({ col: action.col, row: action.row, w: action.w, h: action.h }, occupied);
        markCells(cells, occupied);
        const box = cellsToBox(cells);
        const shape = action.kind === "add" ? action.shape : "none";
        const text = action.kind === "add" ? action.label : action.text;
        const pad = shape === "none" ? 4 : shape === "circle" ? box.w * 0.16 : 18;
        const { lines, fontSize } = fitText(text, box.w - pad * 2, box.h - pad, action.kind === "write" ? 64 : 56);
        shapes[action.id] = { id: action.id, kind: action.kind === "add" ? "shape" : "write", shape, ...box, lines, fontSize, tone: action.tone };
      } else if (action.kind === "connect") {
        const a = shapes[action.from];
        const b = shapes[action.to];
        if (!a || !b) continue;
        const from = edgePoint(a, center(b));
        const to = edgePoint(b, center(a));
        connectors[action.id] = {
          id: action.id,
          fromId: action.from,
          toId: action.to,
          from,
          to,
          label: action.label,
          labelAt: labelPoint(from, to),
          style: action.style,
          tone: action.tone,
        };
      }
    }
    return { sceneId: scene.id, title: scene.title, shapes, connectors };
  });
}

const key = (col: number, row: number) => `${col},${row}`;

function fits(c: Cells, occupied: Set<string>): boolean {
  if (c.col < 0 || c.row < 0 || c.col + c.w > GRID_COLS || c.row + c.h > GRID_ROWS) return false;
  for (let x = c.col; x < c.col + c.w; x++) for (let y = c.row; y < c.row + c.h; y++) if (occupied.has(key(x, y))) return false;
  return true;
}

function markCells(c: Cells, occupied: Set<string>) {
  for (let x = c.col; x < c.col + c.w; x++) for (let y = c.row; y < c.row + c.h; y++) occupied.add(key(x, y));
}

/** Keeps the requested cells if free; otherwise the nearest free spot, shrinking only as a last resort. */
export function placeWithoutOverlap(wanted: Cells, occupied: Set<string>): Cells {
  if (fits(wanted, occupied)) return wanted;
  const sizes: Array<[number, number]> = [
    [wanted.w, wanted.h],
    [Math.max(1, wanted.w - 1), wanted.h],
    [wanted.w, Math.max(1, wanted.h - 1)],
    [1, 1],
  ];
  for (const [w, h] of sizes) {
    let best: Cells | null = null;
    let bestDist = Infinity;
    for (let col = 0; col <= GRID_COLS - w; col++) {
      for (let row = 0; row <= GRID_ROWS - h; row++) {
        const c = { col, row, w, h };
        const dist = Math.abs(col - wanted.col) + Math.abs(row - wanted.row) * 1.5;
        if (dist < bestDist && fits(c, occupied)) {
          best = c;
          bestDist = dist;
        }
      }
    }
    if (best) return best;
  }
  return wanted;
}

/** Word-wraps `text` into the box, shrinking the font until it fits (or reaches the minimum). */
export function fitText(text: string, maxW: number, maxH: number, startSize: number): { lines: string[]; fontSize: number } {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = startSize; size >= MIN_FONT; size -= 2) {
    const charW = size * 0.5;
    const maxChars = Math.max(1, Math.floor(maxW / charW));
    const lines = wrap(words, maxChars);
    const longest = Math.max(...lines.map((l) => l.length));
    if (lines.length * size * 1.2 <= maxH && longest <= maxChars) return { lines, fontSize: size };
  }
  const charW = MIN_FONT * 0.5;
  return { lines: wrap(words, Math.max(1, Math.floor(maxW / charW))), fontSize: MIN_FONT };
}

function wrap(words: string[], maxChars: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= maxChars) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** Where the line from the shape's centre towards `toward` leaves the shape outline. */
export function edgePoint(s: ShapeGeometry, toward: Point): Point {
  const c = center(s);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return c;
  const gap = 8;
  if (s.shape === "circle") {
    const rx = s.w / 2 + gap;
    const ry = s.h / 2 + gap;
    const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return { x: c.x + dx * t, y: c.y + dy * t };
  }
  const hw = s.w / 2 + gap;
  const hh = s.h / 2 + gap;
  const t = Math.min(dx !== 0 ? hw / Math.abs(dx) : Infinity, dy !== 0 ? hh / Math.abs(dy) : Infinity);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

function labelPoint(a: Point, b: Point): Point {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  // Offset perpendicular to the line, always towards the top of the board.
  let nx = -(b.y - a.y) / len;
  let ny = (b.x - a.x) / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: mx + nx * 26, y: my + ny * 26 };
}
