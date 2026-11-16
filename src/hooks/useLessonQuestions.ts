"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

interface Options {
  token: string;
  /** Called when a question is sent (the player pauses). */
  onAsk: () => void;
  /** Called with each successful answer, so the player can point at the board. */
  onAnswer: (answer: AnswerResponse) => void;
}

let nextId = 1;

/**
 * One follow-up conversation per lesson, shared by the desktop panel and the
 * mobile sheet, so resizing or reopening never loses the thread or the draft.
 * A request still running when the lesson changes is aborted.
 */
export function useLessonQuestions({ token, onAsk, onAnswer }: Options) {
  const [messages, setMessages] = useState<QAMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const inflight = useRef<AbortController | null>(null);
  const callbacks = useRef({ onAsk, onAnswer });
  useEffect(() => {
    callbacks.current = { onAsk, onAnswer };
  }, [onAsk, onAnswer]);
  useEffect(() => () => inflight.current?.abort(), [token]);

  const ask = useCallback(
    async (question: string, history: QAMessage[]) => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;
      setPending(true);
      callbacks.current.onAsk();
      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
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
        callbacks.current.onAnswer(answer);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = navigator.onLine ? (error as Error).message : "Connection lost.";
        setMessages((m) => [...m, { id: nextId++, role: "assistant", content: message, failed: true }]);
      } finally {
        if (inflight.current === controller) {
          inflight.current = null;
          setPending(false);
        }
      }
    },
    [token],
  );

  const send = useCallback(
    (offline: boolean) => {
      const question = draft.trim();
      if (!question || pending || offline) return;
      setMessages((m) => [...m, { id: nextId++, role: "user", content: question }]);
      setDraft("");
      void ask(question, messages);
    },
    [ask, draft, messages, pending],
  );

  const retry = useCallback(
    (failedId: number) => {
      const index = messages.findIndex((m) => m.id === failedId);
      const question = messages.slice(0, index).reverse().find((m) => m.role === "user");
      if (!question) return;
      setMessages((m) => m.filter((x) => x.id !== failedId));
      void ask(question.content, messages.slice(0, messages.indexOf(question)));
    },
    [ask, messages],
  );

  return { messages, draft, setDraft, pending, send, retry };
}

export type LessonQuestions = ReturnType<typeof useLessonQuestions>;
