"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatTime } from "@/lib/format";
import {
  deleteLesson,
  listLessons,
  type SavedLessonSummary,
} from "@/lib/storage/history";
import { ICONS } from "@/lib/board/icons";
import { DEMOS, type DemoSlug } from "@/lib/demos";
import {
  AUDIENCES,
  DEFAULT_AUDIENCE,
  type Audience,
} from "@/lib/lesson/audience";
import { Button } from "./ui/Button";
import { ArrowRight, CloseIcon } from "./ui/icons";

const MAX = 140;
const EXAMPLES = [
  "How does a neural network learn?",
  "Why is the sky blue?",
  "How do vaccines work?",
  "Supply and demand",
];
const DEMO_ART: Record<DemoSlug, string> = {
  "solar-system": ICONS["planet-ringed"],
  photosynthesis: ICONS.leaf,
  pythagoras: "M4 20V4L20 20Z M4 16h4v4",
};

interface Props {
  initialTopic: string;
  offline: boolean;
  onSubmit: (topic: string, audience: Audience) => void;
  onOpenDemo: (slug: DemoSlug) => Promise<void>;
  onOpenSaved: (id: string) => Promise<void>;
}

export function HomeView({
  initialTopic,
  offline,
  onSubmit,
  onOpenDemo,
  onOpenSaved,
}: Props) {
  const [topic, setTopic] = useState(initialTopic);
  const [openingDemo, setOpeningDemo] = useState<DemoSlug | null>(null);
  const [audience, setAudience] = useState<Audience>(DEFAULT_AUDIENCE);
  const [error, setError] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const errorId = useId();
  const length = [...topic.trim()].length;
  const tooLong = length > MAX;

  const submit = () => {
    if (length === 0) {
      setError("Enter a topic to start.");
      input.current?.focus();
    } else if (length < 2) {
      setError("Add a little more detail.");
    } else if (tooLong) {
      setError(`Keep your topic to ${MAX} characters or fewer.`);
    } else {
      onSubmit(topic.trim(), audience);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-x-20 px-4 pt-10 pb-16 md:px-8 md:pt-[88px] xl:grid-cols-[864px_1fr] xl:px-24">
      <section aria-labelledby="home-title">
        <p className="kicker">A lesson in two minutes</p>
        <h1
          id="home-title"
          className="mt-5 font-serif text-[40px] leading-[44px] font-normal tracking-[-0.025em] md:mt-6 md:text-[56px] md:leading-[60px]"
        >
          What do you want
          <br />
          to learn?
        </h1>

        <form
          className={`glass-strong mt-6 rounded-2xl p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] md:mt-8 md:p-5 ${error || tooLong ? "border-2 border-danger" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="topic" className="sr-only">
            What do you want to learn?
          </label>
          <textarea
            id="topic"
            ref={input}
            value={topic}
            autoFocus
            rows={2}
            maxLength={MAX * 2}
            placeholder="A topic, a question, a thing that never clicked."
            aria-invalid={!!error || tooLong}
            aria-describedby={errorId}
            onChange={(e) => {
              setTopic(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => {
              // Enter also confirms Korean/Japanese/Chinese composition; never submit mid-composition.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault();
                submit();
              }
            }}
            className="block h-20 w-full resize-none bg-transparent text-lg leading-[26px] placeholder:text-muted focus:outline-none md:text-xl md:leading-7"
          />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <fieldset className="flex items-center gap-2">
              <legend className="sr-only">Who is this lesson for?</legend>
              <span className="text-xs text-muted" aria-hidden="true">
                For
              </span>
              <div className="flex rounded-full bg-raised/80 p-0.5">
                {AUDIENCES.map((a) => (
                  <label
                    key={a.id}
                    className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus)] ${
                      audience === a.id
                        ? "bg-surface text-fg shadow-sm"
                        : "text-muted hover:text-fg"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={a.id}
                      checked={audience === a.id}
                      onChange={() => setAudience(a.id)}
                      className="sr-only"
                    />
                    {a.label}{" "}
                    <span className="font-normal text-muted">{a.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="ml-auto flex items-center gap-4">
              <p className="font-mono text-xs text-muted" aria-live="polite">
                <span className={tooLong ? "text-danger" : undefined}>
                  {length} / {MAX}
                </span>
                <span className="ml-4 hidden md:inline">Enter to start</span>
              </p>
              <Button type="submit" disabled={offline} className="w-[152px]">
                Make a lesson <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        </form>

        <p
          id={errorId}
          role={error ? "alert" : undefined}
          className="mt-2 min-h-10 text-sm text-danger md:min-h-5"
        >
          {error ||
            (tooLong ? `Keep your topic to ${MAX} characters or fewer.` : "")}
        </p>

        <p className="mt-4 text-base text-muted">
          A tutor talks. The board draws. You can ask why.
        </p>

        <p className="kicker mt-8">Watch one now</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3 md:gap-4">
          {DEMOS.map((demo) => (
            <li key={demo.slug}>
              <button
                type="button"
                disabled={openingDemo !== null || offline}
                aria-busy={openingDemo === demo.slug}
                onClick={async () => {
                  setOpeningDemo(demo.slug);
                  await onOpenDemo(demo.slug);
                  setOpeningDemo(null);
                }}
                className="glass-card flex w-full items-center gap-3 rounded-xl p-3 text-left transition-[transform,background-color] duration-200 hover:-translate-y-0.5 disabled:opacity-60 md:flex-col md:items-start md:p-4"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-10 shrink-0 text-action md:size-12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={DEMO_ART[demo.slug]} />
                </svg>
                <span>
                  <span className="block text-sm font-semibold">
                    {demo.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {openingDemo === demo.slug
                      ? "Opening…"
                      : "Ready to play · 2 min"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <SavedLessons onOpen={onOpenSaved} />

        <p className="kicker mt-8">Or try a topic</p>
        <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-x-4 md:gap-y-3">
          {EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                className="flex h-11 w-full items-center rounded-lg border border-control px-3 text-left text-sm font-semibold transition-colors duration-[120ms] hover:border-action hover:bg-selected"
                onClick={() => {
                  setTopic(example);
                  setError("");
                  input.current?.focus();
                }}
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <MarginStatement />
    </main>
  );
}

/** Lessons saved in this browser; they replay without any AI calls. */
function SavedLessons({ onOpen }: { onOpen: (id: string) => Promise<void> }) {
  const [lessons, setLessons] = useState<SavedLessonSummary[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void listLessons().then((list) => live && setLessons(list));
    return () => {
      live = false;
    };
  }, []);
  if (!lessons.length) return null;

  return (
    <section aria-labelledby="saved-heading" className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="saved-heading" className="kicker">
          Your lessons
        </h2>
        <p className="text-xs text-muted">Saved on this device</p>
      </div>
      <ul className="glass mt-3 divide-y divide-divider/70 overflow-hidden rounded-2xl">
        {lessons.map((l) => (
          <li key={l.id} className="flex items-center">
            <button
              type="button"
              disabled={opening !== null}
              aria-busy={opening === l.id}
              onClick={async () => {
                setOpening(l.id);
                await onOpen(l.id);
                setOpening(null);
              }}
              className="flex min-h-12 flex-1 items-center justify-between gap-3 px-4 py-2 text-left hover:bg-selected/60"
            >
              <span className="text-sm font-semibold">{l.title}</span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {opening === l.id
                  ? "Opening…"
                  : `${formatTime(l.duration)} · ${relativeDay(l.createdAt)}`}
              </span>
            </button>
            <button
              type="button"
              aria-label={`Delete ${l.title}`}
              onClick={async () => {
                await deleteLesson(l.id);
                setLessons((all) => all.filter((x) => x.id !== l.id));
              }}
              className="grid size-11 shrink-0 place-items-center text-muted hover:text-danger"
            >
              <CloseIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function relativeDay(time: number): string {
  const days = Math.floor((Date.now() - time) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

export function MarginStatement() {
  return (
    <aside className="hidden pt-[196px] xl:block" aria-hidden="true">
      <div className="flex gap-6">
        <div className="w-0.5 self-stretch bg-action" />
        <div className="w-[264px]">
          <p className="font-serif text-[32px] leading-10">
            See it.
            <br />
            Hear it.
            <br />
            Ask why.
          </p>
          <p className="mt-6 text-sm text-muted">
            A tutor&rsquo;s voice and a board that keeps up.
          </p>
        </div>
      </div>
    </aside>
  );
}
