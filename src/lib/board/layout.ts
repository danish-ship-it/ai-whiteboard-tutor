import { GRID_COLS, GRID_ROWS, parsePoints, type Lesson, type SketchAction, type Tone } from "../lesson/schema";
import { ICONS, type IconName } from "./icons";
import { iconMotion, type Motion } from "./icon-motion";
import { graphGeometry, parseGraph, type GraphGeometry } from "./graph";

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

/** A drawing (icon or freehand sketch) as one path, placed with translate + uniform scale. */
export interface Picture {
  d: string;
  tx: number;
  ty: number;
  scale: number;
}

export interface ShapeGeometry extends Box {
  id: string;
  kind: "shape" | "write" | "picture";
  /** Pictures only: the drawing, and the band under it where the caption is written. */
  picture?: Picture;
  /** Graphs only: exact axes, curves and points in board units (see graph.ts). */
  graph?: GraphGeometry;
  /** Pictures only: how the drawing keeps moving once drawn (see motion.ts). */
  motion?: Motion;
  textBox?: Box;
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
  /** Where the step's AI picture is pinned, when the lesson has pictures. Drawings are kept out of it. */
  photo?: Box;
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

/** Top-right corner of the grid (3 x 2 cells, about a quarter of the board) for the step's picture. */
const PHOTO_CELLS: Cells = { col: GRID_COLS - 3, row: 0, w: 3, h: 2 };

/**
 * Deterministic, model-independent geometry for every scene of a lesson.
 * With `photo`, each scene keeps the top-right corner free for its AI picture.
 */
export function layoutLesson(lesson: Lesson, { photo = false }: { photo?: boolean } = {}): SceneLayout[] {
  return lesson.scenes.map((scene) => {
    const occupied = new Set<string>();
    if (photo) markCells(PHOTO_CELLS, occupied);
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
      } else if (action.kind === "icon" || action.kind === "sketch") {
        const cells = placeWithoutOverlap({ col: action.col, row: action.row, w: action.w, h: action.h }, occupied);
        markCells(cells, occupied);
        const box = cellsToBox(cells);
        const band = action.label ? Math.min(76, box.h * 0.3) : 0;
        const art: Box = { x: box.x, y: box.y, w: box.w, h: box.h - band };
        const textBox: Box = { x: box.x - 20, y: box.y + box.h - band, w: box.w + 40, h: band };
        const { lines, fontSize } = action.label ? fitText(action.label, textBox.w, band, 44) : { lines: [], fontSize: 44 };
        const picture = action.kind === "icon" ? placeIcon(ICONS[action.icon as IconName] ?? ICONS["circle-dot"], art) : sketchPicture(action, art);
        const motion = action.kind === "icon" ? iconMotion(action.icon) : "trace";
        shapes[action.id] = { id: action.id, kind: "picture", shape: "none", ...box, lines, fontSize, tone: action.tone, picture, textBox, motion };
      } else if (action.kind === "graph") {
        const cells = placeWithoutOverlap({ col: action.col, row: action.row, w: action.w, h: action.h }, occupied);
        markCells(cells, occupied);
        const box = cellsToBox(cells);
        const band = action.label ? Math.min(64, box.h * 0.18) : 0;
        const art: Box = { x: box.x, y: box.y, w: box.w, h: box.h - band };
        const textBox: Box = { x: box.x, y: box.y + box.h - band, w: box.w, h: band };
        const { lines, fontSize } = action.label ? fitText(action.label, textBox.w, band, 40) : { lines: [], fontSize: 40 };
        const graph = graphGeometry(parseGraph(action.spec), art);
        shapes[action.id] = { id: action.id, kind: "picture", shape: "none", ...box, lines, fontSize, tone: action.tone, graph, textBox };
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
    return { sceneId: scene.id, title: scene.title, shapes, connectors, ...(photo && { photo: cellsToBox(PHOTO_CELLS) }) };
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
/** Centres a 24x24 icon in the art box, as large as fits. */
function placeIcon(d: string, art: Box): Picture {
  const size = Math.min(art.w, art.h) * 1.05; // Lucide icons carry their own 2px margin
  return { d, scale: size / 24, tx: art.x + (art.w - size) / 2, ty: art.y + (art.h - size) / 2 };
}

/** Maps sketch points (0-100 in the element's box) onto the board; smooth sketches become Catmull-Rom curves. */
export function sketchPicture(action: Pick<SketchAction, "points" | "closed" | "smooth">, art: Box): Picture {
  const pad = 10;
  const pts = parsePoints(action.points).map((p) => ({ x: art.x + pad + (p.x / 100) * (art.w - pad * 2), y: art.y + pad + (p.y / 100) * (art.h - pad * 2) }));
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  if (!action.smooth || pts.length < 3) {
    for (const p of pts.slice(1)) d += ` L${f(p.x)} ${f(p.y)}`;
    return { d: action.closed ? `${d} Z` : d, tx: 0, ty: 0, scale: 1 };
  }
  const ring = action.closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < ring.length - 2; i++) {
    const [p0, p1, p2, p3] = [ring[i - 1], ring[i], ring[i + 1], ring[i + 2]];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return { d, tx: 0, ty: 0, scale: 1 };
}

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
