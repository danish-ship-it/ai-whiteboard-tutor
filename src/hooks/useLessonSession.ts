"use client";

import type { PresetVisuals } from "./useSceneVisuals";
import { useCallback, useEffect, useRef, useState } from "react";
import { layoutLesson, type SceneLayout } from "@/lib/board/layout";
import { DEFAULT_AUDIENCE, type Audience } from "@/lib/lesson/audience";
import { buildNarration } from "@/lib/lesson/narration";
import type { Lesson } from "@/lib/lesson/schema";
import { buildCharClock, type CharAlignment } from "@/lib/timeline/align";
import { compileTimeline, type Timeline } from "@/lib/timeline/timeline";
import { getLesson, saveLesson } from "@/lib/storage/lessons";

export type Stage = "planning" | "drawing" | "recording";

export interface LoadedLesson {
  topic: string;
  lesson: Lesson;
  token: string;
  scenes: SceneLayout[];
  timeline: Timeline;
  /** Object URL of the narration MP3, or null for captions-only. */
  audioUrl: string | null;
  /** Set when the voice failed; the lesson can still play with captions. */
  voiceError: string | null;
  /** A saved lesson older than its token: it replays, but follow-up questions need a fresh lesson. */
  questionsExpired?: boolean;
  /** Ready-made scene illustrations (demo lessons). */
  visuals?: PresetVisuals;
  /** Make scene illustrations as soon as the lesson opens (fresh lessons only). */
  autoVisuals?: boolean;
  /** History id when this lesson is saved on the device, so its pictures can be saved with it. */
  savedId?: string;
}

export type SessionState =
  | { phase: "home"; topic: string }
  | { phase: "generating"; topic: string; stage: Stage; slow: boolean; outline?: string[] }
  /** `audience` is kept so "Try again" makes the same kind of lesson (e.g. for kids). */
  | { phase: "failed"; topic: string; message: string; audience?: Audience }
  | { phase: "lesson"; data: LoadedLesson };

interface NarrationResponse {
  audioBase64: string;
  mimeType: string;
  alignment: CharAlignment | null;
  normalizedAlignment: CharAlignment | null;
}

class RequestError extends Error {}

async function postJson<T>(url: string, body: unknown, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new RequestError(navigator.onLine ? "Couldn't reach the server. Please try again." : "You're offline. Reconnect and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
  return data as T;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** When the server stops accepting this lesson for questions (tokens carry their issue time). */
function tokenExpiry(token: string): number {
  try {
    const payload = token.split(".")[0].replace(/-/g, "+").replace(/_/g, "/");
    return (JSON.parse(atob(payload)) as { iat: number }).iat + TOKEN_LIFETIME_MS;
  } catch {
    return 0;
  }
}
const TOKEN_LIFETIME_MS = 12 * 60 * 60 * 1000;

/** Reads the decoded duration of the narration so the timeline matches the real media. */
function probeDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const done = (value?: number) => {
      audio.removeAttribute("src");
      resolve(value);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : undefined);
    audio.onerror = () => done(undefined);
    audio.src = url;
    setTimeout(() => done(undefined), 4000);
  });
}

/**
 * Orchestrates one lesson: generate → lay out → narrate → compile timeline.
 * Each run carries a generation id; results from a cancelled or superseded run
 * are dropped, so a slow response can never overwrite a newer lesson.
 */
export function useLessonSession() {
  const [state, setState] = useState<SessionState>({ phase: "home", topic: "" });
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const audioUrl = useRef<string | null>(null);

  const releaseAudio = () => {
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  };

  useEffect(() => () => {
    controller.current?.abort();
    releaseAudio();
  }, []);

  const generate = useCallback(async (topic: string, audience: Audience = DEFAULT_AUDIENCE) => {
    const id = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = () => id === generation.current;

    setState({ phase: "generating", topic, stage: "planning", slow: false });
    const slowTimer = setTimeout(() => {
      if (current()) setState((s) => (s.phase === "generating" ? { ...s, slow: true } : s));
    }, 30_000);

    try {
      const { lesson, token } = await postJson<{ lesson: Lesson; token: string }>("/api/lesson", { topic, audience }, abort.signal);
      if (!current()) return;

      setState((s) => (s.phase === "generating" ? { ...s, stage: "drawing" } : s));
      const scenes = layoutLesson(lesson);
      const { text } = buildNarration(lesson);
      setState((s) => (s.phase === "generating" ? { ...s, stage: "recording", outline: lesson.scenes.map((scene) => scene.title) } : s));

      let url: string | null = null;
      let voiceError: string | null = null;
      let clock = buildCharClock(text, null, null);
      let narration: NarrationResponse | null = null;
      let audio: Blob | null = null;
      try {
        narration = await postJson<NarrationResponse>("/api/narration", { token }, abort.signal);
        if (!current()) return;
        audio = base64ToBlob(narration.audioBase64, narration.mimeType);
        url = URL.createObjectURL(audio);
        clock = buildCharClock(text, narration.alignment, narration.normalizedAlignment, await probeDuration(url));
      } catch (error) {
        if ((error as Error).name === "AbortError") throw error;
        voiceError = (error as Error).message;
      }
      if (!current()) {
        if (url) URL.revokeObjectURL(url);
        return;
      }

      releaseAudio();
      audioUrl.current = url;
      const timeline = compileTimeline(lesson, clock);
      // Saved only with its voice, so a replay never needs the AI again. Failure to save is silent.
      const savedId = audio && narration ? crypto.randomUUID() : undefined;
      setState({ phase: "lesson", data: { topic, lesson, token, scenes, timeline, audioUrl: url, voiceError, autoVisuals: true, savedId } });
      if (savedId && audio && narration) {
        const now = Date.now();
        void saveLesson({
          version: 1,
          id: savedId,
          topic,
          title: lesson.title,
          lesson,
          token,
          tokenExpiresAt: tokenExpiry(token),
          audio,
          mimeType: narration.mimeType,
          alignment: narration.alignment,
          normalizedAlignment: narration.normalizedAlignment,
          duration: timeline.duration,
          createdAt: now,
          lastOpenedAt: now,
        });
      }
    } catch (error) {
      if (!current()) return;
      if ((error as Error).name === "AbortError") return;
      setState({ phase: "failed", topic, message: (error as Error).message, audience });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  /** Opens a pre-recorded demo lesson: no AI calls, plays as soon as the audio file arrives. */
  const openDemo = useCallback(async (slug: string) => {
    const id = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = () => id === generation.current;
    try {
      const demo = await postJson<{ topic: string; lesson: Lesson; token: string; audioUrl: string; visuals?: PresetVisuals } & Omit<NarrationResponse, "audioBase64" | "mimeType">>(
        "/api/demo",
        { id: slug },
        abort.signal,
      );
      const audio = await fetch(demo.audioUrl, { signal: abort.signal });
      if (!audio.ok) throw new RequestError("The demo's audio couldn't load. Please try again.");
      const url = URL.createObjectURL(await audio.blob());
      if (!current()) return URL.revokeObjectURL(url);
      const { text } = buildNarration(demo.lesson);
      const clock = buildCharClock(text, demo.alignment, demo.normalizedAlignment, await probeDuration(url));
      if (!current()) return URL.revokeObjectURL(url);
      releaseAudio();
      audioUrl.current = url;
      setState({
        phase: "lesson",
        data: { topic: demo.topic, lesson: demo.lesson, token: demo.token, scenes: layoutLesson(demo.lesson), timeline: compileTimeline(demo.lesson, clock), audioUrl: url, voiceError: null, visuals: demo.visuals },
      });
    } catch (error) {
      if (!current() || (error as Error).name === "AbortError") return;
      setState({ phase: "failed", topic: "", message: (error as Error).message });
    }
  }, []);

  /** Replays a lesson saved on this device, with no network calls. */
  const openSaved = useCallback(async (id: string) => {
    const run = ++generation.current;
    controller.current?.abort();
    const saved = await getLesson(id);
    if (run !== generation.current) return;
    if (!saved?.audio) {
      setState({ phase: "failed", topic: saved?.topic ?? "", message: "That saved lesson couldn't be opened. You can make it again." });
      return;
    }
    const url = URL.createObjectURL(saved.audio);
    const { text } = buildNarration(saved.lesson);
    const clock = buildCharClock(text, saved.alignment, saved.normalizedAlignment, await probeDuration(url));
    if (run !== generation.current) return URL.revokeObjectURL(url);
    releaseAudio();
    audioUrl.current = url;
    setState({
      phase: "lesson",
      data: {
        topic: saved.topic,
        lesson: saved.lesson,
        token: saved.token,
        scenes: layoutLesson(saved.lesson),
        timeline: compileTimeline(saved.lesson, clock),
        audioUrl: url,
        voiceError: null,
        questionsExpired: saved.tokenExpiresAt < Date.now(),
        visuals: saved.visuals,
        savedId: saved.id,
      },
    });
  }, []);

  /** Stops generation and returns home with the topic preserved; late results are ignored. */
  const cancel = useCallback(() => {
    generation.current++;
    controller.current?.abort();
    setState((s) => ({ phase: "home", topic: "topic" in s ? s.topic : "" }));
  }, []);

  const goHome = useCallback((topic = "") => {
    generation.current++;
    controller.current?.abort();
    releaseAudio();
    setState({ phase: "home", topic });
  }, []);

  /** Switches a lesson whose voice failed (to load or to play) into captions-only playback. */
  const continueWithCaptions = useCallback(() => {
    releaseAudio();
    setState((s) => (s.phase === "lesson" ? { ...s, data: { ...s.data, voiceError: null, audioUrl: null } } : s));
  }, []);

  return { state, generate, openDemo, openSaved, cancel, goHome, continueWithCaptions };
}
