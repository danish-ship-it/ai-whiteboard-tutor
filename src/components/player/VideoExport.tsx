"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneLayout } from "@/lib/board/layout";
import type { Timeline } from "@/lib/timeline/timeline";
import { Button } from "../ui/Button";
import { DownloadIcon } from "../ui/icons";

interface Props {
  scenes: SceneLayout[];
  /** The lesson laid out without the picture corner (see recordLesson). */
  plainScenes: SceneLayout[];
  /** Each step's AI picture by scene id. */
  pictures: Record<string, string | undefined>;
  timeline: Timeline;
  title: string;
  audioUrl: string | null;
  /** The player pauses while the video records, so the two don't compete for the voice. */
  onStart: () => void;
}

type Phase = { kind: "idle" } | { kind: "recording"; progress: number } | { kind: "error"; message: string };

/**
 * "Download video": records the board and the voice into a video file in the browser.
 * The recorder module (and react-dom/server) only load when it's used.
 */
export function VideoExport({ scenes, plainScenes, pictures, timeline, title, audioUrl, onStart }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const start = async () => {
    // One recording at a time, guarded before anything is awaited so a double click can't start two.
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    if (typeof MediaRecorder === "undefined" || typeof AudioContext === "undefined") {
      abort.current = null;
      setPhase({ kind: "error", message: "This browser can't record video. Try Chrome, Edge or Safari." });
      return;
    }
    // Safari only starts audio from inside the click, so the context is made and resumed here.
    const audio = new AudioContext();
    void audio.resume();
    onStart();
    setPhase({ kind: "recording", progress: 0 });
    try {
      const { canRecordVideo, recordLesson, videoFileName } = await import("@/lib/export/record-video");
      if (!canRecordVideo()) throw new Error("unsupported");
      const { blob, extension } = await recordLesson({
        scenes,
        plainScenes,
        pictures,
        timeline,
        title,
        audioUrl,
        audio,
        signal: controller.signal,
        onProgress: (progress) => setPhase({ kind: "recording", progress }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = videoFileName(title, extension);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setPhase({ kind: "idle" });
    } catch (error) {
      void audio.close().catch(() => {});
      if (controller.signal.aborted) setPhase({ kind: "idle" });
      else {
        console.error("Video export failed", error);
        setPhase({ kind: "error", message: "The video couldn't be made in this browser." });
      }
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  };

  if (phase.kind === "recording")
    return (
      <div className="flex shrink-0 items-center gap-3" role="status" aria-live="polite">
        <div className="hidden w-28 sm:block" aria-hidden="true">
          <div className="h-1.5 overflow-hidden rounded-full bg-divider">
            <div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${Math.round(phase.progress * 100)}%` }} />
          </div>
        </div>
        <span className="text-sm text-muted">Recording video… {Math.round(phase.progress * 100)}%</span>
        <Button variant="secondary" onClick={() => abort.current?.abort()}>
          Cancel
        </Button>
      </div>
    );

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button variant="secondary" onClick={start} title="Record this lesson, board and voice, as a video file. It is made on this device and takes as long as the lesson.">
        <DownloadIcon size={16} /> Download video
      </Button>
      {phase.kind === "error" && (
        <p role="alert" className="text-xs text-warning">
          {phase.message}
        </p>
      )}
    </div>
  );
}
