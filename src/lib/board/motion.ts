import { BOARD_H, BOARD_W, type Box, type SceneLayout } from "./layout";
import type { BoardState } from "@/lib/timeline/timeline";

/**
 * Board motion. Everything here is derived from the board state (itself derived from media time),
 * so seeking lands on the right camera and the right moving parts.
 */

export { iconMotion, type Motion } from "./icon-motion";

/** The camera as a transform of the whole board: screen = scale * point + (x, y), with x and y as fractions of the board. */
export interface Camera {
  scale: number;
  x: number;
  y: number;
}

export const WIDE: Camera = { scale: 1, x: 0, y: 0 };
const MAX_ZOOM = 1.25;
/** How far the camera leans toward the focus (1 = centred on it). Less than 1 keeps the neighbours in view. */
const LEAN = 0.6;

const union = (boxes: Box[]): Box | null => {
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

/** What the camera looks at: the follow-up answer's elements, the stroke being drawn, or the element being explained. */
function focusBox(scene: SceneLayout, state: BoardState, emphasis: string[]): Box | null {
  const boxOf = (id: string): Box | null => {
    if (scene.shapes[id]) return scene.shapes[id];
    const c = scene.connectors[id];
    return c ? union([scene.shapes[c.fromId], scene.shapes[c.toId]].filter(Boolean)) : null;
  };
  if (emphasis.length) return union(emphasis.map(boxOf).filter((b): b is Box => !!b));
  const drawing = [...state.highlights].reverse().find((h) => h.progress > 0 && h.progress < 1);
  if (drawing) return boxOf(drawing.target);
  const inProgress = [...state.elements].reverse().find((e) => e.progress > 0 && e.progress < 1);
  if (inProgress) return boxOf(inProgress.id);
  const active = state.elements.find((e) => e.active && e.progress > 0);
  return active ? boxOf(active.id) : null;
}

/**
 * A slow documentary camera: it leans in on what is being drawn or explained, and pulls back to
 * the whole board while the title is written, between steps and at the end.
 */
export function boardCamera(
  scene: SceneLayout | undefined,
  state: BoardState,
  { emphasis = [], titleProgress = 1, reducedMotion = false }: { emphasis?: string[]; titleProgress?: number; reducedMotion?: boolean },
): Camera {
  if (!scene || reducedMotion || titleProgress < 1 || (state.ended && !emphasis.length)) return WIDE;
  const box = focusBox(scene, state, emphasis);
  if (!box) return WIDE;
  const scale = Math.max(1, Math.min(MAX_ZOOM, (BOARD_W * 0.6) / box.w, (BOARD_H * 0.6) / box.h));
  if (scale <= 1.02) return WIDE;
  const halfW = BOARD_W / (2 * scale);
  const halfH = BOARD_H / (2 * scale);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const fx = clamp(BOARD_W / 2 + (box.x + box.w / 2 - BOARD_W / 2) * LEAN, halfW, BOARD_W - halfW);
  const fy = clamp(BOARD_H / 2 + (box.y + box.h / 2 - BOARD_H / 2) * LEAN, halfH, BOARD_H - halfH);
  // Round so tiny changes don't restart the CSS transition every frame.
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return { scale: round(scale), x: round((BOARD_W / 2 - scale * fx) / BOARD_W), y: round((BOARD_H / 2 - scale * fy) / BOARD_H) };
}

/** The same camera move for the SVG board (user units) and for HTML laid over it (percent of the board). */
export const cameraSvgTransform = (c: Camera) => `translate(${c.x * BOARD_W}px, ${c.y * BOARD_H}px) scale(${c.scale})`;
export const cameraCssTransform = (c: Camera) => `translate(${c.x * 100}%, ${c.y * 100}%) scale(${c.scale})`;
export const CAMERA_TRANSITION = "transform 1100ms cubic-bezier(0.4, 0, 0.2, 1)";

/**
 * A closed-form spring from 0 to 1 (underdamped, so it overshoots a little and settles).
 * Being a pure function of time, a frame renders the same however it was reached.
 */
export function spring(t: number, { frequency = 1.6, damping = 0.55 } = {}): number {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * frequency;
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

/** Eases a camera toward a target, the way the CSS transition does on the live board. */
export function followCamera(from: Camera, to: Camera, dt: number, seconds = 0.45): Camera {
  const k = 1 - Math.exp(-dt / seconds);
  return { scale: from.scale + (to.scale - from.scale) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}
