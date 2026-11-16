"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { layoutLesson, type SceneLayout } from "@/lib/board/layout";
import { buildNarration } from "@/lib/lesson/narration";
import type { Lesson } from "@/lib/lesson/schema";
import { buildCharClock, type CharAlignment } from "@/lib/timeline/align";
import { compileTimeline, type Timeline } from "@/lib/timeline/timeline";

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
}

export type SessionState =
  | { phase: "home"; topic: string }
  | { phase: "generating"; topic: string; stage: Stage; slow: boolean }
  | { phase: "failed"; topic: string; message: string }
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

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

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

  const generate = useCallback(async (topic: string) => {
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
      const { lesson, token } = await postJson<{ lesson: Lesson; token: string }>("/api/lesson", { topic }, abort.signal);
      if (!current()) return;

      setState((s) => (s.phase === "generating" ? { ...s, stage: "drawing" } : s));
      const scenes = layoutLesson(lesson);
      const { text } = buildNarration(lesson);
      setState((s) => (s.phase === "generating" ? { ...s, stage: "recording" } : s));

      let url: string | null = null;
      let voiceError: string | null = null;
      let clock = buildCharClock(text, null, null);
      try {
        const narration = await postJson<NarrationResponse>("/api/narration", { token }, abort.signal);
        if (!current()) return;
        url = base64ToObjectUrl(narration.audioBase64, narration.mimeType);
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
      setState({
        phase: "lesson",
        data: { topic, lesson, token, scenes, timeline: compileTimeline(lesson, clock), audioUrl: url, voiceError },
      });
    } catch (error) {
      if (!current()) return;
      if ((error as Error).name === "AbortError") return;
      setState({ phase: "failed", topic, message: (error as Error).message });
    } finally {
      clearTimeout(slowTimer);
    }
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

  return { state, generate, cancel, goHome, continueWithCaptions };
}
