"use client";

import { Whiteboard, TAKES } from "@/components/board/Whiteboard";
import type { SceneLayout } from "@/lib/board/layout";
import { BOARD_H, BOARD_W } from "@/lib/board/layout";
import { WIDE, boardCamera, followCamera, spring, type Camera } from "@/lib/board/motion";
import { boardStateAt, type Timeline } from "@/lib/timeline/timeline";

/**
 * Records a lesson as a video file, entirely in the browser: every frame of the board is rendered
 * from `boardStateAt(t)` (the same pure function the player uses), rasterised onto a canvas, and
 * recorded together with the narration. Nothing is uploaded; the file never leaves the device.
 *
 * Recording runs in real time (MediaRecorder), so a two-minute lesson takes about two minutes.
 */

export const VIDEO_W = 1280;
export const VIDEO_H = 720;
/** Drawing rate. Animation "on 2s" at 24 fps is 12 drawings a second, which suits a hand-drawn board. */
const FPS = 24;
const BOIL_PER_SECOND = 8;

export interface RecordOptions {
  /** Layouts that keep a corner free for each step's picture. */
  scenes: SceneLayout[];
  /** The same lesson laid out without that corner, for steps whose picture can't be drawn. */
  plainScenes: SceneLayout[];
  timeline: Timeline;
  title: string;
  audioUrl: string | null;
  /** Each step's AI picture by scene id, pinned into its corner like on the live board. */
  pictures?: Record<string, string | undefined>;
  /**
   * Created and resumed by the caller inside the click, because Safari only lets audio start from
   * a user gesture. It drives the recording clock and is closed when recording ends.
   */
  audio: AudioContext;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface Recording {
  blob: Blob;
  extension: "mp4" | "webm";
}

export function canRecordVideo(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

function pickMimeType(): { mimeType: string; extension: "mp4" | "webm" } {
  const candidates: [string, "mp4" | "webm"][] = [
    // avc3 carries codec settings in-band; Chrome warns that avc1 can't take a mid-recording change.
    ["video/mp4;codecs=avc3.42E01F,mp4a.40.2", "mp4"],
    ["video/mp4;codecs=avc1.42E01F,mp4a.40.2", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm;codecs=vp8,opus", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [mimeType, extension] of candidates) if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType, extension };
  return { mimeType: "", extension: "webm" };
}

const BOARD_VARS = ["--board", "--ink-ink", "--ink-blue", "--ink-green", "--ink-red", "--ink-orange", "--ink-purple"];
const BOARD_VARS_TINT = ["--tint-ink", "--tint-blue", "--tint-green", "--tint-red", "--tint-orange", "--tint-purple"];
const FONT_VARS = ["--font-hand", "--font-instrument", "--font-plex-mono"];

async function toDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  const blob = await (await fetch(url, { signal })).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * An SVG drawn as an image can't load the page's fonts, so the board's fonts are embedded:
 * the @font-face rules for the families behind --font-hand and friends, with their files inlined.
 */
async function embeddedStyle(signal?: AbortSignal): Promise<string> {
  const root = getComputedStyle(document.documentElement);
  const vars = [...BOARD_VARS, ...BOARD_VARS_TINT, ...FONT_VARS].map((name) => `${name}: ${root.getPropertyValue(name).trim()};`).join(" ");
  const families = FONT_VARS.flatMap((name) =>
    root
      .getPropertyValue(name)
      .split(",")
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean),
  );
  const faces: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // Another origin's stylesheet.
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family").trim().replace(/^['"]|['"]$/g, "");
      if (!families.includes(family)) continue;
      // Latin only: the board is written in English, and every embedded file is re-read for each frame.
      const range = rule.style.getPropertyValue("unicode-range");
      if (range && !/U\+0+-0*FF\b/i.test(range)) continue;
      const src = rule.style.getPropertyValue("src");
      const url = /url\(["']?([^"')]+)["']?\)/.exec(src)?.[1];
      if (!url) continue;
      try {
        const data = await toDataUrl(new URL(url, sheet.href ?? location.href).href, signal);
        faces.push(
          `@font-face { font-family: "${family}"; src: url(${data}); font-weight: ${rule.style.getPropertyValue("font-weight") || "normal"}; font-style: ${rule.style.getPropertyValue("font-style") || "normal"}; }`,
        );
      } catch {
        // A missing font falls back to the next family in the stack.
        signal?.throwIfAborted();
      }
    }
  }
  return `${faces.join("\n")}\nsvg { ${vars} }`;
}

/** One frame of the board as standalone SVG markup. */
function frameMarkup(render: (node: React.ReactElement) => string, style: string, props: React.ComponentProps<typeof Whiteboard>): string {
  const svg = render(<Whiteboard {...props} />);
  return svg.replace(/^<svg /, `<svg xmlns="http://www.w3.org/2000/svg" width="${VIDEO_W}" height="${VIDEO_H}" `).replace(/(<svg[^>]*>)/, `$1<style>${style}</style>`);
}

async function drawSvg(ctx: CanvasRenderingContext2D, markup: string) {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    ctx.drawImage(img, 0, 0, VIDEO_W, VIDEO_H);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** What the board shows at time t, with the camera eased from the previous frame. */
export function frameAt(scenes: SceneLayout[], timeline: Timeline, t: number, previousCamera: Camera, dt: number) {
  const state = boardStateAt(timeline, t);
  const scene = timeline.scenes[state.sceneIndex];
  const titleProgress = state.sceneIndex === 0 ? 1 : Math.min(1, Math.max(0, (t - scene.start) / 1.2));
  const target = boardCamera(scenes[state.sceneIndex], state, { titleProgress });
  const camera = dt > 0 ? followCamera(previousCamera, target, dt) : target;
  const enter = state.sceneIndex === 0 ? 1 : spring(t - scene.start);
  return { state, titleProgress, camera, enter, boil: Math.floor(t * BOIL_PER_SECOND) % TAKES };
}

/** Loads a step picture for the canvas. Pictures from a host without CORS can't be drawn, and are skipped. */
async function loadPicture(url: string, signal?: AbortSignal): Promise<ImageBitmap | null> {
  try {
    const response = await fetch(url, { mode: "cors", signal });
    if (!response.ok) return null;
    return await createImageBitmap(await response.blob());
  } catch {
    signal?.throwIfAborted();
    return null;
  }
}

/** The step picture as a taped photo, in board units under the camera, like BoardPhoto on the live board. */
function drawPicture(ctx: CanvasRenderingContext2D, picture: ImageBitmap, box: { x: number; y: number; w: number; h: number }, camera: Camera, alpha: number) {
  const k = VIDEO_W / BOARD_W;
  ctx.save();
  ctx.setTransform(k * camera.scale, 0, 0, k * camera.scale, k * camera.x * BOARD_W, k * camera.y * BOARD_H);
  ctx.globalAlpha = alpha;
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
  ctx.rotate((1.2 * Math.PI) / 180);
  ctx.translate(-box.w / 2, -box.h / 2);
  ctx.shadowColor = "rgba(23, 28, 25, 0.22)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, box.w, box.h);
  ctx.shadowColor = "transparent";
  const pad = box.w * 0.03;
  const w = box.w - pad * 2;
  const h = box.h - pad * 2;
  // Cover the frame, cropping the picture's longer side.
  const scale = Math.max(w / picture.width, h / picture.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(picture, (picture.width - sw) / 2, (picture.height - sh) / 2, sw, sh, pad, pad, w, h);
  ctx.fillStyle = "rgba(240, 230, 200, 0.85)";
  ctx.translate(box.w / 2, 0);
  ctx.rotate((-2 * Math.PI) / 180);
  ctx.fillRect(-box.w * 0.14, -box.h * 0.06, box.w * 0.28, box.h * 0.12);
  ctx.restore();
}

export async function recordLesson({ scenes, plainScenes, timeline, title, audioUrl, pictures = {}, audio, onProgress, signal }: RecordOptions): Promise<Recording> {
  const cleanup: (() => void)[] = [() => void audio.close().catch(() => {})];
  try {
    const { renderToStaticMarkup } = await import("react-dom/server");
    signal?.throwIfAborted();
    const style = await embeddedStyle(signal);
    signal?.throwIfAborted();

    // Steps whose picture loads keep the photo layout; the others are laid out without the corner.
    const loaded = await Promise.all(
      scenes.map(async (scene) => {
        const url = pictures[scene.sceneId];
        return scene.photo && url ? loadPicture(url, signal) : null;
      }),
    );
    cleanup.push(() => loaded.forEach((picture) => picture?.close()));
    signal?.throwIfAborted();
    const layouts = scenes.map((scene, i) => (loaded[i] ? scene : (plainScenes[i] ?? scene)));

    let buffer: AudioBuffer | null = null;
    if (audioUrl) buffer = await audio.decodeAudioData(await (await fetch(audioUrl, { signal })).arrayBuffer());
    signal?.throwIfAborted();

    const canvas = document.createElement("canvas");
    canvas.width = VIDEO_W;
    canvas.height = VIDEO_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the video.");

    let camera: Camera = WIDE;
    const draw = async (t: number, dt: number) => {
      const frame = frameAt(layouts, timeline, t, camera, dt);
      camera = frame.camera;
      const markup = frameMarkup(renderToStaticMarkup, style, {
        scenes: layouts,
        state: frame.state,
        titleProgress: frame.titleProgress,
        camera: frame.camera,
        enter: frame.enter,
        boil: frame.boil,
        description: title,
      });
      await drawSvg(ctx, markup);
      const picture = loaded[frame.state.sceneIndex];
      const box = layouts[frame.state.sceneIndex]?.photo;
      if (picture && box) drawPicture(ctx, picture, box, frame.camera, Math.min(1, Math.max(0, frame.enter * 1.6)));
    };

    // The first frame is on the canvas before recording starts, so the video never opens on black.
    await draw(0, 0);
    signal?.throwIfAborted();

    const stream = canvas.captureStream(FPS);
    cleanup.push(() => stream.getTracks().forEach((track) => track.stop()));
    let source: AudioBufferSourceNode | null = null;
    if (buffer) {
      const destination = audio.createMediaStreamDestination();
      source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(destination);
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }

    const { mimeType, extension } = pickMimeType();
    const recorder = new MediaRecorder(stream, { mimeType: mimeType || undefined, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
    recorder.start(1000);
    const startedAt = audio.currentTime + 0.05;
    source?.start(startedAt);

    // The narration's clock drives the board, exactly as the <audio> element does in the player.
    const duration = timeline.duration + 0.6;
    let last = 0;
    try {
      while (!signal?.aborted) {
        const t = Math.max(0, audio.currentTime - startedAt);
        if (t >= duration) break;
        await draw(Math.min(t, timeline.duration), t - last);
        last = t;
        onProgress?.(t / duration);
        // Hold to the drawing rate; a slow frame just means the next one is drawn later.
        await new Promise((r) => setTimeout(r, Math.max(0, 1000 / FPS - (audio.currentTime - startedAt - t) * 1000)));
      }
    } finally {
      if (recorder.state !== "inactive") recorder.stop();
      source?.stop();
      await stopped;
    }
    signal?.throwIfAborted();
    onProgress?.(1);
    return { blob: new Blob(chunks, { type: mimeType.split(";")[0] || `video/${extension}` }), extension };
  } finally {
    cleanup.forEach((fn) => fn());
  }
}

/** A safe file name from the lesson title. */
export const videoFileName = (title: string, extension: string) =>
  `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "lesson"}.${extension}`;

