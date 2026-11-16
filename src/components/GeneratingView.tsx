"use client";

import { useEffect, useRef } from "react";
import type { Stage } from "@/hooks/useLessonSession";
import { MarginStatement } from "./HomeView";
import { Button } from "./ui/Button";
import { CheckIcon, WarningIcon } from "./ui/icons";

const STAGES: Array<{ id: Stage; title: string; detail: string }> = [
  { id: "planning", title: "Planning the lesson", detail: "Finding a clear path through the idea." },
  { id: "drawing", title: "Drawing the board", detail: "Laying out the diagrams and steps." },
  { id: "recording", title: "Recording the voice", detail: "Matching the voice to the board." },
];

export function GeneratingView({ topic, stage, slow, offline, onCancel }: { topic: string; stage: Stage; slow: boolean; offline: boolean; onCancel: () => void }) {
  const current = STAGES.findIndex((s) => s.id === stage);
  return (
    <Shell kicker="Preparing your lesson" topic={topic}>
      <ol className="mt-8 border-y border-divider" aria-label="Lesson progress">
        {STAGES.map((s, i) => {
          const status = i < current ? "done" : i === current ? "current" : "pending";
          return (
            <li key={s.id} aria-current={status === "current" ? "step" : undefined} className="relative flex h-[88px] items-start gap-4 overflow-hidden border-b border-divider px-4 pt-3 last:border-b-0">
              {status === "current" && <span className="absolute inset-y-0 left-0 w-[3px] bg-action" />}
              <span
                className={`mt-2 flex size-8 shrink-0 items-center justify-center rounded font-mono text-xs ${
                  status === "current" ? "bg-action text-on-action" : status === "done" ? "text-action" : "border border-control text-muted"
                }`}
              >
                {status === "done" ? <CheckIcon /> : `0${i + 1}`}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-base leading-6 ${status === "current" ? "font-semibold" : status === "pending" ? "text-muted" : ""}`}>{s.title}</span>
                <span className="block text-sm text-muted">{offline && status === "current" ? "Waiting for a connection…" : s.detail}</span>
              </span>
              <span className="mt-1 w-11 text-right text-xs font-medium text-muted">
                {status === "done" ? "Done" : status === "current" ? (offline ? "Waiting" : "Now") : "Next"}
              </span>
              {status === "current" && (
                <span className="pointer-events-none absolute bottom-2 left-16 h-[3px] w-40 overflow-hidden" aria-hidden="true">
                  <span className="marker-sweep block h-full w-20 rounded-full bg-action" />
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {slow ? "This is taking a little longer. You can keep waiting or cancel." : "Usually 20–40 seconds."}
      </p>
      <Button variant="secondary" className="mt-4 w-28" onClick={onCancel}>
        Cancel
      </Button>
    </Shell>
  );
}

export function GenerationFailed({ topic, message, onRetry, onChangeTopic }: { topic: string; message: string; onRetry: () => void; onChangeTopic: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <Shell kicker="Preparing your lesson" topic={topic}>
      <div role="alert" className="mt-8 rounded-lg border-t-4 border-danger bg-danger-bg p-6">
        <h2 ref={heading} tabIndex={-1} className="flex items-center gap-2 text-xl leading-7 font-semibold text-danger focus:outline-none">
          <WarningIcon /> We couldn&rsquo;t make this lesson.
        </h2>
        <p className="mt-2 text-base text-fg">{message}</p>
        <p className="text-base text-muted">Your topic is saved. Try again, or change the topic.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onRetry} className="w-[120px]">
            Try again
          </Button>
          <Button variant="secondary" onClick={onChangeTopic}>
            Change topic
          </Button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ kicker, topic, children }: { kicker: string; topic: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-x-20 px-4 pt-10 pb-16 md:px-8 md:pt-[104px] xl:grid-cols-[864px_1fr] xl:px-24">
      <section aria-live="polite">
        <p className="kicker">{kicker}</p>
        <h1 className="mt-5 font-serif text-[32px] leading-10 font-normal tracking-[-0.025em] break-words md:text-5xl md:leading-[56px]">{topic}</h1>
        {children}
      </section>
      <MarginStatement />
    </main>
  );
}
