"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import {
  badges,
  challengeOptions,
  challenges,
  dailyActivityLog,
  lessons,
  profiles,
  units,
  userBadges,
  userProgress,
} from "@/db/schema";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { checkAndAwardBadges } from "@/app/gamification/actions";

export interface QuizSubmissionResult {
  success: boolean;
  passed: boolean;
  score: number;
  totalQuestions: number;
  correctCount: number;
  xpAwarded: number;
  badgesAwarded: string[];
  message?: string;
  totalXP?: number;
  lessonsCompleted?: number;
  streakDays?: number;
  mascotPose?: "idle" | "celebrate" | "empty" | "encouraging" | "waving" | "thinking" | "pointing";
}

export async function submitQuiz(
  lessonId: string,
  userAnswers: Record<string, string>,
  // Client-submitted score parameter to test tamper-resistance (MUST BE IGNORED)
  _clientSuppliedScore?: number
): Promise<QuizSubmissionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // 1. Fetch lesson details
  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error("Lesson not found");
  }

  // 2. Fetch challenges for this lesson from database
  const lessonChallenges = await db
    .select()
    .from(challenges)
    .where(and(eq(challenges.lessonId, lessonId), eq(challenges.isPublished, true)));

  if (lessonChallenges.length === 0) {
    throw new Error("No quiz questions found for this lesson");
  }

  const challengeIds = lessonChallenges.map((c) => c.id);

  // 3. Fetch challenge options from database (source of truth for correct answers)
  const options = await db
    .select()
    .from(challengeOptions)
    .where(inArray(challengeOptions.challengeId, challengeIds));

  // 4. Grade server-side (FR3.3: client score is completely ignored)
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctCount = 0;

  for (const challenge of lessonChallenges) {
    totalPoints += challenge.points;
    const selectedOptionId = userAnswers[challenge.id];

    if (selectedOptionId) {
      const option = options.find(
        (o) => o.id === selectedOptionId && o.challengeId === challenge.id
      );

      if (option && option.isCorrect) {
        earnedPoints += challenge.points;
        correctCount++;
      }
    }
  }

  const calculatedPercentage = totalPoints > 0
    ? Math.round((earnedPoints / totalPoints) * 100)
    : 0;

  const passed = calculatedPercentage >= 50;
  const badgesAwarded: string[] = [];

  // 5. Update user_progress
  const [existingProgress] = await db
    .select()
    .from(userProgress)
    .where(and(eq(userProgress.userId, user.id), eq(userProgress.lessonId, lessonId)))
    .limit(1);

  const newAttempts = (existingProgress?.attempts || 0) + 1;

  if (passed) {
    await db
      .insert(userProgress)
      .values({
        userId: user.id,
        lessonId,
        status: "completed",
        score: calculatedPercentage,
        attempts: newAttempts,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.lessonId],
        set: {
          status: "completed",
          score: calculatedPercentage,
          attempts: newAttempts,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    // 6. Award XP and update streak in profiles
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const todayStr = new Date().toISOString().split("T")[0];
    let newStreak = profile?.streakCount || 0;

    if (profile) {
      if (!profile.lastActiveDate) {
        newStreak = 1;
      } else {
        const lastActive = new Date(profile.lastActiveDate);
        const today = new Date(todayStr);
        const diffDays = Math.floor(
          (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }

      await db
        .update(profiles)
        .set({
          xp: (profile.xp || 0) + lesson.xpReward,
          streakCount: newStreak,
          lastActiveDate: todayStr,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id));
    }

    // 7. Insert daily activity log
    await db
      .insert(dailyActivityLog)
      .values({
        userId: user.id,
        activityDate: todayStr,
      })
      .onConflictDoNothing();

    // 8. Check and award general badges
    const generalBadges = await checkAndAwardBadges(user.id);
    badgesAwarded.push(...generalBadges);

    // 9. Unit completion badge (FR9.1d) - special case not in general function
    // Check if ALL lessons in this lesson's unit are now completed by this user
    const [thisLesson] = await db
      .select({ unitId: lessons.unitId })
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);

    if (thisLesson) {
      const [thisUnit] = await db
        .select({ id: units.id, badgeId: units.badgeId })
        .from(units)
        .where(eq(units.id, thisLesson.unitId))
        .limit(1);

      if (thisUnit?.badgeId) {
        const unitLessons = await db
          .select({ id: lessons.id })
          .from(lessons)
          .where(eq(lessons.unitId, thisUnit.id));

        const unitLessonIds = unitLessons.map((l) => l.id);

        if (unitLessonIds.length > 0) {
          const [{ count: completedInUnit }] = await db
            .select({ count: count() })
            .from(userProgress)
            .where(
              and(
                eq(userProgress.userId, user.id),
                eq(userProgress.status, "completed"),
                inArray(userProgress.lessonId, unitLessonIds)
              )
            );

          if (Number(completedInUnit) >= unitLessonIds.length) {
            const [unitBadge] = await db
              .select({ id: badges.id, name: badges.name })
              .from(badges)
              .where(eq(badges.id, thisUnit.badgeId))
              .limit(1);

            if (unitBadge) {
              const inserted = await db
                .insert(userBadges)
                .values({ userId: user.id, badgeId: unitBadge.id })
                .onConflictDoNothing()
                .returning();

              if (inserted.length > 0) {
                badgesAwarded.push(unitBadge.name);
              }
            }
          }
        }
      }
    }
  } else {
    // Failed attempt
    await db
      .insert(userProgress)
      .values({
        userId: user.id,
        lessonId,
        status: "in_progress",
        score: calculatedPercentage,
        attempts: newAttempts,
      })
      .onConflictDoUpdate({
        target: [userProgress.userId, userProgress.lessonId],
        set: {
          score: calculatedPercentage,
          attempts: newAttempts,
          updatedAt: new Date(),
        },
      });
  }

  // Fetch additional stats for celebration
  const [profileStats] = await db
    .select({ xp: profiles.xp, streakCount: profiles.streakCount })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const [{ count: lessonsCompleted }] = await db
    .select({ count: count() })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, user.id),
        eq(userProgress.status, "completed")
      )
    );

  // Determine mascot pose based on result
  let mascotPose: QuizSubmissionResult["mascotPose"];
  if (passed) {
    if (badgesAwarded.length > 0) {
      mascotPose = "celebrate"; // Badge unlocked
    } else {
      mascotPose = "encouraging"; // Lesson passed
    }
  } else {
    mascotPose = "encouraging"; // Wrong answer - encourage to try again
  }

  return {
    success: true,
    passed,
    score: calculatedPercentage,
    totalQuestions: lessonChallenges.length,
    correctCount,
    xpAwarded: passed ? lesson.xpReward : 0,
    badgesAwarded,
    totalXP: profileStats?.xp || 0,
    lessonsCompleted: Number(lessonsCompleted) || 0,
    streakDays: profileStats?.streakCount || 0,
    mascotPose,
  };
}
