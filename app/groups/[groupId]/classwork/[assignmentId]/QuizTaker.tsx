"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { submitQuizAttempt } from "@/app/groups/actions";

type QuizOption = { id: string; optionText: string; isCorrect?: boolean };
type QuizQuestion = {
  id: string;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay";
  points: number;
  correctText?: string | null;
  options: QuizOption[];
};

export default function QuizTaker({
  quizId,
  questions,
  attempts,
}: {
  quizId: string;
  questions: QuizQuestion[];
  attempts: { id: string; score: number; maxScore: number | null; completedAt: Date | null }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; text?: string }>>({});
  const [result, setResult] = useState<{ score: number; maxScore: number; passed: boolean | null } | null>(null);

  const completed = attempts.find((a) => a.completedAt);
  const alreadyDone = Boolean(completed);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      try {
        const outcome = await submitQuizAttempt({
          quizId,
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedOptionId: answers[q.id]?.optionId ?? null,
            textAnswer: answers[q.id]?.text ?? null,
          })),
        });
        setResult({ score: outcome.score, maxScore: outcome.maxScore, passed: outcome.passed });
        router.refresh();
        toast.success(`Quiz submitted: ${outcome.score}/${outcome.maxScore}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not submit quiz");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="clay-card p-5 flex flex-col gap-4" data-testid="quiz-taker">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-extrabold">Take the quiz</h3>
        {alreadyDone && (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
            Completed: {completed!.score}/{completed!.maxScore}
          </span>
        )}
      </div>

      {result && (
        <div className="rounded-2xl bg-primary/10 p-4" data-testid="quiz-result">
          <p className="font-extrabold">
            You scored {result.score}/{result.maxScore}
            {result.passed !== null ? (result.passed ? " — passed" : " — not passed yet") : ""}
          </p>
        </div>
      )}

      {questions.map((q, qi) => (
        <fieldset key={q.id} className="rounded-2xl bg-background/60 p-4 flex flex-col gap-3" data-testid="quiz-taker-question">
          <legend className="text-sm font-extrabold">
            {qi + 1}. {q.questionText}{" "}
            <span className="text-xs text-on-surface/50">({q.points} pts)</span>
          </legend>

          {(q.questionType === "multiple_choice" || q.questionType === "true_false") && (
            <div className="flex flex-col gap-2">
              {q.options.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id]?.optionId === o.id}
                    disabled={alreadyDone}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], optionId: o.id } }))}
                    data-testid={`quiz-answer-${q.id}-${o.id}`}
                  />
                  {o.optionText}
                </label>
              ))}
            </div>
          )}

          {(q.questionType === "short_answer" || q.questionType === "essay") && (
            <textarea
              value={answers[q.id]?.text ?? ""}
              disabled={alreadyDone}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
              placeholder="Your answer"
              aria-label={`Answer for question ${qi + 1}`}
              rows={q.questionType === "essay" ? 6 : 2}
              className="rounded-2xl border-2 border-black/5 bg-white px-4 py-3 text-sm focus:outline-none focus:border-primary/40 disabled:bg-black/5"
              data-testid={`quiz-text-${q.id}`}
            />
          )}
        </fieldset>
      ))}

      {!alreadyDone && (
        <button
          type="submit"
          disabled={isPending}
          className="clay-btn bg-tertiary text-white px-6 py-2.5 self-start disabled:opacity-60"
          data-testid="quiz-submit"
        >
          {isPending ? "Grading" : "Submit quiz"}
        </button>
      )}
    </form>
  );
}