"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createQuiz, type QuizQuestionInput } from "@/app/groups/actions";

type DraftOption = { optionText: string; isCorrect: boolean };
type DraftQuestion = {
  questionText: string;
  questionType: QuizQuestionInput["questionType"];
  points: number;
  correctText: string;
  options: DraftOption[];
};

const BLANK: DraftQuestion = {
  questionText: "",
  questionType: "multiple_choice",
  points: 1,
  correctText: "",
  options: [
    { optionText: "", isCorrect: true },
    { optionText: "", isCorrect: false },
  ],
};

export default function QuizBuilder({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<DraftQuestion[]>([{ ...BLANK, options: [...BLANK.options] }]);
  const [timeLimit, setTimeLimit] = useState("");
  const [allowRetakes, setAllowRetakes] = useState(false);
  const [passingScore, setPassingScore] = useState("");

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex: number, oIndex: number, patch: Partial<DraftOption>) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, ...patch } : o)) }
          : q
      )
    );
  }

  function setQuestionType(qIndex: number, type: DraftQuestion["questionType"]) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        if (type === "multiple_choice") {
          return {
            ...q,
            questionType: type,
            options: q.options.length ? q.options : [...BLANK.options],
          };
        }
        // True/false gets fixed options; written types get none.
        if (type === "true_false") {
          return {
            ...q,
            questionType: type,
            options: [
              { optionText: "True", isCorrect: true },
              { optionText: "False", isCorrect: false },
            ],
          };
        }
        return { ...q, questionType: type, options: [] };
      })
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, { ...BLANK, options: [...BLANK.options] }]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = questions.map((q) => ({
      questionText: q.questionText,
      questionType: q.questionType,
      points: Number(q.points) || 1,
      correctText: q.correctText || null,
      options:
        q.questionType === "multiple_choice" || q.questionType === "true_false"
          ? q.options.filter((o) => o.optionText.trim())
          : undefined,
    }));

    startTransition(async () => {
      try {
        await createQuiz({
          assignmentId,
          timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
          allowRetakes,
          maxAttempts: allowRetakes ? 3 : 1,
          passingScore: passingScore ? Number(passingScore) : null,
          questions: payload,
        });
        setOpen(false);
        setQuestions([{ ...BLANK, options: [...BLANK.options] }]);
        router.refresh();
        toast.success("Quiz created");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create quiz");
      }
    });
  }

  if (!open) {
    return (
      <div className="clay-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display font-extrabold">Quiz</h3>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="clay-btn bg-tertiary text-white px-4 py-2 text-xs"
            data-testid="open-quiz-builder"
          >
            Build a quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="clay-card p-5 flex flex-col gap-4" data-testid="quiz-builder">
      <h3 className="font-display font-extrabold">Quiz builder</h3>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
          Time limit (minutes)
          <input
            type="number"
            min={1}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            data-testid="quiz-time-limit"
            className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
          Passing score (points)
          <input
            type="number"
            min={0}
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
            data-testid="quiz-passing-score"
            className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
          />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-on-surface/70 sm:mt-6">
          <input
            type="checkbox"
            checked={allowRetakes}
            onChange={(e) => setAllowRetakes(e.target.checked)}
            data-testid="quiz-allow-retakes"
            className="h-4 w-4"
          />
          Allow retakes
        </label>
      </div>

      {questions.map((q, qi) => (
        <fieldset key={qi} className="rounded-2xl bg-background/60 p-4 flex flex-col gap-3" data-testid="quiz-question">
          <legend className="text-xs font-extrabold uppercase tracking-wide text-on-surface/60">
            Question {qi + 1}
          </legend>

          <textarea
            value={q.questionText}
            onChange={(e) => updateQuestion(qi, { questionText: e.target.value })}
            placeholder="Question text"
            aria-label={`Question ${qi + 1} text`}
            rows={2}
            className="rounded-2xl border-2 border-black/5 bg-white px-4 py-3 font-bold focus:outline-none focus:border-primary/40"
            data-testid={`quiz-question-text-${qi}`}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
              Type
              <select
                value={q.questionType}
                onChange={(e) => setQuestionType(qi, e.target.value as DraftQuestion["questionType"])}
                className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
                data-testid={`quiz-question-type-${qi}`}
              >
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / false</option>
                <option value="short_answer">Short answer</option>
                <option value="essay">Essay</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
              Points
              <input
                type="number"
                min={1}
                value={q.points}
                onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
                data-testid={`quiz-question-points-${qi}`}
              />
            </label>
          </div>

          {(q.questionType === "multiple_choice" || q.questionType === "true_false") && (
            <div className="flex flex-col gap-2">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-on-surface/60 shrink-0">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={o.isCorrect}
                      onChange={() =>
                        setQuestions((prev) =>
                          prev.map((question, i) =>
                            i === qi
                              ? {
                                  ...question,
                                  options: question.options.map((opt, j) => ({
                                    ...opt,
                                    isCorrect: j === oi,
                                  })),
                                }
                              : question
                          )
                        )
                      }
                      data-testid={`quiz-option-correct-${qi}-${oi}`}
                    />
                    Correct
                  </label>
                  <input
                    value={o.optionText}
                    onChange={(e) => updateOption(qi, oi, { optionText: e.target.value })}
                    placeholder={`Option ${oi + 1}`}
                    aria-label={`Question ${qi + 1} option ${oi + 1}`}
                    disabled={q.questionType === "true_false"}
                    className="flex-1 rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 disabled:bg-black/5"
                    data-testid={`quiz-option-text-${qi}-${oi}`}
                  />
                  {q.questionType === "multiple_choice" && q.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((question, i) =>
                            i === qi
                              ? { ...question, options: question.options.filter((_, j) => j !== oi) }
                              : question
                          )
                        )
                      }
                      className="text-xs font-bold text-error shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}

              {q.questionType === "multiple_choice" && (
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(qi, { options: [...q.options, { optionText: "", isCorrect: false }] })
                  }
                  className="self-start text-xs font-bold text-primary underline"
                  data-testid={`quiz-add-option-${qi}`}
                >
                  Add option
                </button>
              )}
            </div>
          )}

          {q.questionType !== "multiple_choice" && q.questionType !== "true_false" && (
            <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
              Model answer (for the tutor)
              <input
                value={q.correctText}
                onChange={(e) => updateQuestion(qi, { correctText: e.target.value })}
                className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
                data-testid={`quiz-model-answer-${qi}`}
              />
            </label>
          )}

          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => removeQuestion(qi)}
              className="self-start text-xs font-bold text-error"
              data-testid={`quiz-remove-question-${qi}`}
            >
              Remove question
            </button>
          )}
        </fieldset>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addQuestion}
          className="clay-btn bg-white text-on-surface px-4 py-2.5 text-xs"
          data-testid="quiz-add-question"
        >
          Add question
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="clay-btn bg-tertiary text-white px-5 py-2.5 disabled:opacity-60"
          data-testid="quiz-save"
        >
          {isPending ? "Saving" : "Save quiz"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="clay-btn bg-white text-on-surface px-4 py-2.5 text-xs"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}