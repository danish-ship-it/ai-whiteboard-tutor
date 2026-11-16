"use client";

import { useEffect, useRef, useState } from "react";
import type { Playback } from "@/hooks/usePlayback";
import { formatTime, spokenTime } from "@/lib/format";
import type { TimedScene } from "@/lib/timeline/timeline";
import { IconButton } from "../ui/Button";
import { CheckIcon, ChevronDown, NextIcon, PauseIcon, PlayIcon, PrevIcon, ReplayIcon, RestartIcon } from "../ui/icons";

const SPEEDS = [1, 1.25, 1.5];

interface Props {
  playback: Playback;
  scenes: TimedScene[];
  currentScene: number;
  canStepBack: boolean;
  canStepForward: boolean;
  onStep: (direction: -1 | 1) => void;
  onRestart: () => void;
}

export function Transport({ playback, scenes, currentScene, canStepBack, canStepForward, onStep, onRestart }: Props) {
  const { status, time, duration } = playback;
  const playing = status === "playing";
  const ended = status === "ended";
  const disabled = status === "loading" || status === "error";

  return (
    <div className="border-t border-divider bg-surface px-3 pt-2 pb-3 md:px-4">
      <Timeline playback={playback} scenes={scenes} />
      <div className="mt-1 flex items-center md:gap-2">
        <IconButton
          label={ended ? "Replay lesson" : playing ? "Pause lesson" : "Play lesson"}
          onClick={playback.toggle}
          disabled={disabled}
          className="bg-action text-on-action hover:bg-action-hover"
        >
          {ended ? <ReplayIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
        <IconButton label="Restart lesson" onClick={onRestart} disabled={disabled}>
          <RestartIcon />
        </IconButton>
        <IconButton label="Back one sentence" onClick={() => onStep(-1)} disabled={disabled || !canStepBack}>
          <PrevIcon />
        </IconButton>
        <IconButton label="Forward one sentence" onClick={() => onStep(1)} disabled={disabled || !canStepForward}>
          <NextIcon />
        </IconButton>
        <p className="ml-1 font-mono text-xs whitespace-nowrap text-muted md:ml-4 md:text-[13px]">
          <span className="hidden md:inline">
            {formatTime(time)} / {formatTime(duration)}
          </span>
          <span className="md:hidden">
            {formatTime(time, false)} / {formatTime(duration, false)}
          </span>
        </p>
        <p className="ml-4 hidden min-w-0 flex-1 truncate text-sm text-muted md:block">{scenes[currentScene]?.title}</p>
        <div className="ml-auto">
          <SpeedMenu rate={playback.rate} onChange={playback.setRate} />
        </div>
      </div>
    </div>
  );
}

function Timeline({ playback, scenes }: { playback: Playback; scenes: TimedScene[] }) {
  const { time, duration } = playback;
  const endScrub = useRef<(() => void) | null>(null);
  const [hover, setHover] = useState<{ x: number; width: number; scene: TimedScene } | null>(null);
  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const sceneAt = (t: number) => [...scenes].reverse().find((s) => s.start <= t) ?? scenes[0];

  const finishScrub = () => {
    endScrub.current?.();
    endScrub.current = null;
  };

  return (
    <div
      className="relative h-11"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        setHover({ x: ratio * rect.width, width: rect.width, scene: sceneAt(ratio * duration) });
      }}
      onPointerLeave={() => setHover(null)}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-control" aria-hidden="true">
        <div className="h-full rounded-full bg-action" style={{ width: `${pct}%` }} />
        {scenes.slice(1).map((s) => (
          <span key={s.id} className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-fg" style={{ left: `${(s.start / Math.max(duration, 0.001)) * 100}%` }} />
        ))}
        <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-action" style={{ left: `${pct}%` }} />
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.001)}
        step={0.1}
        value={Math.min(time, duration)}
        aria-label="Lesson timeline"
        aria-valuetext={`${spokenTime(time)} of ${spokenTime(duration)}, ${sceneAt(time)?.title ?? ""}`}
        onPointerDown={() => {
          endScrub.current = playback.beginScrub();
        }}
        onPointerUp={finishScrub}
        onPointerCancel={finishScrub}
        onChange={(e) => playback.seek(Number(e.target.value))}
        onKeyDown={(e) => {
          // Seek in 5 s steps (spec); Home/End are native.
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            e.stopPropagation();
            playback.seek(time + (e.key === "ArrowRight" ? 5 : -5));
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      {hover && (
        <div
          className="pointer-events-none absolute bottom-full z-40 mb-2 max-w-[248px] -translate-x-1/2 truncate rounded-lg border border-control bg-surface px-3 py-2 text-sm shadow-popover"
          style={{ left: Math.min(Math.max(hover.x, 124), Math.max(124, hover.width - 124)) }}
          aria-hidden="true"
        >
          {hover.scene.title} · <span className="font-mono text-xs">{formatTime(hover.scene.start)}</span>
        </div>
      )}
    </div>
  );
}

function SpeedMenu({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    const close = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && e.target !== button.current) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (r: number) => {
    onChange(r);
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-label={`Playback speed, ${rate}×`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-14 items-center justify-center gap-1 rounded-lg border border-control text-sm font-semibold hover:bg-raised md:w-[92px]"
      >
        {rate}× <ChevronDown size={16} className="hidden md:block" />
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label="Playback speed"
          className="absolute right-0 bottom-full z-40 mb-2 w-28 rounded-lg border border-control bg-surface py-2 shadow-popover"
          onKeyDown={(e) => {
            const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? [])];
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              items[(index + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
            } else if (e.key === "Escape") {
              setOpen(false);
              button.current?.focus();
            }
          }}
        >
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === rate}
              onClick={() => choose(s)}
              className={`flex h-11 w-full items-center gap-2 px-3 text-sm ${s === rate ? "bg-selected font-semibold" : "hover:bg-raised"}`}
            >
              <span className="w-4">{s === rate && <CheckIcon size={16} />}</span>
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
