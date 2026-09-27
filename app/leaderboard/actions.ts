"use server";

import { db } from "@/db";
import { profiles, userProgress, lessons, units } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export async function getGlobalLeaderboard(limit: number = 50) {
  const leaderboard = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      xp: profiles.xp,
      streakCount: profiles.streakCount,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .orderBy(desc(profiles.xp))
    .limit(limit);

  return leaderboard;
}

export async function getUnitLeaderboard(unitId: string, limit: number = 50) {
  // Get all lessons in the unit
  const unitLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.unitId, unitId));

  const lessonIds = unitLessons.map((l) => l.id);

  if (lessonIds.length === 0) {
    return [];
  }

  // Count completed lessons per user in this unit
  const completionCounts = await db
    .select({
      userId: userProgress.userId,
      completedCount: userProgress.userId,
    })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.status, "completed"),
        inArray(userProgress.lessonId, lessonIds)
      )
    );

  // Group by user and count completions
  const userCompletions: Record<string, number> = {};
  completionCounts.forEach((c) => {
    userCompletions[c.userId] = (userCompletions[c.userId] || 0) + 1;
  });

  // Get user profiles for users who have completed lessons in this unit
  const userIds = Object.keys(userCompletions);
  if (userIds.length === 0) {
    return [];
  }

  const userProfiles = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      xp: profiles.xp,
      streakCount: profiles.streakCount,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(inArray(profiles.id, userIds));

  // Combine with completion counts and sort
  const leaderboard = userProfiles
    .map((profile) => ({
      ...profile,
      completedLessons: userCompletions[profile.id] || 0,
      totalLessons: lessonIds.length,
      completionPercentage: Math.round(
        ((userCompletions[profile.id] || 0) / lessonIds.length) * 100
      ),
    }))
    .sort((a, b) => b.completedLessons - a.completedLessons)
    .slice(0, limit);

  return leaderboard;
}

export async function getStreakLeaderboard(limit: number = 50) {
  const leaderboard = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      xp: profiles.xp,
      streakCount: profiles.streakCount,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.streakCount, profiles.streakCount)) // Filter to only show users with streaks
    .orderBy(desc(profiles.streakCount))
    .limit(limit);

  return leaderboard;
}

export async function getUserRank(userId: string) {
  // Get user's XP
  const [user] = await db
    .select({ xp: profiles.xp })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  // Count users with higher XP
  const [higherCount] = await db
    .select({ count: profiles.xp })
    .from(profiles)
    .where(eq(profiles.xp, user.xp));

  // Rank is higherCount + 1
  const rank = (higherCount?.count || 0) + 1;

  return {
    rank,
    xp: user.xp,
  };
}
