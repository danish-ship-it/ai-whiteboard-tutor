import type { Box, Point } from "./layout";

/**
 * Cartesian graphs drawn exactly. The model describes a graph in a short spec; this module parses
 * it, evaluates the functions with a small safe parser (never `eval`), picks the axes' ranges and
 * tick steps, and returns geometry in board units. Axes, curves and points share one coordinate
 * system, so a point named in the narration sits exactly on its curve.
 *
 * Spec: items separated by ";" or new lines, for example
 *   "y = x^2 - 2x; (1,-1) vertex; (0,0); (2,0); x -2..4; y -2..8; xlabel time (s); ylabel height (m)"
 *
 *   y = <expression in x>      a function (also "f(x) = ..."); ^ powers, implicit 2x, sin cos tan sqrt abs ln log exp, pi, e
 *   x = <number>               a vertical line
 *   (a,b) [label]              a point with its coordinates (or the label) written beside it
 *   (a,b) to (c,d) [label]     a straight segment between two points
 *   x <min>..<max>             the x range (optional; otherwise chosen from the content)
 *   y <min>..<max>             the y range (optional)
 *   xlabel <text>, ylabel <text>   axis names (default x and y)
 */

export type Expr = (x: number) => number;

export interface GraphSpec {
  functions: { expr: Expr; text: string }[];
  verticals: number[];
  points: { x: number; y: number; label: string }[];
  segments: { a: Point; b: Point; label: string }[];
  xRange?: [number, number];
  yRange?: [number, number];
  xLabel: string;
  yLabel: string;
}

const NUM = String.raw`-?\d+(?:\.\d+)?`;
const LIMITS = { functions: 4, points: 8, segments: 6, verticals: 3, spec: 500 };

/* ---------- expressions ---------- */

const FUNCTIONS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
};
const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

type Token = { kind: "num"; value: number } | { kind: "id"; value: string } | { kind: "op"; value: string };

/** Splits an expression into tokens; an empty list means it has a character we don't read. */
function tokenize(text: string): Token[] {
  const src = text
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/π/g, "pi")
    .toLowerCase();
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " ") i++;
    else if (/[\d.]/.test(c)) {
      const m = /^\d*\.?\d+(?:e[+-]?\d+)?/.exec(src.slice(i)) ?? /^\d+\.?/.exec(src.slice(i));
      if (!m) return [];
      tokens.push({ kind: "num", value: Number(m[0]) });
      i += m[0].length;
    } else if (/[a-z]/.test(c)) {
      // Known names first, so "xsin" doesn't swallow a function; a lone letter is a variable.
      const rest = src.slice(i);
      const name = [...Object.keys(FUNCTIONS), ...Object.keys(CONSTANTS)].sort((a, b) => b.length - a.length).find((n) => rest.startsWith(n));
      const value = name ?? c;
      tokens.push({ kind: "id", value });
      i += value.length;
    } else if ("+-*/^()".includes(c)) {
      tokens.push({ kind: "op", value: c });
      i++;
    } else return [];
  }
  return tokens;
}

/** Compiles an expression in x. Returns null for anything it can't read (unknown names, bad syntax). */
export function compileExpr(text: string): Expr | null {
  const tokens = tokenize(text);
  if (!tokens.length) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (t: Token | undefined, v: string) => t?.kind === "op" && t.value === v;
  const startsPrimary = (t: Token | undefined) => !!t && (t.kind === "num" || t.kind === "id" || isOp(t, "("));

  function expr(): Expr {
    let left = term();
    while (isOp(peek(), "+") || isOp(peek(), "-")) {
      const op = (tokens[pos++] as { value: string }).value;
      const l = left;
      const r = term();
      left = op === "+" ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  }
  function term(): Expr {
    let left = unary();
    for (;;) {
      if (isOp(peek(), "*") || isOp(peek(), "/")) {
        const op = (tokens[pos++] as { value: string }).value;
        const l = left;
        const r = unary();
        left = op === "*" ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
      } else if (startsPrimary(peek())) {
        // Implicit multiplication: 2x, 3(x+1), x sin(x).
        const l = left;
        const r = power();
        left = (x) => l(x) * r(x);
      } else return left;
    }
  }
  function unary(): Expr {
    if (isOp(peek(), "-")) {
      pos++;
      const v = unary();
      return (x) => -v(x);
    }
    if (isOp(peek(), "+")) {
      pos++;
      return unary();
    }
    return power();
  }
  function power(): Expr {
    const base = primary();
    if (isOp(peek(), "^")) {
      pos++;
      const exp = unary();
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  }
  function primary(): Expr {
    const t = tokens[pos++];
    if (!t) throw new Error("end");
    if (t.kind === "num") return () => t.value;
    if (isOp(t, "(")) {
      const inner = expr();
      if (!isOp(tokens[pos++], ")")) throw new Error(")");
      return inner;
    }
    if (t.kind === "id") {
      if (t.value === "x") return (x) => x;
      if (t.value in CONSTANTS) return () => CONSTANTS[t.value];
      const fn = FUNCTIONS[t.value];
      if (fn) {
        const arg = isOp(peek(), "(") ? primary() : power();
        return (x) => fn(arg(x));
      }
    }
    throw new Error("token");
  }

  try {
    const f = expr();
    if (pos !== tokens.length) return null;
    return f;
  } catch {
    return null;
  }
}

/* ---------- spec ---------- */

/** Writes powers the way a teacher would: x^2 → x². */
export const prettyMath = (s: string) =>
  s
    .replace(/\^2(?![\d.])/g, "²")
    .replace(/\^3(?![\d.])/g, "³")
    .replace(/\*/g, "·")
    .replace(/\s+/g, " ")
    .trim();

export function parseGraph(spec: string): GraphSpec {
  const g: GraphSpec = { functions: [], verticals: [], points: [], segments: [], xLabel: "x", yLabel: "y" };
  const point = new RegExp(String.raw`^\(\s*(${NUM})\s*,\s*(${NUM})\s*\)`);
  for (const raw of spec.slice(0, LIMITS.spec).replace(/^\s*graph\b:?/i, "").split(/[;\n]/)) {
    const item = raw.trim();
    if (!item) continue;
    let m: RegExpExecArray | null;
    if ((m = new RegExp(String.raw`^([xy])\s*[:=]?\s*(${NUM})\s*(?:\.\.|to)\s*(${NUM})$`, "i").exec(item))) {
      const lo = Number(m[2]);
      const hi = Number(m[3]);
      if (hi > lo) g[m[1].toLowerCase() === "x" ? "xRange" : "yRange"] = [lo, hi];
    } else if ((m = /^([xy])\s*label\s*[:=]?\s*(.+)$/i.exec(item))) {
      g[m[1].toLowerCase() === "x" ? "xLabel" : "yLabel"] = m[2].trim().slice(0, 24);
    } else if ((m = new RegExp(String.raw`^x\s*=\s*(${NUM})$`, "i").exec(item))) {
      if (g.verticals.length < LIMITS.verticals) g.verticals.push(Number(m[1]));
    } else if ((m = /^(y|[a-z]\s*\(\s*x\s*\))\s*=\s*(.+)$/i.exec(item))) {
      const expr = compileExpr(m[2]);
      if (expr && g.functions.length < LIMITS.functions) g.functions.push({ expr, text: prettyMath(`${m[1].replace(/\s+/g, "")} = ${m[2]}`) });
    } else if ((m = point.exec(item))) {
      const a = { x: Number(m[1]), y: Number(m[2]) };
      const rest = item.slice(m[0].length).trim();
      const to = new RegExp(String.raw`^(?:to|->|–|-)\s*\(\s*(${NUM})\s*,\s*(${NUM})\s*\)\s*(.*)$`, "i").exec(rest);
      if (to) {
        if (g.segments.length < LIMITS.segments) g.segments.push({ a, b: { x: Number(to[1]), y: Number(to[2]) }, label: to[3].trim().slice(0, 24) });
      } else if (g.points.length < LIMITS.points) {
        g.points.push({ ...a, label: rest.slice(0, 24) });
      }
    }
  }
  return g;
}

export const graphHasContent = (g: GraphSpec) => g.functions.length + g.points.length + g.segments.length + g.verticals.length > 0;

/* ---------- ranges and ticks ---------- */

/** A tick step of 1, 2, 2.5 or 5 times a power of ten, giving about `target` intervals. */
export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

function niceRange(lo: number, hi: number, target: number): [number, number, number] {
  if (!(hi > lo)) [lo, hi] = [lo - 1, hi + 1];
  const step = niceStep(hi - lo, target);
  return [Math.floor(lo / step + 1e-9) * step, Math.ceil(hi / step - 1e-9) * step, step];
}

/** Rounds away float noise, so ticks read 0.3, not 0.30000000000000004. */
export const fmt = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r).replace("-", "−");
};

function chooseRanges(g: GraphSpec, ticksX: number, ticksY: number) {
  const xs = [...g.points.map((p) => p.x), ...g.segments.flatMap((s) => [s.a.x, s.b.x]), ...g.verticals];
  let xLo: number;
  let xHi: number;
  if (g.xRange) [xLo, xHi] = g.xRange;
  else if (xs.length) {
    xLo = Math.min(0, ...xs);
    xHi = Math.max(0, ...xs);
    const pad = Math.max(1, (xHi - xLo) * 0.2);
    xLo = xLo < 0 ? xLo - pad : xLo;
    xHi += pad;
  } else [xLo, xHi] = [-5, 5];
  const [x0, x1, xStep] = g.xRange ? [xLo, xHi, niceStep(xHi - xLo, ticksX)] : niceRange(xLo, xHi, ticksX);

  let y0: number;
  let y1: number;
  let yStep: number;
  if (g.yRange) [y0, y1, yStep] = [g.yRange[0], g.yRange[1], niceStep(g.yRange[1] - g.yRange[0], ticksY)];
  else {
    const ys = [...g.points.map((p) => p.y), ...g.segments.flatMap((s) => [s.a.y, s.b.y])];
    const sampled: number[] = [];
    for (const f of g.functions)
      for (let i = 0; i <= 200; i++) {
        const v = f.expr(x0 + ((x1 - x0) * i) / 200);
        if (Number.isFinite(v)) sampled.push(v);
      }
    // Asymptotes (1/x, tan x) would flatten everything else, so the extreme 4% of samples are ignored.
    sampled.sort((a, b) => a - b);
    const cut = Math.floor(sampled.length * 0.04);
    const kept = sampled.length > 50 ? sampled.slice(cut, sampled.length - cut) : sampled;
    const all = [...ys, ...kept];
    let lo = all.length ? Math.min(...all) : -5;
    let hi = all.length ? Math.max(...all) : 5;
    // Keep the x axis in view when the content sits near it.
    if (lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
    if (hi < 0 && -hi < (hi - lo) * 0.6) hi = 0;
    const pad = (hi - lo || 2) * 0.08;
    [y0, y1, yStep] = niceRange(lo - (lo === 0 ? 0 : pad), hi + (hi === 0 ? 0 : pad), ticksY);
  }
  return { x0, x1, xStep, y0, y1, yStep };
}

/* ---------- geometry ---------- */

export interface GraphText {
  x: number;
  y: number;
  text: string;
  anchor: "start" | "middle" | "end";
}

export interface GraphCurve {
  d: string;
  /** Where along the board the curve runs, with the maths coordinates, for the tip readout. */
  samples: { x: number; y: number; mx: number; my: number }[];
  label?: GraphText;
  /** 0 for the element's own ink, then the next inks in turn, so two curves can be told apart. */
  ink: number;
  /** Straight lines (segments, verticals) are drawn without the tip readout. */
  straight: boolean;
}

export interface GraphPoint {
  x: number;
  y: number;
  label: GraphText;
  /** Dashed drop lines from the point to both axes, so its coordinates are read off the grid. */
  guides: string;
}

export interface GraphGeometry {
  frame: Box;
  grid: string;
  axes: string;
  ticks: GraphText[];
  axisNames: GraphText[];
  curves: GraphCurve[];
  points: GraphPoint[];
}

const f1 = (n: number) => n.toFixed(1);

export function graphGeometry(g: GraphSpec, art: Box): GraphGeometry {
  // Room for tick numbers on the left and below, and for the axis arrows.
  const frame: Box = { x: art.x + 64, y: art.y + 18, w: art.w - 64 - 30, h: art.h - 18 - 46 };
  const { x0, x1, xStep, y0, y1, yStep } = chooseRanges(g, Math.max(3, Math.round(frame.w / 120)), Math.max(2, Math.round(frame.h / 80)));
  const sx = (x: number) => frame.x + ((x - x0) / (x1 - x0)) * frame.w;
  const sy = (y: number) => frame.y + frame.h - ((y - y0) / (y1 - y0)) * frame.h;
  const inY = (y: number) => y >= y0 - 1e-9 && y <= y1 + 1e-9;

  let grid = "";
  const ticks: GraphText[] = [];
  // The axes cross at the origin when it's in view, otherwise they sit on the frame's edge.
  const axisX = x0 <= 0 && x1 >= 0 ? sx(0) : frame.x;
  const axisY = y0 <= 0 && y1 >= 0 ? sy(0) : frame.y + frame.h;
  for (let v = Math.ceil(x0 / xStep - 1e-9) * xStep; v <= x1 + 1e-9; v += xStep) {
    const px = sx(v);
    grid += `M${f1(px)} ${f1(frame.y)} V${f1(frame.y + frame.h)} `;
    if (Math.abs(v) > 1e-9 || axisX !== sx(0)) ticks.push({ x: px, y: axisY + 34, text: fmt(v), anchor: "middle" });
  }
  for (let v = Math.ceil(y0 / yStep - 1e-9) * yStep; v <= y1 + 1e-9; v += yStep) {
    const py = sy(v);
    grid += `M${f1(frame.x)} ${f1(py)} H${f1(frame.x + frame.w)} `;
    if (Math.abs(v) > 1e-9 || axisY !== sy(0)) ticks.push({ x: axisX - 12, y: py + 9, text: fmt(v), anchor: "end" });
  }
  if (axisX === sx(0) && axisY === sy(0)) ticks.push({ x: axisX - 12, y: axisY + 34, text: "0", anchor: "end" });

  const right = frame.x + frame.w + 22;
  const top = frame.y - 14;
  const axes =
    `M${f1(frame.x)} ${f1(axisY)} H${f1(right)} M${f1(right - 14)} ${f1(axisY - 8)} L${f1(right)} ${f1(axisY)} L${f1(right - 14)} ${f1(axisY + 8)} ` +
    `M${f1(axisX)} ${f1(frame.y + frame.h)} V${f1(top)} M${f1(axisX - 8)} ${f1(top + 14)} L${f1(axisX)} ${f1(top)} L${f1(axisX + 8)} ${f1(top + 14)}`;
  const axisNames: GraphText[] = [
    { x: right, y: axisY - 16, text: g.xLabel, anchor: "end" },
    { x: axisX + 14, y: top + 8, text: g.yLabel, anchor: "start" },
  ];

  const curves: GraphCurve[] = [];
  const equations: string[] = [];
  g.functions.forEach((fn, i) => {
    const samples: GraphCurve["samples"] = [];
    let d = "";
    let pen = false;
    const steps = Math.max(80, Math.round(frame.w / 3));
    for (let k = 0; k <= steps; k++) {
      const mx = x0 + ((x1 - x0) * k) / steps;
      const my = fn.expr(mx);
      if (!Number.isFinite(my) || !inY(my)) {
        pen = false; // Lift the pen outside the view and across asymptotes.
        continue;
      }
      const p = { x: sx(mx), y: sy(my), mx, my };
      d += `${pen ? "L" : "M"}${f1(p.x)} ${f1(p.y)} `;
      samples.push(p);
      pen = true;
    }
    if (!samples.length) return;
    curves.push({ d: d.trim(), samples, ink: i, straight: false });
    equations.push(fn.text);
  });
  g.segments.forEach((s, i) => {
    const a = { x: sx(s.a.x), y: sy(s.a.y) };
    const b = { x: sx(s.b.x), y: sy(s.b.y) };
    curves.push({
      d: `M${f1(a.x)} ${f1(a.y)} L${f1(b.x)} ${f1(b.y)}`,
      samples: [],
      label: s.label ? { x: (a.x + b.x) / 2 + 12, y: (a.y + b.y) / 2 - 14, text: s.label, anchor: "start" } : undefined,
      ink: g.functions.length + i,
      straight: true,
    });
  });
  g.verticals.forEach((v) => {
    if (v < x0 || v > x1) return;
    curves.push({ d: `M${f1(sx(v))} ${f1(frame.y + frame.h)} V${f1(frame.y)}`, samples: [], label: { x: sx(v) + 10, y: frame.y + 26, text: `x = ${fmt(v)}`, anchor: "start" }, ink: 2, straight: true });
  });

  // Point labels claim their space first (they belong at one spot), then each equation is written
  // beside its own curve at the first spot, from the right end inward, clear of every other label and curve.
  const placed: Box[] = [];
  const fnCurves = curves.slice(0, equations.length);
  const touchesCurve = (b: Box) => fnCurves.some((c) => c.samples.some((q) => q.x > b.x - 4 && q.x < b.x + b.w + 4 && q.y > b.y - 4 && q.y < b.y + b.h + 4));
  const points: GraphPoint[] = g.points
    .filter((p) => p.x >= x0 && p.x <= x1 && inY(p.y))
    .map((p) => {
      const x = sx(p.x);
      const y = sy(p.y);
      const coords = `(${fmt(p.x)}, ${fmt(p.y)})`;
      const text = p.label ? `${p.label} ${coords}` : coords;
      const options: GraphText[] = [
        { x: x + 14, y: y + 36, text, anchor: "start" },
        { x: x - 14, y: y - 14, text, anchor: "end" },
        { x: x + 14, y: y - 14, text, anchor: "start" },
        { x: x - 14, y: y + 36, text, anchor: "end" },
      ];
      const fits = options.filter((t) => inside(textBox(t, POINT_SIZE), frame) && !placed.some((o) => overlaps(o, textBox(t, POINT_SIZE))));
      const label = fits.find((t) => !touchesCurve(textBox(t, POINT_SIZE))) ?? fits[0] ?? options[0];
      placed.push(textBox(label, POINT_SIZE));
      return { x, y, label, guides: `M${f1(x)} ${f1(y)} V${f1(axisY)} M${f1(x)} ${f1(y)} H${f1(axisX)}` };
    });
  fnCurves.forEach((c, i) => {
    c.label = placeCurveLabel(c, equations[i], fnCurves, placed, frame);
    placed.push(textBox(c.label, LABEL_SIZE));
  });

  return { frame, grid: grid.trim(), axes, ticks, axisNames, curves, points };
}

/** Font size the board writes curve equations at (Whiteboard GraphView). */
const LABEL_SIZE = 36;
/** Font size of point labels. */
const POINT_SIZE = 32;

/** Rough box of a hand-lettered label, wide enough to keep two labels apart. */
function textBox(t: GraphText, size: number): Box {
  const w = t.text.length * size * 0.55 + 12;
  const left = t.anchor === "end" ? t.x - w : t.anchor === "middle" ? t.x - w / 2 : t.x;
  return { x: left, y: t.y - size, w, h: size + 10 };
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, f: Box) => a.x >= f.x && a.x + a.w <= f.x + f.w + 20 && a.y >= f.y - 6 && a.y + a.h <= f.y + f.h;

function placeCurveLabel(curve: GraphCurve, text: string, curves: GraphCurve[], placed: Box[], frame: Box): GraphText {
  const s = curve.samples;
  const others = curves.filter((c) => c !== curve);
  const hitsCurve = (b: Box) =>
    others.some((c) => c.samples.some((p) => p.x > b.x - 4 && p.x < b.x + b.w + 4 && p.y > b.y - 4 && p.y < b.y + b.h + 4));
  let fallback: GraphText | null = null;
  for (const frac of [0.97, 0.88, 0.78, 0.66, 0.54, 0.42, 0.3, 0.18, 0.06]) {
    const p = s[Math.round(frac * (s.length - 1))];
    const q = s[Math.min(s.length - 1, Math.round(frac * (s.length - 1)) + 2)];
    const rising = q.y < p.y; // board y grows downward
    // Above-left of a rising curve or above-right of a falling one keeps the text off its own line; below as a second choice.
    const candidates: GraphText[] = [
      { x: rising ? p.x - 14 : p.x + 14, y: p.y - 16, text, anchor: rising ? "end" : "start" },
      { x: rising ? p.x + 14 : p.x - 14, y: p.y + 44, text, anchor: rising ? "start" : "end" },
    ];
    for (const t of candidates) {
      const b = textBox(t, LABEL_SIZE);
      if (!inside(b, frame) || placed.some((o) => overlaps(o, b))) continue;
      if (!hitsCurve(b)) return t;
      fallback ??= t;
    }
  }
  if (fallback) return fallback;
  // Nothing clear: stack it in the top-left corner under any earlier labels.
  return { x: frame.x + 12, y: frame.y + 36 + placed.length * (LABEL_SIZE + 12), text, anchor: "start" };
}

/** The tip of a curve drawn `frac` of the way, with its coordinates, for the live readout. */
export function curveTip(curve: GraphCurve, frac: number): { x: number; y: number; text: string } | null {
  if (!curve.samples.length) return null;
  const s = curve.samples[Math.min(curve.samples.length - 1, Math.max(0, Math.round(frac * (curve.samples.length - 1))))];
  const r = (n: number) => (Math.abs(n) >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
  return { x: s.x, y: s.y, text: `(${fmt(r(s.mx))}, ${fmt(r(s.my))})` };
}

export type { Point };
