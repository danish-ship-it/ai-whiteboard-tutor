"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, IconButton } from "../ui/Button";
import { SendIcon } from "../ui/icons";

export interface QAMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  highlight?: string[];
  sceneId?: string;
  failed?: boolean;
}

interface AnswerResponse {
  answer: string;
  highlight: string[];
  sceneId: string;
}

interface Props {
  token: string;
  suggestions: string[];
  offline: boolean;
  /** Called when the learner sends a question (the player pauses). */
  onAsk: () => void;
  /** Shows the board elements an answer refers to. */
  onShowOnBoard: (sceneId: string, highlight: string[]) => void;
  composerRef?: React.RefObject<HTMLTextAreaElement | null>;
}

let nextId = 1;

export function Questions({ token, suggestions, offline, onAsk, onShowOnBoard, composerRef }: Props) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const input = composerRef ?? localRef;
  const scroller = useRef<HTMLDivElement>(null);
  const hintId = useId();

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const ask = async (question: string, history: QAMessage[]) => {
    setPending(true);
    onAsk();
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          question,
          history: history.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error((data as { error?: string }).error ?? "I couldn't answer that.");
      const answer = data as AnswerResponse;
      setMessages((m) => [...m, { id: nextId++, role: "assistant", content: answer.answer, highlight: answer.highlight, sceneId: answer.sceneId }]);
      if (answer.highlight.length && answer.sceneId) onShowOnBoard(answer.sceneId, answer.highlight);
    } catch (error) {
      const message = navigator.onLine ? (error as Error).message : "Connection lost.";
      setMessages((m) => [...m, { id: nextId++, role: "assistant", content: message, failed: true }]);
    } finally {
      setPending(false);
    }
  };

  const send = () => {
    const question = draft.trim();
    if (!question || pending || offline) return;
    const history = messages;
    setMessages((m) => [...m, { id: nextId++, role: "user", content: question }]);
    setDraft("");
    void ask(question, history);
  };

  const retry = (failedId: number) => {
    const index = messages.findIndex((m) => m.id === failedId);
    const question = [...messages.slice(0, index)].reverse().find((m) => m.role === "user");
    if (!question) return;
    const history = messages.slice(0, messages.indexOf(question));
    setMessages((m) => m.filter((x) => x.id !== failedId));
    void ask(question.content, history);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto pr-1" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && !pending ? (
          <div className="mt-6 flex gap-3">
            <span className="w-[3px] shrink-0 bg-action" />
            <div>
              <p className="text-xl leading-7 font-semibold">Keep the question going.</p>
              <p className="mt-3 text-base text-muted">Ask about a step, or try another example.</p>
            </div>
          </div>
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
        <label htmlFor="question" className="sr-only">
          Ask about this lesson
        </label>
        <textarea
          id="question"
          ref={input}
          rows={2}
          value={draft}
          maxLength={500}
          placeholder="Ask about this lesson…"
          aria-describedby={hintId}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="block h-12 w-full resize-none bg-transparent text-base leading-6 placeholder:text-muted focus:outline-none"
        />
        <div className="mt-2 flex items-end justify-between gap-2">
          <p id={hintId} className="text-xs text-muted">
            {offline ? "You're offline. Your draft is kept." : pending ? "Thinking… You can draft your next question." : "Enter to send · Shift+Enter for a new line"}
          </p>
          <IconButton type="submit" label="Send question" disabled={!draft.trim() || pending || offline} className="bg-action text-on-action hover:bg-action-hover">
            <SendIcon />
          </IconButton>
        </div>
      </form>
    </div>
  );
}
