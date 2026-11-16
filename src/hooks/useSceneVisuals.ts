"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SceneVisual {
  image?: string;
  video?: string;
  /** Task that made the image; a clip is animated from it. */
  imageTask?: string;
  working?: "image" | "video";
  error?: string;
}

export type PresetVisuals = Record<string, { image: string; video?: string }>;

interface Options {
  token: string;
  sceneIds: string[];
  /** Ready-made visuals (demo lessons). */
  preset?: PresetVisuals;
  /** Make every scene's picture, then its clip, as soon as the lesson opens (fresh lessons only, so replays cost nothing). */
  auto: boolean;
  /** Called with every finished picture and clip, to save them with the lesson. */
  onSave?: (visuals: PresetVisuals) => void;
}

const POLL_MS = 5_000;
const GIVE_UP_MS = 4 * 60_000;
const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(id), reject(new DOMException("Aborted", "AbortError"))), { once: true });
  });

class Unavailable extends Error {}

async function startTask(body: object, signal: AbortSignal): Promise<string> {
  const post = () => fetch("/api/visual", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  let response = await post();
  // The picture service is sometimes briefly overloaded: one more try a few seconds later.
  if (response.status >= 502) {
    await wait(4_000, signal);
    response = await post();
  }
  const data = (await response.json().catch(() => ({}))) as { taskId?: string; error?: string };
  if (response.status === 501) throw new Unavailable();
  if (!response.ok || !data.taskId) throw new Error(data.error ?? "The picture couldn't be made.");
  return data.taskId;
}

async function finishTask(taskId: string, signal: AbortSignal): Promise<string> {
  const started = Date.now();
  let misses = 0;
  while (Date.now() - started < GIVE_UP_MS) {
    await wait(POLL_MS, signal);
    const response = await fetch(`/api/visual?task=${encodeURIComponent(taskId)}`, { signal });
    const data = (await response.json().catch(() => ({}))) as { status?: string; url?: string; error?: string };
    // A busy or slow poll is not a failed picture: keep waiting, but give up after several in a row.
    if (response.status === 429 || response.status >= 500) {
      if (++misses >= 6) throw new Error(data.error ?? "The picture service isn't answering. Try again later.");
      continue;
    }
    misses = 0;
    if (!response.ok) throw new Error(data.error ?? "The picture couldn't be made.");
    if (data.status === "done" && data.url) return data.url;
    if (data.status === "failed") throw new Error("The picture service couldn't make this one.");
  }
  throw new Error("This is taking too long. Try again later.");
}

/**
 * AI illustrations (BBANANA or Runway) for each scene: a picture first, then an optional
 * five-second clip animated from it. Requests are cancelled when the lesson changes.
 */
export function useSceneVisuals({ token, sceneIds, preset, auto, onSave }: Options) {
  const [visuals, setVisuals] = useState<Record<string, SceneVisual>>(() => ({ ...preset }));
  // Hidden until the server says illustrations are switched on; demos with ready-made visuals don't need it.
  const [available, setAvailable] = useState(false);
  const [provider, setProvider] = useState<string>();
  const abort = useRef<AbortController>(new AbortController());
  const latest = useRef(visuals);
  const save = useRef(onSave);
  useEffect(() => {
    latest.current = visuals;
    save.current = onSave;
  }, [visuals, onSave]);

  // Save the finished pictures and clips whenever a new one arrives (only permanent http links).
  const finished = Object.entries(visuals)
    .filter(([, v]) => v.image?.startsWith("http"))
    .map(([id, v]) => `${id}|${v.image}|${v.video ?? ""}`)
    .join(",");
  useEffect(() => {
    if (!finished) return;
    const done: PresetVisuals = {};
    for (const [id, v] of Object.entries(latest.current)) if (v.image?.startsWith("http")) done[id] = { image: v.image, video: v.video };
    save.current?.(done);
  }, [finished]);

  const autoRef = useRef(auto);
  const runRef = useRef<(sceneId: string, kind: "image" | "video", chained?: string) => Promise<void>>(null);
  const patch = useCallback((id: string, next: Partial<SceneVisual>) => setVisuals((v) => ({ ...v, [id]: { ...v[id], ...next } })), []);

  const run = useCallback(
    // `chained` is the picture's task when a clip follows straight on from it (state hasn't caught up yet).
    async (sceneId: string, kind: "image" | "video", chained?: string) => {
      const current = latest.current[sceneId];
      if (current?.working && !chained) return;
      const imageTask = chained ?? current?.imageTask;
      if (kind === "video" && !imageTask) return;
      const signal = abort.current.signal;
      patch(sceneId, { working: kind, error: undefined });
      try {
        const taskId = await startTask({ kind, token, sceneId, imageTask }, signal);
        const url = await finishTask(taskId, signal);
        patch(sceneId, kind === "image" ? { image: url, imageTask: taskId, working: undefined } : { video: url, working: undefined });
        if (kind === "image" && autoRef.current) void runRef.current?.(sceneId, "video", taskId);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof Unavailable) {
          setAvailable(false);
          patch(sceneId, { working: undefined });
          return;
        }
        patch(sceneId, { working: undefined, error: (error as Error).message });
      }
    },
    [patch, token],
  );
  useEffect(() => {
    runRef.current = run;
    autoRef.current = auto;
  }, [run, auto]);

  // One request per scene, a moment apart, so the first scene's picture arrives first.
  const sceneKey = sceneIds.join(",");
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    fetch("/api/visual", { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { available?: boolean; provider?: string }) => {
        setAvailable(!!d.available);
        setProvider(d.provider);
      })
      .catch(() => {});
    if (auto) {
      sceneKey.split(",").forEach((id, i) => {
        if (latest.current[id]?.image) return;
        setTimeout(() => !controller.signal.aborted && void run(id, "image"), i * 400);
      });
    }
    return () => controller.abort();
  }, [auto, run, sceneKey]);

  return {
    visuals,
    available: available || !!preset,
    /** Who makes new pictures on this server, for the credit line. */
    provider,
    makeImage: (sceneId: string) => void run(sceneId, "image"),
    makeVideo: (sceneId: string) => void run(sceneId, "video"),
  };
}
