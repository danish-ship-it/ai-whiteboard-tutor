import { describe, expect, it } from "vitest";
import { compileExpr, curveTip, fmt, graphGeometry, graphHasContent, niceStep, parseGraph, prettyMath } from "../board/graph";
import { fromPicture } from "../lesson/validate";

const BOX = { x: 100, y: 200, w: 1000, h: 600 };

describe("compileExpr", () => {
  const at = (src: string, x: number) => compileExpr(src)!(x);
  it("follows the order of operations, powers and implicit multiplication", () => {
    expect(at("x^2 - 2x + 1", 3)).toBe(4);
    expect(at("2(x+1)^2", 1)).toBe(8);
    expect(at("-x^2", 3)).toBe(-9);
    expect(at("2^3^2", 0)).toBe(512);
    expect(at("x²", 4)).toBe(16);
    expect(at("3x/2", 4)).toBe(6);
  });
  it("knows the common functions and constants", () => {
    expect(at("sin(pi/2)", 0)).toBeCloseTo(1);
    expect(at("sqrt x", 9)).toBe(3);
    expect(at("2 sin(x)", Math.PI / 2)).toBeCloseTo(2);
    expect(at("e^x", 1)).toBeCloseTo(Math.E);
    expect(at("log(100)", 0)).toBe(2);
  });
  it("refuses anything that isn't arithmetic in x", () => {
    for (const bad of ["alert(1)", "x +", "(x", "y^2", "x; drop", "", "constructor"]) expect(compileExpr(bad)).toBeNull();
  });
});

describe("parseGraph", () => {
  it("reads functions, points, segments, ranges and axis names", () => {
    const g = parseGraph("graph y = x^2 - 4; f(x) = 2x - 1; (3,5) cross; (0,-4); (0,0) to (2,4) rise; x = 1; x -4..5; y -6..10; xlabel time (s); ylabel height");
    expect(g.functions.map((f) => f.text)).toEqual(["y = x² - 4", "f(x) = 2x - 1"]);
    expect(g.points).toEqual([
      { x: 3, y: 5, label: "cross" },
      { x: 0, y: -4, label: "" },
    ]);
    expect(g.segments[0]).toEqual({ a: { x: 0, y: 0 }, b: { x: 2, y: 4 }, label: "rise" });
    expect(g.verticals).toEqual([1]);
    expect(g.xRange).toEqual([-4, 5]);
    expect(g.yRange).toEqual([-6, 10]);
    expect([g.xLabel, g.yLabel]).toEqual(["time (s)", "height"]);
  });
  it("ignores what it can't plot", () => {
    expect(graphHasContent(parseGraph("hello; y = nonsense(("))).toBe(false);
  });
});

describe("graphGeometry", () => {
  it("puts every point exactly on its curve, in one coordinate system", () => {
    const g = parseGraph("y = x^2 - 4; y = 2x - 1; (-1,-3); (3,5); x -4..5; y -6..10");
    const geo = graphGeometry(g, BOX);
    const curve = geo.curves[0];
    for (const p of geo.points) {
      // The nearest sample of y = x^2 - 4 to each point is within a couple of board units.
      const nearest = Math.min(...curve.samples.map((s) => Math.hypot(s.x - p.x, s.y - p.y)));
      expect(nearest).toBeLessThan(6);
    }
    // Both curves pass through (3,5) at the same board position.
    const onLine = geo.curves[1].samples.reduce((best, s) => (Math.abs(s.mx - 3) < Math.abs(best.mx - 3) ? s : best));
    expect(Math.hypot(onLine.x - geo.points[1].x, onLine.y - geo.points[1].y)).toBeLessThan(4);
  });

  it("crosses the axes at the origin and numbers the ticks", () => {
    const geo = graphGeometry(parseGraph("y = x; x -4..4; y -4..4"), BOX);
    const texts = geo.ticks.map((t) => t.text);
    expect(texts).toContain("2");
    expect(texts).toContain("−2");
    expect(texts.filter((t) => t === "0")).toHaveLength(1);
    expect(geo.frame.x).toBeGreaterThanOrEqual(BOX.x);
    expect(geo.frame.x + geo.frame.w).toBeLessThanOrEqual(BOX.x + BOX.w);
  });

  it("lifts the pen across an asymptote instead of drawing a wall", () => {
    const geo = graphGeometry(parseGraph("y = 1/x; x -4..4; y -5..5"), BOX);
    expect((geo.curves[0].d.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("chooses ranges that show the content when none are given", () => {
    const geo = graphGeometry(parseGraph("y = x^2; (3,9)"), BOX);
    const tip = curveTip(geo.curves[0], 1)!;
    expect(tip.y).toBeGreaterThanOrEqual(geo.frame.y - 1);
    expect(geo.points).toHaveLength(1);
  });
});

describe("helpers", () => {
  it("picks round tick steps and prints clean numbers", () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(1, 4)).toBe(0.25);
    expect(fmt(0.1 + 0.2)).toBe("0.3");
    expect(fmt(-3)).toBe("−3");
    expect(prettyMath("y = 3*x^2")).toBe("y = 3·x²");
  });
  it("turns a picture that starts with graph into a graph action", () => {
    const a = fromPicture({ kind: "picture", id: "g", draw: "graph y = x^2", label: "", col: 0, row: 0, w: 5, h: 3, tone: "blue", cue: "" });
    expect(a).toMatchObject({ kind: "graph", spec: "y = x^2" });
  });
});

describe("curve labels", () => {
  it("keeps two equations that leave the graph at the same corner apart", () => {
    const g = parseGraph("y = x^2 - 4; y = 2x - 1; x -4..5; y -6..10");
    const geo = graphGeometry(g, { x: 0, y: 0, w: 720, h: 480 });
    const [a, b] = geo.curves.map((c) => c.label!);
    const box = (t: typeof a) => {
      const w = t.text.length * 36 * 0.55 + 12;
      const left = t.anchor === "end" ? t.x - w : t.x;
      return { l: left, r: left + w, t: t.y - 36, b: t.y + 10 };
    };
    const A = box(a), B = box(b);
    const apart = A.r <= B.l || B.r <= A.l || A.b <= B.t || B.b <= A.t;
    expect(apart).toBe(true);
  });
});

describe("point labels", () => {
  it("keeps a crossing's label off the equations", () => {
    const g = parseGraph("y = x^2 - 4; y = 2x - 1; (-1,-3) cross; (3,5) cross; x -4..5; y -6..10");
    const geo = graphGeometry(g, { x: 0, y: 0, w: 720, h: 480 });
    const box = (t: { x: number; y: number; text: string; anchor: string }, size: number) => {
      const w = t.text.length * size * 0.55 + 12;
      const left = t.anchor === "end" ? t.x - w : t.x;
      return { l: left, r: left + w, t: t.y - size, b: t.y + 10 };
    };
    const boxes = [...geo.points.map((p) => box(p.label, 32)), ...geo.curves.map((c) => box(c.label!, 36))];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const A = boxes[i], B = boxes[j];
        expect(A.r <= B.l || B.r <= A.l || A.b <= B.t || B.b <= A.t).toBe(true);
      }
  });
});
