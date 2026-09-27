import { db } from "@/db";
import { profiles, userProgress, userBadges } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

interface UserStats {
  id: string;
  displayName: string | null;
  xp: number;
  streakCount: number;
  completedLessons: number;
  badgesCount: number;
}

async function getUserStats(userId: string): Promise<UserStats> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!profile) {
    throw new Error("User not found");
  }

  const completedLessons = await db
    .select({ count: userProgress.lessonId })
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.status, "completed")
      )
    );

  const badges = await db
    .select({ count: userBadges.badgeId })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));

  return {
    id: profile.id,
    displayName: profile.displayName,
    xp: profile.xp,
    streakCount: profile.streakCount,
    completedLessons: completedLessons.length,
    badgesCount: badges.length,
  };
}

export async function FriendComparison({
  currentUserId,
  targetUserId,
}: {
  currentUserId: string;
  targetUserId: string;
}) {
  try {
    const [currentUserStats, targetUserStats] = await Promise.all([
      getUserStats(currentUserId),
      getUserStats(targetUserId),
    ]);

    const xpDiff = targetUserStats.xp - currentUserStats.xp;
    const streakDiff = targetUserStats.streakCount - currentUserStats.streakCount;
    const lessonsDiff = targetUserStats.completedLessons - currentUserStats.completedLessons;
    const badgesDiff = targetUserStats.badgesCount - currentUserStats.badgesCount;

    return (
      <div className="bg-white rounded-lg shadow border mb-6">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Friend Comparison</h2>
          <p className="text-sm text-gray-500">How you stack up against {targetUserStats.displayName}</p>
        </div>
        
        <div className="p-4 space-y-4">
          {/* XP Comparison */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">Your XP</p>
              <p className="text-lg font-bold text-purple-600">{currentUserStats.xp}</p>
            </div>
            <div className="px-4">
              {xpDiff > 0 ? (
                <span className="text-red-500 font-medium">-{xpDiff}</span>
              ) : xpDiff < 0 ? (
                <span className="text-green-500 font-medium">+{Math.abs(xpDiff)}</span>
              ) : (
                <span className="text-gray-400">=</span>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-gray-500">Their XP</p>
              <p className="text-lg font-bold text-purple-600">{targetUserStats.xp}</p>
            </div>
          </div>

          {/* Streak Comparison */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">Your Streak</p>
              <p className="text-lg font-bold text-orange-500">{currentUserStats.streakCount} days</p>
            </div>
            <div className="px-4">
              {streakDiff > 0 ? (
                <span className="text-red-500 font-medium">-{streakDiff}</span>
              ) : streakDiff < 0 ? (
                <span className="text-green-500 font-medium">+{Math.abs(streakDiff)}</span>
              ) : (
                <span className="text-gray-400">=</span>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-gray-500">Their Streak</p>
              <p className="text-lg font-bold text-orange-500">{targetUserStats.streakCount} days</p>
            </div>
          </div>

          {/* Lessons Comparison */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">Your Lessons</p>
              <p className="text-lg font-bold text-green-600">{currentUserStats.completedLessons}</p>
            </div>
            <div className="px-4">
              {lessonsDiff > 0 ? (
                <span className="text-red-500 font-medium">-{lessonsDiff}</span>
              ) : lessonsDiff < 0 ? (
                <span className="text-green-500 font-medium">+{Math.abs(lessonsDiff)}</span>
              ) : (
                <span className="text-gray-400">=</span>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-gray-500">Their Lessons</p>
              <p className="text-lg font-bold text-green-600">{targetUserStats.completedLessons}</p>
            </div>
          </div>

          {/* Badges Comparison */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-500">Your Badges</p>
              <p className="text-lg font-bold text-yellow-500">{currentUserStats.badgesCount}</p>
            </div>
            <div className="px-4">
              {badgesDiff > 0 ? (
                <span className="text-red-500 font-medium">-{badgesDiff}</span>
              ) : badgesDiff < 0 ? (
                <span className="text-green-500 font-medium">+{Math.abs(badgesDiff)}</span>
              ) : (
                <span className="text-gray-400">=</span>
              )}
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm text-gray-500">Their Badges</p>
              <p className="text-lg font-bold text-yellow-500">{targetUserStats.badgesCount}</p>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="bg-white rounded-lg shadow border mb-6 p-4">
        <p className="text-gray-500">Unable to load comparison data</p>
      </div>
    );
  }
}
