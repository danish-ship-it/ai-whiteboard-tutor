"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Whiteboard } from "@/components/board/Whiteboard";
import type { LoadedLesson } from "@/hooks/useLessonSession";
import { usePlayback } from "@/hooks/usePlayback";
import { formatTime } from "@/lib/format";
import { boardStateAt } from "@/lib/timeline/timeline";
import { Button, IconButton } from "../ui/Button";
import { CheckIcon, ChevronUp, CloseIcon, ExpandIcon, PlayIcon, WarningIcon } from "../ui/icons";
import { Questions } from "./Questions";
import { Recall } from "./Recall";
import { Transport } from "./Transport";

interface Props {
  data: LoadedLesson;
  offline: boolean;
  onNewTopic: () => void;
  onContinueWithCaptions: () => void;
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.getAttribute("role") === "menuitemradio");

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function PlayerView({ data, offline, onNewTopic, onContinueWithCaptions }: Props) {
  const { lesson, timeline, scenes, token, voiceError } = data;
  const playback = usePlayback(voiceError ? null : data.audioUrl, timeline.duration);
  const { time, status } = playback;
  const state = useMemo(() => boardStateAt(timeline, time), [timeline, time]);
  // Answer emphasis is shown only while the board stays paused where the answer put it.
  const [answerMark, setAnswerMark] = useState<{ ids: string[]; at: number } | null>(null);
  const emphasis = answerMark && status !== "playing" && Math.abs(time - answerMark.at) < 0.01 ? answerMark.ids : undefined;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recallPicks, setRecallPicks] = useState<Record<number, number>>({});
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const boardRef = useRef<HTMLDivElement>(null);
  const desktopComposer = useRef<HTMLTextAreaElement>(null);
  const sheetHeading = useRef<HTMLHeadingElement>(null);
  const dockButton = useRef<HTMLButtonElement>(null);

  const scene = timeline.scenes[state.sceneIndex];
  const titleProgress = state.sceneIndex === 0 ? 1 : Math.min(1, Math.max(0, (time - scene.start) / 0.6));
  const ready = status === "ready" && time === 0;
  const ended = status === "ended";

  const seekKeepingState = useCallback((t: number) => playback.seek(t), [playback]);

  const step = useCallback(
    (direction: -1 | 1) => {
      const beats = timeline.beats;
      const i = state.beatIndex;
      if (direction === 1) {
        if (i + 1 < beats.length) seekKeepingState(beats[i + 1].start);
      } else {
        // Like a music player: first press returns to the start of the current sentence.
        const target = time - beats[i].start > 1.5 || i === 0 ? beats[i].start : beats[i - 1].start;
        seekKeepingState(target);
      }
    },
    [seekKeepingState, state.beatIndex, time, timeline.beats],
  );

  const restart = useCallback(() => {
    const wasPlaying = status === "playing";
    playback.seek(0);
    if (wasPlaying) playback.play();
  }, [playback, status]);

  const showOnBoard = useCallback(
    (sceneId: string, ids: string[]) => {
      const target = timeline.scenes.find((s) => s.id === sceneId);
      if (!target) return;
      playback.pause();
      // Jump to the end of that scene so every element it refers to is on the board.
      const at = Math.max(target.start, target.end - 0.05);
      playback.seek(at);
      setAnswerMark({ ids, at: Math.min(at, playback.duration) });
      setSheetOpen(false);
      boardRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
    },
    [playback, reducedMotion, timeline.scenes],
  );

  /** Shows a whole scene, paused at its end, so every element it taught is on the board. */
  const showScene = useCallback(
    (sceneId: string) => {
      const target = timeline.scenes.find((sc) => sc.id === sceneId);
      if (!target) return;
      playback.pause();
      playback.seek(Math.max(target.start, target.end - 0.05));
      boardRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    },
    [playback, reducedMotion, timeline.scenes],
  );

  // Global playback shortcuts; never while typing, in menus or on the timeline.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheetOpen || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const onControl = e.target instanceof HTMLElement && (e.target.tagName === "BUTTON" || e.target.getAttribute("type") === "range");
      if (e.key === " " && !onControl) {
        e.preventDefault();
        playback.toggle();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !onControl) {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
      } else if (e.key.toLowerCase() === "r") {
        restart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playback, restart, sheetOpen, step]);

  const openSheet = () => {
    playback.pause();
    setSheetOpen(true);
  };
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    dockButton.current?.focus();
  }, []);

  // Mobile question sheet: focus management and Escape.
  useEffect(() => {
    if (!sheetOpen) return;
    sheetHeading.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSheet();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  const expandBoard = async () => {
    const el = boardRef.current;
    if (!el) return;
    try {
      await el.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape");
    } catch {
      // Fullscreen or orientation lock is unavailable (e.g. iOS Safari); the board stays inline.
    }
  };

  const stepsLabel = `${timeline.scenes.length} steps`;
  const questions = (composerRef?: React.RefObject<HTMLTextAreaElement | null>) => (
    <Questions token={token} suggestions={lesson.suggestedQuestions} offline={offline} onAsk={playback.pause} onShowOnBoard={showOnBoard} composerRef={composerRef} />
  );

  return (
    <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-8 px-4 pt-4 pb-28 md:px-8 md:pt-8 md:pb-10 xl:grid-cols-[minmax(0,1fr)_384px]">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl leading-6 font-semibold md:truncate md:text-2xl md:leading-7" title={lesson.title}>
              {lesson.title}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {voiceError === null && !data.audioUrl ? "Captions only · " : ""}
              {formatTime(playback.duration, false)} lesson · {stepsLabel}
              {timeline.quality === "estimated" && data.audioUrl ? " · approximate sync" : ""}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0" onClick={onNewTopic}>
            New topic
          </Button>
        </div>

        {voiceError && (
          <div role="alert" className="mt-4 flex flex-col gap-3 rounded-lg border border-warning bg-warning-bg p-4 md:flex-row md:items-center">
            <WarningIcon className="hidden shrink-0 text-warning md:block" />
            <div className="flex-1">
              <p className="text-base font-semibold text-warning">The voice couldn&rsquo;t load.</p>
              <p className="text-sm text-fg">The board and captions are ready. ({voiceError})</p>
            </div>
            <Button onClick={onContinueWithCaptions} className="self-start md:self-auto">
              Continue with captions
            </Button>
          </div>
        )}

        <section className="mt-4 overflow-hidden rounded-xl border border-divider shadow-panel" aria-label="Lesson player">
          <div ref={boardRef} className="relative aspect-video w-full bg-board">
            <Whiteboard scenes={scenes} state={state} titleProgress={titleProgress} emphasis={emphasis} reducedMotion={reducedMotion} description={`${lesson.title}. ${lesson.objective}`} />
            {(ready || status === "blocked") && !voiceError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button onClick={playback.play} className="w-40 shadow-popover">
                  <PlayIcon size={16} /> {status === "blocked" ? "Tap to play" : "Start lesson"}
                </Button>
              </div>
            )}
            {status === "loading" && <p className="absolute inset-x-0 bottom-3 text-center text-sm text-muted">Loading the voice…</p>}
            <IconButton label="Expand board" onClick={expandBoard} className="absolute top-2 right-2 bg-board/80 md:hidden">
              <ExpandIcon />
            </IconButton>
          </div>

          <Caption ready={ready} text={state.caption} wordIndex={status === "ready" && time === 0 ? -1 : state.spokenWordIndex} />

          <Transport
            playback={playback}
            scenes={timeline.scenes}
            currentScene={state.sceneIndex}
            canStepBack={time > 0.05}
            canStepForward={state.beatIndex < timeline.beats.length - 1}
            onStep={step}
            onRestart={restart}
          />
        </section>

        {ended || (Object.keys(recallPicks).length > 0 && status !== "playing") ? (
          <Recall
            questions={lesson.recall}
            picked={recallPicks}
            onPick={(q, o) => setRecallPicks((p) => ({ ...p, [q]: o }))}
            onReplay={() => {
              setRecallPicks({});
              if (ended) playback.play();
              else {
                playback.seek(0);
                playback.play();
              }
            }}
            onAsk={() => {
              if (window.matchMedia("(min-width: 1280px)").matches) desktopComposer.current?.focus();
              else openSheet();
            }}
            onShowScene={showScene}
          />
        ) : (
          <p className="mt-5 px-4 text-sm text-muted">
            Step {state.sceneIndex + 1} of {timeline.scenes.length} · {scene?.title}
          </p>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-24 xl:h-[calc(100vh-128px)]">
        <nav aria-label="Lesson outline" className="rounded-xl border border-divider bg-surface p-4 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-base leading-6 font-semibold">Lesson outline</h2>
            <span className="font-mono text-xs text-muted">
              {state.sceneIndex + 1} / {timeline.scenes.length}
            </span>
          </div>
          <ol className="mt-3">
            {timeline.scenes.map((s, i) => {
              const current = i === state.sceneIndex && !ended;
              const earlier = i < state.sceneIndex || ended;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => seekKeepingState(s.start)}
                    aria-current={current ? "step" : undefined}
                    className={`relative flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm ${current ? "bg-selected font-semibold" : "hover:bg-raised"}`}
                  >
                    {current && <span className="absolute inset-y-1 left-0 w-[3px] rounded bg-action" />}
                    <span className="w-4 font-mono text-xs text-muted">{earlier ? <CheckIcon size={16} className="text-action" /> : String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {current && <span className="text-xs font-medium text-action">Now</span>}
                    <span className="font-mono text-xs text-muted">{formatTime(s.start)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section aria-labelledby="questions-heading" className="hidden min-h-[480px] flex-1 flex-col rounded-xl border border-divider bg-surface p-4 shadow-panel xl:flex">
          <h2 id="questions-heading" className="text-xl leading-7 font-semibold">
            Questions
          </h2>
          <p className="text-sm text-muted">Ask about this lesson.</p>
          <div className="mt-3 min-h-0 flex-1">{questions(desktopComposer)}</div>
        </section>
      </aside>

      {/* Mobile and tablet: question dock + bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface px-4 py-2 xl:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <button
          ref={dockButton}
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          className={`flex h-11 w-full items-center justify-between rounded-lg px-4 text-sm font-semibold ${ended ? "bg-action text-on-action" : "border border-control"}`}
        >
          Ask a question <ChevronUp size={16} />
        </button>
      </div>
      {sheetOpen && (
        <div className="fixed inset-0 z-60 xl:hidden">
          <div className="absolute inset-0 bg-[rgba(23,28,25,0.48)]" onClick={closeSheet} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-labelledby="sheet-heading" className="absolute inset-x-0 bottom-0 flex h-[min(564px,85dvh)] flex-col rounded-t-2xl bg-surface px-4 pt-2 pb-4 shadow-sheet">
            <span className="mx-auto h-1 w-10 rounded-full bg-divider" aria-hidden="true" />
            <div className="mt-2 flex items-center justify-between">
              <h2 id="sheet-heading" ref={sheetHeading} tabIndex={-1} className="text-xl leading-7 font-semibold focus:outline-none">
                Questions
              </h2>
              <IconButton label="Close questions" onClick={closeSheet}>
                <CloseIcon />
              </IconButton>
            </div>
            <div className="mt-2 min-h-0 flex-1">{questions()}</div>
          </div>
        </div>
      )}
    </main>
  );
}

function Caption({ ready, text, wordIndex }: { ready: boolean; text: string; wordIndex: number }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <div className="min-h-20 border-t border-divider bg-surface px-4 py-3 md:px-4">
      <p className="kicker hidden md:block" aria-hidden="true">
        Tutor
      </p>
      {ready ? (
        <p className="mt-1 text-base leading-[22px] font-medium md:text-lg md:leading-7">Press play. We&rsquo;ll take it one step at a time.</p>
      ) : (
        <p className="mt-1 text-base leading-[22px] font-medium md:text-lg md:leading-7">
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">
            {words.map((w, i) => (
              <span key={i}>
                <span className={`rounded px-0.5 ${i === wordIndex ? "bg-spoken text-spoken-fg underline decoration-2 underline-offset-4" : ""}`}>{w}</span>{" "}
              </span>
            ))}
          </span>
        </p>
      )}
    </div>
  );
}
