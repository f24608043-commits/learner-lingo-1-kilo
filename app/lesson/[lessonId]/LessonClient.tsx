"use client";

import { useState } from "react";
import Link from "next/link";
import { submitQuiz, type QuizSubmissionResult } from "../actions";
import Celebration from "@/components/Celebration";
import Mascot from "@/components/Mascot";
import { triggerMascotPose, triggerMascotAssembly } from "@/lib/mascot";

interface OptionItem {
  id: string;
  optionText: string;
}

interface ChallengeItem {
  id: string;
  questionText: string;
  points: number;
  options: OptionItem[];
}

interface LessonClientProps {
  lessonId: string;
  lessonTitle: string;
  lessonDescription: string | null;
  youtubeVideoId: string;
  xpReward: number;
  unitTitle: string;
  challenges: ChallengeItem[];
  previousStatus?: "completed" | "in_progress" | "locked";
}

export default function LessonClient({
  lessonId,
  lessonTitle,
  lessonDescription,
  youtubeVideoId,
  xpReward,
  unitTitle,
  challenges,
  previousStatus,
}: LessonClientProps) {
  const [stage, setStage] = useState<"watch" | "quiz" | "result" | "celebration">(
    previousStatus === "completed" ? "watch" : "watch"
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOptionSelect = (challengeId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [challengeId]: optionId,
    }));
  };

  const handleSubmitQuiz = async () => {
    const unanswered = challenges.some((c) => !selectedAnswers[c.id]);
    if (unanswered) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await submitQuiz(lessonId, selectedAnswers);
      setResult(res);
      
      // Trigger mascot pose based on result
      if (res.mascotPose) {
        triggerMascotPose(res.mascotPose);
      }
      
      // Trigger assembly animation if badges were awarded
      if (res.badgesAwarded && res.badgesAwarded.length > 0) {
        triggerMascotAssembly();
      }
      
      if (res.passed) {
        setStage("celebration");
      } else {
        setStage("result");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit quiz. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full px-6 py-6">
      {/* Top Breadcrumb Bar & Quick Stats */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/path"
          className="inline-flex items-center gap-2 font-label-md text-label-md text-text-muted hover:text-primary transition-colors group"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">arrow_back</span>
          <span>Return to Learning Path</span>
        </Link>
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-surface text-text-primary font-label-sm text-label-sm shadow-clay-surface border border-surface-border">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          <span className="text-text-muted">Estimated time:</span>
          <span className="font-headline-md text-label-md text-primary">8 mins</span>
        </div>
      </div>

      {/* Main Header Card with Mascot Speech */}
      <div className="relative w-full rounded-3xl bg-surface p-6 md:p-8 shadow-clay-surface overflow-hidden mb-6 border border-surface-border">
        {/* Decorative background gradients */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Lesson Hierarchy, Headline & Scope */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-lg bg-surface-border text-text-muted font-label-sm text-label-sm tracking-wider uppercase">{unitTitle}</span>
              <span className="text-text-muted text-label-sm">•</span>
              <span className="px-3 py-0.5 rounded-lg bg-primary/10 text-primary font-label-sm text-label-sm">Lesson</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
              {lessonTitle}
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              {lessonDescription}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-primary text-white font-label-md text-label-md shadow-clay-primary">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>bolt</span>
                <span>+{xpReward} XP Reward</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-2xl bg-surface-border text-text-primary font-label-md text-label-md shadow-clay-surface">
                <span className="material-symbols-outlined text-primary text-[18px]">code_blocks</span>
                <span>{challenges.length} Interactive Challenges</span>
              </div>
            </div>
          </div>

          {/* Right: Mascot + Speech Bubble */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            {/* Speech Bubble */}
            <div className="relative max-w-xs bg-surface p-4 rounded-2xl shadow-clay-surface border border-surface-border order-2 sm:order-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-secondary text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>local_fire_department</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">7-Day Streak active!</span>
              </div>
              <p className="font-headline-md text-label-md text-text-primary font-bold leading-snug">
                "You're already on a 7-day streak! Let's crush this lesson."
              </p>
              {/* Speech bubble arrow */}
              <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-surface"></div>
            </div>
            {/* Mascot */}
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <Mascot pose="encouraging" size={128} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {stage === "watch" && (
          <div className="rounded-3xl bg-surface p-4 shadow-clay-surface overflow-hidden border border-surface-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">smart_display</span>
                <h2 className="font-headline-md text-headline-md text-text-primary">Video Lecture Preview</h2>
              </div>
              <span className="px-3 py-0.5 rounded-full bg-surface-border text-text-muted font-label-sm text-label-sm">Embedded YouTube Lesson</span>
            </div>

            {/* Video Player */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-surface-border">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0`}
                title={lessonTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setStage("quiz")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-label-lg font-bold uppercase tracking-wider shadow-clay-primary active:shadow-clay-primary-pressed hover:bg-primary-dark transition-all active:translate-y-[2px]"
              >
                Take Quiz
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {stage === "quiz" && (
          <div className="rounded-2xl bg-surface p-6 shadow-clay-surface border border-surface-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary text-white text-sm font-bold shadow-clay-primary">
                  2
                </div>
                <span className="font-headline-md text-headline-md text-text-primary">Quiz</span>
              </div>
              <button
                type="button"
                onClick={() => setStage("watch")}
                className="font-label-sm font-bold text-primary hover:underline"
              >
                ← Rewatch Video
              </button>
            </div>
            <p className="font-body-sm text-text-muted mb-6">
              Answer all questions correctly to earn XP and unlock the next level.
            </p>

            {errorMsg && (
              <div className="mb-6 rounded-2xl border border-error bg-error/10 p-4 text-sm text-error shadow-clay-error">
                {errorMsg}
              </div>
            )}

            <div className="space-y-6">
              {challenges.map((c, cIdx) => (
                <div key={c.id} className="rounded-2xl border border-surface-border bg-surface-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label-sm font-bold uppercase tracking-wider text-text-muted">
                      Question {cIdx + 1} of {challenges.length}
                    </span>
                    <span className="font-label-sm font-medium text-text-muted">
                      {c.points} {c.points === 1 ? "point" : "points"}
                    </span>
                  </div>

                  <h3 className="font-label-md text-text-primary mb-4">{c.questionText}</h3>

                  <div className="space-y-3">
                    {c.options.map((opt) => {
                      const isSelected = selectedAnswers[c.id] === opt.id;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleOptionSelect(c.id, opt.id)}
                          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left font-label-md transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-white shadow-clay-primary"
                              : "border-surface-border bg-surface text-text-primary hover:border-primary hover:bg-surface-border"
                          }`}
                        >
                          <span>{opt.optionText}</span>
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-surface-border"
                            }`}
                          >
                            {isSelected ? "✓" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-label-lg font-bold uppercase tracking-wider shadow-clay-primary active:shadow-clay-primary-pressed hover:bg-primary-dark disabled:opacity-50 transition-all active:translate-y-[2px]"
              >
                {isSubmitting ? "Grading..." : "Submit Answers"}
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {stage === "result" && result && (
          <div className="rounded-2xl bg-surface p-8 shadow-clay-surface border border-surface-border text-center">
            <div className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full text-5xl shadow-clay-surface ${
              result.passed ? "bg-success text-white" : "bg-surface-border text-text-muted"
            }`}>
              {result.passed ? "🎉" : "🔄"}
            </div>

            <h2 className="font-headline-xl text-headline-xl text-text-primary font-extrabold">
              {result.passed ? "Level Completed!" : "Almost There!"}
            </h2>

            <p className="mt-2 font-body-md text-text-muted">
              {result.passed
                ? `Great job! You scored ${result.score}% (${result.correctCount}/${result.totalQuestions} correct) and unlocked the next level.`
                : `You scored ${result.score}%. You need at least 50% to pass and unlock the next level.`}
            </p>

            <div className="my-8 inline-flex items-center gap-8 rounded-2xl bg-surface-border px-8 py-6 border border-surface-border shadow-clay-surface">
              <div>
                <div className="font-label-sm uppercase tracking-wider text-text-muted font-bold">Your Score</div>
                <div
                  className={`font-headline-xl text-headline-xl font-extrabold ${
                    result.passed ? "text-success" : "text-secondary"
                  }`}
                >
                  {result.score}%
                </div>
              </div>

              {result.passed && (
                <>
                  <div className="h-12 w-px bg-surface-border" />
                  <div>
                    <div className="font-label-sm uppercase tracking-wider text-text-muted font-bold">XP Earned</div>
                    <div className="font-headline-xl text-headline-xl font-extrabold text-primary">
                      +{result.xpAwarded}
                    </div>
                  </div>
                </>
              )}
            </div>

            {result.badgesAwarded.length > 0 && (
              <div className="mb-6 rounded-2xl border border-tertiary bg-tertiary/10 p-4 inline-block shadow-clay-tertiary">
                <span className="font-label-sm font-bold uppercase text-tertiary">
                  🏅 New Badge Unlocked!
                </span>
                <p className="mt-1 font-label-md font-semibold text-tertiary">
                  {result.badgesAwarded.join(", ")}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {result.passed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setStage("celebration")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-label-lg font-bold uppercase tracking-wider shadow-clay-primary active:shadow-clay-primary-pressed hover:bg-primary-dark transition-all active:translate-y-[2px]"
                  >
                    View Celebration
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <Link
                    href="/path"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-surface-border font-label-md font-semibold text-text-primary hover:bg-surface-border transition-all shadow-clay-surface"
                  >
                    Skip to Path
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAnswers({});
                      setStage("quiz");
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-label-lg font-bold uppercase tracking-wider shadow-clay-primary active:shadow-clay-primary-pressed hover:bg-primary-dark transition-all active:translate-y-[2px]"
                  >
                    Retake Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("watch")}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-surface-border font-label-md font-semibold text-text-primary hover:bg-surface-border transition-all shadow-clay-surface"
                  >
                    Rewatch Video
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {stage === "celebration" && result && (
          <Celebration
            lessonTitle={lessonTitle}
            xpEarned={result.xpAwarded}
            totalXP={result.totalXP || 0}
            lessonsCompleted={result.lessonsCompleted || 0}
            accuracy={result.score}
            streakDays={result.streakDays || 0}
            badge={result.badgesAwarded.length > 0 ? {
              name: result.badgesAwarded[0],
              description: "Awarded for your achievement!"
            } : undefined}
            onNextLesson={() => window.location.href = "/path"}
            onReview={() => setStage("result")}
            onReturnToPath={() => window.location.href = "/path"}
          />
        )}
      </div>
    </div>
  );
}
