"use client";

import type { RecallQuestion } from "@/lib/lesson/schema";
import { Button } from "../ui/Button";
import { CheckIcon, CloseIcon } from "../ui/icons";

interface Props {
  questions: RecallQuestion[];
  /** Chosen option per question index; owned by the player so it survives reviewing a scene. */
  picked: Record<number, number>;
  onPick: (question: number, option: number) => void;
  onReplay: () => void;
  onAsk: () => void;
  /** Jumps the board to the scene that taught a question. */
  onShowScene: (sceneId: string) => void;
}

/**
 * End-of-lesson retrieval practice: answering from memory right after the
 * lesson is what makes it stick (research/learning-ux-report.md §2).
 */
export function Recall({ questions, picked, onPick, onReplay, onAsk, onShowScene }: Props) {
  const answered = Object.keys(picked).length;
  const correct = questions.filter((q, i) => picked[i] === q.answer).length;
  const done = answered === questions.length;

  return (
    <section aria-labelledby="recall-heading" className="mt-5 rounded-lg border border-divider bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="recall-heading" className="text-xl leading-7 font-semibold">
          {questions.length ? "Lesson complete. Quick check" : "Lesson complete."}
        </h2>
        {questions.length > 0 && (
          <p className="font-mono text-xs text-muted" aria-live="polite">
            {done ? `${correct} of ${questions.length} right` : `${answered} / ${questions.length} answered`}
          </p>
        )}
      </div>
      {questions.length > 0 && <p className="mt-1 text-sm text-muted">Answer from memory. It helps the lesson stick.</p>}

      <ol className="mt-4 space-y-5">
        {questions.map((q, qi) => {
          const choice = picked[qi];
          const answeredThis = choice !== undefined;
          return (
            <li key={qi}>
              <fieldset disabled={answeredThis}>
                <legend className="text-base font-semibold">
                  <span className="mr-2 font-mono text-xs text-muted">{String(qi + 1).padStart(2, "0")}</span>
                  {q.question}
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((option, oi) => {
                    const isAnswer = oi === q.answer;
                    const state = !answeredThis ? "idle" : isAnswer ? "right" : oi === choice ? "wrong" : "muted";
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => onPick(qi, oi)}
                        aria-pressed={oi === choice}
                        className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                          state === "idle"
                            ? "border-control hover:border-action hover:bg-selected"
                            : state === "right"
                              ? "border-action bg-selected text-fg"
                              : state === "wrong"
                                ? "border-danger bg-danger-bg text-danger"
                                : "border-divider text-muted"
                        }`}
                      >
                        {state === "right" && <CheckIcon size={16} className="text-action" />}
                        {state === "wrong" && <CloseIcon size={16} />}
                        {option}
                        {state === "right" && <span className="sr-only">(correct answer)</span>}
                        {state === "wrong" && <span className="sr-only">(your answer, not correct)</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              {answeredThis && (
                <p className="mt-2 text-sm" role="status">
                  <span className={choice === q.answer ? "font-semibold text-action" : "font-semibold text-danger"}>{choice === q.answer ? "Right. " : "Not quite. "}</span>
                  {q.explanation}
                  {q.sceneId && (
                    <button type="button" onClick={() => onShowScene(q.sceneId)} className="ml-2 font-semibold text-action underline underline-offset-4">
                      See it on the board
                    </button>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onReplay} className="w-[104px]">
          Replay
        </Button>
        <Button variant="secondary" onClick={onAsk}>
          Ask a question
        </Button>
      </div>
    </section>
  );
}
