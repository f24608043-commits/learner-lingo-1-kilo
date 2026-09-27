"use server";

import { db } from "@/db";
import { badges, userBadges, userProgress, profiles } from "@/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

/**
 * General badge checking and awarding function
 * Called after every progress-changing action (lesson completion, practice quiz, streak update)
 */
export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const badgesAwarded: string[] = [];

  // 1. "First Step" (first_lesson)
  const [firstStepBadge] = await db
    .select()
    .from(badges)
    .where(eq(badges.criteriaType, "first_lesson"))
    .limit(1);

  if (firstStepBadge) {
    const inserted = await db
      .insert(userBadges)
      .values({
        userId,
        badgeId: firstStepBadge.id,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      badgesAwarded.push(firstStepBadge.name);
    }
  }

  // 2. "Level Up" (lessons_completed)
  const [lessonsCompletedBadge] = await db
    .select()
    .from(badges)
    .where(eq(badges.criteriaType, "lessons_completed"))
    .limit(1);

  if (lessonsCompletedBadge) {
    const [{ count: completedCount }] = await db
      .select({ count: count() })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.status, "completed")
        )
      );

    if (completedCount >= lessonsCompletedBadge.criteriaValue) {
      const inserted = await db
        .insert(userBadges)
        .values({
          userId,
          badgeId: lessonsCompletedBadge.id,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        badgesAwarded.push(lessonsCompletedBadge.name);
      }
    }
  }

  // 3. "7 Day Streak" (streak_days)
  const [streakBadge] = await db
    .select()
    .from(badges)
    .where(eq(badges.criteriaType, "streak_days"))
    .limit(1);

  if (streakBadge) {
    const [profile] = await db
      .select({ streakCount: profiles.streakCount })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    if (profile && profile.streakCount >= streakBadge.criteriaValue) {
      const inserted = await db
        .insert(userBadges)
        .values({
          userId,
          badgeId: streakBadge.id,
        })
        .onConflictDoNothing()
        .returning();

      if (inserted.length > 0) {
        badgesAwarded.push(streakBadge.name);
      }
    }
  }

  return badgesAwarded;
}
