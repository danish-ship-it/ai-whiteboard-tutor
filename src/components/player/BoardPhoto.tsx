"use client";

import { useEffect, useRef } from "react";
import type { SceneVisual } from "@/hooks/useSceneVisuals";
import { BOARD_H, BOARD_W, type Box } from "@/lib/board/layout";

interface Props {
  /** The corner the board layout keeps free for the photo, in board units. */
  box: Box;
  visual: SceneVisual | undefined;
  /** What the picture shows; used as its text alternative. */
  description: string;
  /** The clip plays while the lesson plays and pauses with it. */
  playing: boolean;
  reducedMotion: boolean;
  onRetry: () => void;
}

const pct = (n: number, of: number) => `${(n / of) * 100}%`;

/**
 * The step's AI picture, pinned to the board like a photo, in the corner the
 * drawings are laid out around. Once its clip is ready the photo comes alive.
 */
export function BoardPhoto({ box, visual, description, playing, reducedMotion, onRetry }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const showVideo = !!visual?.video && !reducedMotion;

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }, [playing, showVideo, visual?.video]);

  const style = { left: pct(box.x, BOARD_W), top: pct(box.y, BOARD_H), width: pct(box.w, BOARD_W), height: pct(box.h, BOARD_H) };
  const image = visual?.image;

  return (
    <figure
      style={style}
      className="pointer-events-none absolute m-0 motion-safe:animate-[photo-in_500ms_ease-out]"
      aria-label={image ? description : undefined}
    >
      <div className="relative h-full w-full rotate-[1.2deg] rounded-sm bg-white p-[3%] shadow-[0_6px_18px_rgba(23,28,25,0.22)]">
        {/* A strip of tape holding the photo to the board. */}
        <span aria-hidden="true" className="absolute -top-[6%] left-1/2 h-[12%] w-[28%] -translate-x-1/2 -rotate-2 rounded-[2px] bg-[rgba(240,230,200,0.85)]" />
        <div className="relative h-full w-full overflow-hidden bg-raised">
          {showVideo ? (
            <video
              ref={video}
              key={visual!.video}
              src={visual!.video}
              poster={image}
              muted
              loop
              playsInline
              preload="auto"
              aria-label={description}
              className="h-full w-full object-cover"
            />
          ) : image ? (
            // Generated and demo assets are plain URLs; next/image adds nothing for one still.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={description} className="h-full w-full object-cover" />
          ) : visual?.error ? (
            <div className="pointer-events-auto flex h-full flex-col items-center justify-center gap-2 p-2 text-center">
              <p className="text-[clamp(10px,1.1vw,13px)] text-muted">The picture didn&rsquo;t come out.</p>
              <button type="button" onClick={onRetry} className="rounded-md border border-control px-2 py-1 text-[clamp(10px,1.1vw,13px)] font-semibold hover:bg-selected">
                Try again
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center motion-safe:animate-pulse">
              <p className="text-[clamp(10px,1.1vw,13px)] text-muted">Painting the picture…</p>
            </div>
          )}
          {visual?.working === "video" && image && (
            <p role="status" className="absolute inset-x-0 bottom-0 bg-[rgba(23,28,25,0.6)] py-0.5 text-center text-[clamp(9px,1vw,12px)] text-white">
              Bringing it to life…
            </p>
          )}
        </div>
      </div>
    </figure>
  );
}
