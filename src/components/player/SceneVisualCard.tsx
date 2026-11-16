"use client";

import type { SceneVisual } from "@/hooks/useSceneVisuals";
import { Button } from "../ui/Button";
import { PlayIcon } from "../ui/icons";

interface Props {
  title: string;
  /** What the picture shows; used as its text alternative. */
  description: string;
  visual: SceneVisual | undefined;
  /** Service that makes new pictures, named in the credit line. */
  provider?: string;
  reducedMotion: boolean;
  onMakeImage: () => void;
  onMakeVideo: () => void;
}

/** "See it for real": an AI illustration of the current scene beside the hand-drawn board. */
export function SceneVisualCard({ title, description, visual, provider, reducedMotion, onMakeImage, onMakeVideo }: Props) {
  const working = visual?.working;
  return (
    <section aria-labelledby="visual-heading" className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="visual-heading" className="text-base leading-6 font-semibold">
          See it for real
        </h2>
        <span className="rounded-full border border-divider px-2 py-0.5 text-xs text-muted">AI illustration</span>
      </div>
      <p className="mt-0.5 truncate text-sm text-muted">{title}</p>

      <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-raised">
        {visual?.video ? (
          <video
            key={visual.video}
            src={visual.video}
            poster={visual.image}
            muted
            loop
            playsInline
            autoPlay={!reducedMotion}
            controls={reducedMotion}
            aria-label={description}
            className="h-full w-full object-cover"
          />
        ) : visual?.image ? (
          // Generated and demo assets are plain URLs; next/image adds nothing for one 16:9 still.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visual.image} alt={description} className="h-full w-full object-cover" />
        ) : working === "image" ? (
          <div className="flex h-full items-center justify-center motion-safe:animate-pulse">
            <p className="text-sm text-muted">Painting the picture…</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <p className="text-sm text-muted">{visual?.error ?? "A realistic picture of this step."}</p>
            <Button variant="secondary" onClick={onMakeImage}>
              {visual?.error ? "Try again" : "Make a picture"}
            </Button>
          </div>
        )}
        {working === "video" && (
          <p role="status" className="absolute inset-x-2 bottom-2 rounded-lg bg-[rgba(23,28,25,0.72)] px-3 py-1.5 text-center text-xs text-white">
            Animating… about a minute
          </p>
        )}
      </div>

      {visual?.image && !visual.video && !working && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-xs text-muted">{visual.error ?? (provider ? `Made with ${provider}` : "AI illustration")}</p>
          <Button variant="secondary" onClick={onMakeVideo}>
            <PlayIcon size={14} /> Bring it to life
          </Button>
        </div>
      )}
    </section>
  );
}
