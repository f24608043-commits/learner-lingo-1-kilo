"use client";

import { useState, useTransition } from "react";
import { submitPracticeQuiz, type PracticeSubmissionResult } from "./actions";
import type { GeneratedQuestion } from "@/lib/ai/generateQuiz";
import Link from "next/link";
import Mascot from "@/components/Mascot";

interface PracticeClientProps {
  lessonId: string;
  lessonTitle: string;
  questions: GeneratedQuestion[];
  provider: string;
}

export default function PracticeClient({
  lessonId,
  lessonTitle,
  questions,
  provider,
}: PracticeClientProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<PracticeSubmissionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSelect = (qIdx: number, oIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmit = () => {
    const unanswered = questions.some((_, i) => selectedAnswers[i] === undefined);
    if (unanswered) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await submitPracticeQuiz(lessonId, selectedAnswers, questions);
        setResult(res);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to submit. Please try again.");
      }
    });
  };

  return (
    <div className="w-full px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href={`/lesson/${lessonId}`}
          className="inline-flex items-center gap-2 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors group"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span>Back to Lesson</span>
        </Link>
        <span className="rounded-full bg-primary-container/20 px-3 py-1 font-label-sm font-bold text-primary">
          Bonus XP Quiz
        </span>
      </div>

      {/* Main Header Card */}
      <div className="relative w-full rounded-3xl bg-surface-container-lowest p-6 md:p-8 shadow-xl overflow-hidden mb-6">
        {/* Decorative background gradients */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-tertiary-fixed/30 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Header info */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-lg bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm tracking-wider uppercase">Practice Mode</span>
              <span className="text-outline text-label-sm">•</span>
              <span className="px-3 py-0.5 rounded-lg bg-primary-container/20 text-primary font-label-sm text-label-sm">AI-Generated</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight leading-none">
              {lessonTitle}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              These questions are freshly generated just for extra practice. Pass to earn bonus XP! (Provider: {provider})
            </p>
          </div>

          {/* Right: Mascot */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            <div className="relative max-w-xs bg-surface-container-lowest p-4 rounded-2xl shadow-lg border-b-4 border-surface-container-high order-2 sm:order-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>emoji_events</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">Bonus Challenge</span>
              </div>
              <p className="font-headline-md text-label-md text-on-surface font-bold leading-snug">
                "Earn extra XP by mastering these practice questions!"
              </p>
            </div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <Mascot pose="encouraging" size={128} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl">
        {!result ? (
          <div className="rounded-2xl bg-surface-container-lowest p-6 shadow-md">
            {errorMsg && (
              <div className="mb-6 rounded-xl border border-error bg-error-container p-4 text-sm text-on-error-container">
                {errorMsg}
              </div>
            )}

            <div className="space-y-6">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-xl border border-outline-variant bg-surface-container p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label-sm font-bold uppercase tracking-wider text-on-surface-variant">
                      Question {qIdx + 1} of {questions.length}
                    </span>
                    <span className="font-label-sm font-medium text-on-surface-variant">
                      {q.points} {q.points === 1 ? "point" : "points"}
                    </span>
                  </div>
                  <h3 className="font-label-md text-on-surface mb-4">
                    {q.questionText}
                  </h3>
                  <div className="space-y-3">
                    {q.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[qIdx] === oIdx;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelect(qIdx, oIdx)}
                          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-label-md transition-all ${
                            isSelected
                              ? "border-primary bg-surface-container-high text-primary shadow-glow"
                              : "border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary hover:bg-surface-container"
                          }`}
                        >
                          <span>{opt.optionText}</span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                              isSelected
                                ? "border-primary bg-primary text-on-primary"
                                : "border-outline-variant"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end border-t border-outline-variant pt-6">
              <button
                type="button"
                disabled={isPending}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-container text-on-primary font-label-lg font-bold uppercase tracking-wider shadow-lg hover:bg-primary disabled:opacity-50 transition-all active:translate-y-[2px]"
              >
                {isPending ? "Grading…" : "Submit Practice Quiz"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ) : (
          /* Result Screen */
          <div className="rounded-2xl bg-surface-container-lowest p-8 shadow-md text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface-container text-5xl">
              {result.passed ? "🌟" : "💪"}
            </div>

            <h2 className="font-headline-xl text-headline-xl text-on-surface font-extrabold">
              {result.passed ? "Great Practice!" : "Keep Practicing!"}
            </h2>

            <p className="mt-2 font-body-md text-on-surface-variant">
              {result.passed
                ? `You scored ${result.score}% (${result.correctCount}/${result.totalQuestions} correct).`
                : `You scored ${result.score}%. You need 50% to earn bonus XP.`}
            </p>

            <div className="my-8 inline-flex items-center gap-8 rounded-2xl bg-surface-container px-8 py-6 border border-outline-variant">
              <div>
                <div className="font-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                  Score
                </div>
                <div
                  className={`font-headline-xl text-headline-xl font-extrabold ${
                    result.passed ? "text-primary-container" : "text-secondary"
                  }`}
                >
                  {result.score}%
                </div>
              </div>
              {result.passed && (
                <>
                  <div className="h-12 w-px bg-outline-variant" />
                  <div>
                    <div className="font-label-sm uppercase tracking-wider text-on-surface-variant font-bold">
                      Bonus XP
                    </div>
                    <div className="font-headline-xl text-headline-xl font-extrabold text-secondary-container">
                      +{result.bonusXpAwarded}
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="mb-6 font-body-sm text-on-surface-variant">
              Your lesson progress is unchanged — practice mode is bonus only.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href={`/lesson/${lessonId}/practice`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-container text-on-primary font-label-lg font-bold uppercase tracking-wider shadow-lg hover:bg-primary transition-all active:translate-y-[2px]"
              >
                Practice Again
                <span className="material-symbols-outlined text-[20px]">refresh</span>
              </Link>
              <Link
                href="/path"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-outline-variant font-label-md font-semibold text-on-surface hover:bg-surface-container transition-all"
              >
                Back to Path
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
