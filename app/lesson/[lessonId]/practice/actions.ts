"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import {
  dailyActivityLog,
  lessons,
  profiles,
  userProgress,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import type { GeneratedQuestion } from "@/lib/ai/generateQuiz";

export interface PracticeSubmissionResult {
  passed: boolean;
  score: number;
  correctCount: number;
  totalQuestions: number;
  bonusXpAwarded: number;
}

/**
 * Grades a practice quiz submission server-side.
 *
 * FR4.6: Awards bonus XP (floor(xpReward / 2)) on pass.
 *        Does NOT change user_progress.status.
 *        Logs to daily_activity_log (counts toward streaks).
 * FR4.7: Enforces lesson completion server-side — rejects if not completed.
 *
 * The `generatedQuestions` payload contains isCorrect so the server can
 * grade without re-running AI. This is safe because practice mode carries
 * no completion state benefit; a cheater gains only a small XP bonus.
 */
export async function submitPracticeQuiz(
  lessonId: string,
  userAnswers: Record<string, number>, // questionIndex -> selected optionIndex
  generatedQuestions: GeneratedQuestion[]
): Promise<PracticeSubmissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // FR4.7: Server-side enforcement — lesson must be completed
  const [progress] = await db
    .select({ status: userProgress.status })
    .from(userProgress)
    .where(
      and(eq(userProgress.userId, user.id), eq(userProgress.lessonId, lessonId))
    )
    .limit(1);

  if (!progress || progress.status !== "completed") {
    throw new Error(
      "Practice mode is only available after completing this lesson."
    );
  }

  // Fetch lesson for xpReward
  const [lesson] = await db
    .select({ xpReward: lessons.xpReward })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) throw new Error("Lesson not found");

  // Grade server-side against the questions received
  let correctCount = 0;
  const total = generatedQuestions.length;

  for (let qIdx = 0; qIdx < generatedQuestions.length; qIdx++) {
    const q = generatedQuestions[qIdx];
    const selectedOptionIdx = userAnswers[qIdx];
    if (selectedOptionIdx !== undefined && selectedOptionIdx !== null) {
      const option = q.options[selectedOptionIdx];
      if (option?.isCorrect) correctCount++;
    }
  }

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= 50;
  const bonusXp = passed ? Math.floor(lesson.xpReward / 2) : 0;

  if (passed) {
    // Award bonus XP and update streak (FR4.6)
    const [profile] = await db
      .select({ xp: profiles.xp, streakCount: profiles.streakCount, lastActiveDate: profiles.lastActiveDate })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    if (profile) {
      const todayStr = new Date().toISOString().split("T")[0];
      let newStreak = profile.streakCount || 0;

      if (!profile.lastActiveDate) {
        newStreak = 1;
      } else {
        const lastActive = new Date(profile.lastActiveDate);
        const today = new Date(todayStr);
        const diffDays = Math.floor(
          (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) newStreak += 1;
        else if (diffDays > 1) newStreak = 1;
      }

      await db
        .update(profiles)
        .set({
          xp: (profile.xp || 0) + bonusXp,
          streakCount: newStreak,
          lastActiveDate: todayStr,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id));

      // Log to daily_activity_log (FR4.6: counts toward streak)
      await db
        .insert(dailyActivityLog)
        .values({ userId: user.id, activityDate: todayStr })
        .onConflictDoNothing();
    }
  }

  return {
    passed,
    score,
    correctCount,
    totalQuestions: total,
    bonusXpAwarded: bonusXp,
  };
}
