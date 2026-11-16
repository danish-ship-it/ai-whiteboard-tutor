import type { Point } from "./layout";

/**
 * Hand-drawn SVG paths. Jitter is derived from a seeded PRNG keyed on the
 * element id, so a shape looks identical every time it is rendered, including
 * after seeking. Paths are drawn as a single stroke so they can be revealed
 * with `pathLength` + `stroke-dashoffset`.
 */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

const f = (n: number) => n.toFixed(1);

/** A wobbly line from a to b, as an SVG path fragment continuing the current path. */
function wobble(a: Point, b: Point, rand: () => number, amp: number): string {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const nx = -(b.y - a.y) / (len || 1);
  const ny = (b.x - a.x) / (len || 1);
  const bend = (rand() - 0.5) * amp * Math.min(1, len / 200);
  const c1 = { x: a.x + (b.x - a.x) * 0.35 + nx * bend, y: a.y + (b.y - a.y) * 0.35 + ny * bend };
  const c2 = { x: a.x + (b.x - a.x) * 0.7 + nx * bend * 0.6, y: a.y + (b.y - a.y) * 0.7 + ny * bend * 0.6 };
  return `C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(b.x)},${f(b.y)}`;
}

export function sketchRect(x: number, y: number, w: number, h: number, seed: string, radius = 0): string {
  const rand = rng(seed);
  const j = () => (rand() - 0.5) * 4; // spec: ≤2.5 units displacement
  if (radius > 0) {
    const r = Math.min(radius, h / 2, w / 2);
    // Rounded (pill) outline: four sides with quarter-turn corners, slightly jittered.
    const p = [
      `M${f(x + r + j())},${f(y + j())}`,
      wobble({ x: x + r, y }, { x: x + w - r, y: y + j() }, rand, 4),
      `Q${f(x + w + j())},${f(y)} ${f(x + w + j())},${f(y + r)}`,
      wobble({ x: x + w, y: y + r }, { x: x + w + j(), y: y + h - r }, rand, 4),
      `Q${f(x + w)},${f(y + h + j())} ${f(x + w - r)},${f(y + h + j())}`,
      wobble({ x: x + w - r, y: y + h }, { x: x + r, y: y + h + j() }, rand, 4),
      `Q${f(x + j())},${f(y + h)} ${f(x + j())},${f(y + h - r)}`,
      wobble({ x, y: y + h - r }, { x: x + j(), y: y + r + 4 }, rand, 4),
      `Q${f(x)},${f(y + j())} ${f(x + r + 8)},${f(y + j() - 2)}`,
    ];
    return p.join(" ");
  }
  const corners: Point[] = [
    { x: x + j(), y: y + j() },
    { x: x + w + j(), y: y + j() },
    { x: x + w + j(), y: y + h + j() },
    { x: x + j(), y: y + h + j() },
  ];
    let d = `M${f(corners[0].x)},${f(corners[0].y)}`;
  for (let i = 1; i <= 4; i++) d += " " + wobble(corners[i - 1], corners[i % 4], rand, 4);
  return d + " Z";
}

/** A slightly open, overlapping ellipse, like a marker circle drawn in one motion. */
export function sketchEllipse(cx: number, cy: number, rx: number, ry: number, seed: string): string {
  const rand = rng(seed);
  const start = rand() * Math.PI * 2;
  const steps = 28;
  const sweep = Math.PI * 2;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = start + (sweep * i) / steps;
    const wob = 1 + (rand() - 0.5) * 0.015;
    const x = cx + Math.cos(a) * rx * wob;
    const y = cy + Math.sin(a) * ry * wob;
    d += i === 0 ? `M${f(x)},${f(y)}` : ` L${f(x)},${f(y)}`;
  }
  return d;
}

export function sketchLine(a: Point, b: Point, seed: string): string {
  return `M${f(a.x)},${f(a.y)} ${wobble(a, b, rng(seed), 4)}`;
}

/** Arrow head at `tip`, pointing away from `from`. */
export function arrowHead(from: Point, tip: Point, seed: string, size = 26): string {
  const rand = rng(seed + ":head");
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const spread = 0.45 + (rand() - 0.5) * 0.1;
  const left = { x: tip.x - size * Math.cos(angle - spread), y: tip.y - size * Math.sin(angle - spread) };
  const right = { x: tip.x - size * Math.cos(angle + spread), y: tip.y - size * Math.sin(angle + spread) };
  return `M${f(left.x)},${f(left.y)} L${f(tip.x)},${f(tip.y)} L${f(right.x)},${f(right.y)}`;
}

/** A loose underline beneath a box. */
export function sketchUnderline(x: number, y: number, w: number, seed: string): string {
  const rand = rng(seed);
  const a = { x: x - 6, y: y + (rand() - 0.5) * 4 };
  const b = { x: x + w + 6, y: y + (rand() - 0.5) * 4 - 3 };
  return `M${f(a.x)},${f(a.y)} ${wobble(a, b, rand, 3)}`;
}
