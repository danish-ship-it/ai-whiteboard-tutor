"use client";

import { useEffect, useId, useRef } from "react";
import type { LessonQuestions } from "@/hooks/useLessonQuestions";
import { Button, IconButton } from "../ui/Button";
import { SendIcon } from "../ui/icons";

interface Props {
  /** The lesson's conversation, shared by every place the panel is shown. */
  qa: LessonQuestions;
  suggestions: string[];
  offline: boolean;
  /** Shows the board elements an answer refers to. */
  onShowOnBoard: (sceneId: string, highlight: string[]) => void;
  /** Why questions can't be sent right now (e.g. a saved lesson too old for the server), if so. */
  lockedReason?: string;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function Questions({ qa, suggestions, offline: isOffline, onShowOnBoard, lockedReason, composerRef }: Props) {
  const offline = isOffline || !!lockedReason;
  const { messages, draft, setDraft, pending, retry } = qa;
  const send = () => qa.send(offline);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const input = composerRef ?? localRef;
  const scroller = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const inputId = useId();

  // Follow new messages only if the reader was already at the bottom, so rereading isn't interrupted.
  const pinned = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !pinned.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [messages, pending]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 overflow-y-auto pr-1"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && !pending ? (
          <p className="py-2 text-sm text-muted">Ask about a step, or try another example.</p>
        ) : (
          <ul className="space-y-4 py-2">
            {messages.map((m) => (
              <li key={m.id}>
                {m.role === "user" ? (
                  <div className="ml-10">
                    <p className="kicker">You</p>
                    <p className="mt-1 rounded-lg bg-raised p-3 text-base whitespace-pre-wrap">{m.content}</p>
                  </div>
                ) : m.failed ? (
                  <div role="alert" className="rounded-lg border border-danger bg-danger-bg p-3">
                    <p className="text-base text-danger">
                      {m.content}
                      <br />
                      Your question is saved.
                    </p>
                    <Button variant="secondary" className="mt-3 w-28" onClick={() => retry(m.id)} disabled={pending || offline}>
                      Try again
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p className="kicker">Chalk</p>
                    <p className="mt-1 text-base whitespace-pre-wrap">{m.content}</p>
                    {!!m.highlight?.length && m.sceneId && (
                      <Button variant="secondary" className="mt-3" onClick={() => onShowOnBoard(m.sceneId!, m.highlight!)}>
                        Show on the board
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
            {pending && (
              <li>
                <p className="kicker">Chalk</p>
                <p className="mt-1 flex items-center gap-2 text-base text-muted">
                  <span className="relative h-[3px] w-4 overflow-hidden rounded-full bg-divider" aria-hidden="true">
                    <span className="marker-sweep absolute inset-y-0 w-2 rounded-full bg-action" />
                  </span>
                  Working through your question…
                </p>
              </li>
            )}
          </ul>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setDraft(s);
                input.current?.focus();
              }}
              className="h-11 shrink-0 rounded-lg border border-control px-3 text-left text-sm font-semibold hover:border-action hover:bg-selected"
              title={s}
            >
              <span className="block max-w-[260px] truncate">{s}</span>
            </button>
          ))}
        </div>
      )}

      <form
        className="mt-3 rounded-lg border border-control bg-surface p-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus)]"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Ask about this lesson
        </label>
        <textarea
          id={inputId}
          ref={input}
          rows={2}
          value={draft}
          maxLength={500}
          placeholder="Ask about this lesson…"
          aria-describedby={hintId}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter also confirms Korean/Japanese/Chinese composition; never submit mid-composition.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault();
              send();
            }
          }}
          className="block h-12 w-full resize-none bg-transparent text-base leading-6 placeholder:text-muted focus:outline-none"
        />
        <div className="mt-2 flex items-end justify-between gap-2">
          <p id={hintId} className="text-xs text-muted">
            {lockedReason ?? (offline ? "You're offline. Your draft is kept." : pending ? "Thinking… You can draft your next question." : "Enter to send · Shift+Enter for a new line")}
          </p>
          <IconButton type="submit" label="Send question" variant="filled" disabled={!draft.trim() || pending || offline}>
            <SendIcon />
          </IconButton>
        </div>
      </form>
    </div>
  );
}
