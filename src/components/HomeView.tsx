"use client";

import { useId, useRef, useState } from "react";
import { Button } from "./ui/Button";
import { ArrowRight } from "./ui/icons";

const MAX = 140;
const EXAMPLES = ["How does a neural network learn?", "Pythagorean theorem", "Photosynthesis", "How TCP handshakes work"];

export function HomeView({ initialTopic, offline, onSubmit }: { initialTopic: string; offline: boolean; onSubmit: (topic: string) => void }) {
  const [topic, setTopic] = useState(initialTopic);
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
      onSubmit(topic.trim());
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-x-20 px-4 pt-10 pb-16 md:px-8 md:pt-[88px] xl:grid-cols-[864px_1fr] xl:px-24">
      <section aria-labelledby="home-title">
        <p className="kicker">A lesson in two minutes</p>
        <h1 id="home-title" className="mt-5 font-serif text-[40px] leading-[44px] font-normal tracking-[-0.025em] md:mt-6 md:text-[56px] md:leading-[60px]">
          What do you want
          <br />
          to learn?
        </h1>

        <form
          className={`mt-6 rounded-xl border bg-surface p-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)] md:mt-8 md:p-5 ${error || tooLong ? "border-2 border-danger" : "border-control"}`}
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="block h-20 w-full resize-none bg-transparent text-lg leading-[26px] placeholder:text-muted focus:outline-none md:text-xl md:leading-7"
          />
          <div className="mt-6 flex items-center justify-between gap-4">
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
        </form>

        <p id={errorId} role={error ? "alert" : undefined} className="mt-2 min-h-10 text-sm text-danger md:min-h-5">
          {error || (tooLong ? `Keep your topic to ${MAX} characters or fewer.` : "")}
        </p>

        <p className="mt-4 text-base text-muted">A tutor talks. The board draws. You can ask why.</p>

        <p className="kicker mt-8">Try a topic</p>
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
          <p className="mt-6 text-sm text-muted">A tutor&rsquo;s voice and a board that keeps up.</p>
        </div>
      </div>
    </aside>
  );
}
