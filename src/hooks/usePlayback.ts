"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PlaybackStatus = "loading" | "ready" | "playing" | "paused" | "ended" | "blocked" | "error";

export interface Playback {
  status: PlaybackStatus;
  /** Current media time in seconds. */
  time: number;
  duration: number;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  setRate: (rate: number) => void;
  /** Pause while dragging the timeline; returns a function that ends the scrub. */
  beginScrub: () => () => void;
}

/**
 * The single playback clock for a lesson.
 *
 * With audio, the `<audio>` element is the master clock (its `currentTime` is
 * read every animation frame), so voice, board and captions can never drift.
 * Without audio (captions-only), a virtual clock runs on `performance.now()`.
 *
 * Every play/pause/seek bumps an operation token; a `play()` promise that
 * resolves after a newer operation is ignored, so rapid seeking or toggling can
 * never resurrect stale playback.
 */
export function usePlayback(audioSrc: string | null, timelineDuration: number): Playback {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const op = useRef(0);
  const raf = useRef(0);
  const virtual = useRef({ base: 0, startedAt: 0, running: false });

  const initialStatus: PlaybackStatus = audioSrc ? "loading" : "ready";
  const [status, setStatus] = useState<PlaybackStatus>(initialStatus);
  const [time, setTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const rateRef = useRef(1);
  const statusRef = useRef<PlaybackStatus>(initialStatus);

  // Dropping a failed audio source (captions fallback) continues on the virtual clock, paused.
  const [source, setSource] = useState(audioSrc);
  if (source !== audioSrc) {
    setSource(audioSrc);
    setStatus(audioSrc ? "loading" : "paused");
  }
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const duration = Math.max(timelineDuration, mediaDuration);
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const commit = useCallback((next: PlaybackStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const readClock = useCallback(() => {
    const audio = audioRef.current;
    if (audioSrc && audio) return audio.currentTime;
    const v = virtual.current;
    return v.running ? v.base + ((performance.now() - v.startedAt) / 1000) * rateRef.current : v.base;
  }, [audioSrc]);

  const stopLoop = useCallback(() => cancelAnimationFrame(raf.current), []);
  /** Cancels any pending play() result and the frame loop. */
  const invalidate = useCallback(() => {
    op.current++;
    stopLoop();
  }, [stopLoop]);

  const finish = useCallback(() => {
    invalidate();
    virtual.current = { base: durationRef.current, startedAt: 0, running: false };
    audioRef.current?.pause();
    setTime(durationRef.current);
    commit("ended");
  }, [commit, invalidate]);

  // Frame loop: reads the clock once per frame. Kept in a ref so it can reschedule itself.
  const tick = useRef<() => void>(() => {});
  useEffect(() => {
    tick.current = () => {
      const t = readClock();
      if (!audioSrc && t >= durationRef.current) return finish();
      setTime(t);
      raf.current = requestAnimationFrame(() => tick.current());
    };
  }, [audioSrc, finish, readClock]);
  const startLoop = useCallback(() => {
    stopLoop();
    raf.current = requestAnimationFrame(() => tick.current());
  }, [stopLoop]);

  // One persistent audio element per lesson. The player is keyed by lesson, so
  // the source never changes while this hook is mounted.
  useEffect(() => {
    if (!audioSrc) return;
    const audio = new Audio();
    audio.preload = "auto";
    audio.playbackRate = rateRef.current;
    audio.src = audioSrc;
    audioRef.current = audio;

    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setMediaDuration(audio.duration);
      if (statusRef.current === "loading") commit("ready");
    };
    const onEnded = () => finish();
    const onError = () => commit("error");
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      invalidate();
      // Keep the learner's place if this source is dropped for captions-only playback.
      virtual.current = { base: Number.isFinite(audio.currentTime) ? audio.currentTime : 0, startedAt: 0, running: false };
      audioRef.current = null;
      audio.pause();
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audio.load();
    };
  }, [audioSrc, commit, finish, invalidate]);

  const seek = useCallback(
    (raw: number) => {
      const t = Math.min(Math.max(raw, 0), durationRef.current);
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.min(t, Number.isFinite(audio.duration) ? audio.duration : t);
      virtual.current = { base: t, startedAt: performance.now(), running: virtual.current.running };
      setTime(t);
      // The timeline slider moves in 0.1 s steps, so treat its last step as the end.
      if (t >= durationRef.current - 0.1) {
        finish();
      } else if (statusRef.current === "ended") {
        commit("paused");
      }
    },
    [commit, finish],
  );

  const play = useCallback(() => {
    if (statusRef.current === "loading" || statusRef.current === "error") return;
    if (statusRef.current === "ended") seek(0);
    const token = ++op.current;
    const audio = audioRef.current;

    if (!audio) {
      virtual.current = { base: virtual.current.base >= durationRef.current ? 0 : virtual.current.base, startedAt: performance.now(), running: true };
      commit("playing");
      startLoop();
      return;
    }

    audio.playbackRate = rateRef.current;
    audio.play().then(
      () => {
        if (token !== op.current) return; // superseded by a newer pause/seek
        commit("playing");
        startLoop();
      },
      (error: DOMException) => {
        if (token !== op.current) return;
        commit(error?.name === "NotAllowedError" ? "blocked" : "error");
      },
    );
  }, [commit, seek, startLoop]);

  const pause = useCallback(() => {
    invalidate();
    audioRef.current?.pause();
    const t = readClock();
    virtual.current = { base: t, startedAt: 0, running: false };
    setTime(t);
    if (statusRef.current === "playing" || statusRef.current === "blocked") commit("paused");
  }, [commit, invalidate, readClock]);

  const toggle = useCallback(() => {
    if (statusRef.current === "playing") pause();
    else play();
  }, [pause, play]);

  const setRate = useCallback((next: number) => {
    const t = readClock();
    rateRef.current = next;
    setRateState(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
    if (virtual.current.running) virtual.current = { base: t, startedAt: performance.now(), running: true };
  }, [readClock]);

  const beginScrub = useCallback(() => {
    const wasPlaying = statusRef.current === "playing";
    if (wasPlaying) pause();
    return () => {
      if (wasPlaying && statusRef.current !== "ended") play();
    };
  }, [pause, play]);

  useEffect(() => stopLoop, [stopLoop]);

  return { status, time, duration, rate, play, pause, toggle, seek, setRate, beginScrub };
}
