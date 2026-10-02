import { db } from "@/db";
import { profiles, userProgress, userBadges, badges, friendships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { sendFriendRequest } from "@/app/friends/actions";
import Mascot from "@/components/Mascot";
import { getLevelInfo } from "@/lib/xp";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  const { userId: targetUserId } = await params;

  if (!targetUserId) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="font-headline-lg text-text-primary font-black">User Not Specified</h1>
      </div>
    );
  }

  // Get target user profile
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, targetUserId))
    .limit(1);

  if (!profile) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-24 h-24 mx-auto mb-4">
          <Mascot pose="empty" size={96} />
        </div>
        <h1 className="font-headline-xl text-text-primary font-black mb-2">User Not Found</h1>
        <p className="font-body-md text-text-muted">This learner profile does not exist.</p>
        <Link href="/path" className="inline-block mt-4 text-primary font-bold hover:underline">
          ← Return to Learning Path
        </Link>
      </div>
    );
  }

  const [completedLessons, userBadgesData, allBadges, friendship] = await Promise.all([
    db
      .select({ lessonId: userProgress.lessonId })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, targetUserId),
          eq(userProgress.status, "completed")
        )
      ),
    db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        iconUrl: badges.iconUrl,
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, targetUserId)),
    db
      .select({
        id: badges.id,
        name: badges.name,
        description: badges.description,
        criteriaType: badges.criteriaType,
        criteriaValue: badges.criteriaValue,
        iconUrl: badges.iconUrl,
      })
      .from(badges),
    currentUser
      ? db
          .select()
          .from(friendships)
          .where(
            or(
              and(
                eq(friendships.requesterId, currentUser.id),
                eq(friendships.addresseeId, targetUserId)
              ),
              and(
                eq(friendships.requesterId, targetUserId),
                eq(friendships.addresseeId, currentUser.id)
              )
            )
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const earnedBadgeIds = new Set(userBadgesData.map((b: any) => b.id));
  const lockedBadges = allBadges.filter((b: any) => !earnedBadgeIds.has(b.id));
  const isOwnProfile = currentUser?.id === targetUserId;
  const levelInfo = getLevelInfo(profile.xp ?? 0);

  let friendshipStatus: string | null = null;
  if (friendship && friendship.length > 0) {
    friendshipStatus = friendship[0].status;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* ── Profile Header Card ───────────────────────────────────── */}
      <div className="relative w-full rounded-3xl bg-white p-6 md:p-8 shadow-clay-surface border border-surface-border mb-6 animate-slide-up overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          {/* Avatar + Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-primary via-emerald-400 to-teal-500 text-white font-black text-4xl sm:text-5xl flex items-center justify-center shadow-xl border-4 border-white shrink-0">
                {profile.displayName?.[0] || "?"}
              </div>
              <span className="absolute -bottom-2 -right-2 text-2xl">
                {levelInfo.league === "diamond" ? "💎" : levelInfo.league === "gold" ? "🥇" : levelInfo.league === "silver" ? "🥈" : "🥉"}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="px-3 py-0.5 rounded-full bg-primary/15 text-primary-dark font-label-sm text-xs font-black uppercase tracking-wider border border-primary/20">
                  {profile.role.toUpperCase()}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-orange-100 text-orange-700 font-label-sm text-xs font-black uppercase tracking-wider border border-orange-200">
                  {levelInfo.leagueLabel}
                </span>
              </div>

              <h1 className="font-headline-xl text-text-primary tracking-tight font-black text-2xl sm:text-3xl">
                {profile.displayName || "Anonymous Learner"}
              </h1>

              <p className="font-label-md text-text-muted text-sm font-bold mt-0.5">
                Level {levelInfo.level} · {levelInfo.title}
              </p>

              {/* XP level progress bar */}
              <div className="w-full sm:w-64 mt-3">
                <div className="flex justify-between text-xs font-bold text-text-muted mb-1">
                  <span>Level Progress</span>
                  <span>{levelInfo.progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-xp-end rounded-full progress-fill"
                    style={{ width: `${levelInfo.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Action / Mascot */}
          <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
            <div className="hidden sm:block animate-float">
              <Mascot pose="celebrate" size={80} />
            </div>

            {!isOwnProfile && currentUser && (
              <div className="flex gap-2">
                {friendshipStatus === "accepted" ? (
                  <form action={async () => {
                    "use server";
                    const { startDirectConversation } = await import("@/app/messaging/actions");
                    const { conversationId } = await startDirectConversation(targetUserId);
                    redirect(`/messages/${conversationId}`);
                  }}>
                    <button
                      type="submit"
                      data-testid="profile-message-button"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl font-label-md font-black shadow-md border-b-4 border-primary-dark hover:brightness-105 active:translate-y-[2px] transition-all cursor-pointer text-sm uppercase"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>Message</span>
                    </button>
                  </form>
                ) : friendshipStatus === "pending" ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-100 text-orange-700 rounded-2xl font-label-md font-bold text-xs border border-orange-200">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span>Request Sent</span>
                  </span>
                ) : (
                  <form action={async () => {
                    "use server";
                    await sendFriendRequest(targetUserId);
                  }}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-2xl font-label-md font-black shadow-md border-b-4 border-primary-dark hover:brightness-105 active:translate-y-[2px] transition-all cursor-pointer text-sm uppercase"
                    >
                      <span className="material-symbols-outlined text-[18px]">person_add</span>
                      <span>Add Friend</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 animate-slide-up delay-75">
        <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border p-5 text-center">
          <span className="text-2xl mb-1 block">⚡</span>
          <span className="font-label-sm text-text-muted text-xs uppercase font-bold block">Total XP</span>
          <p className="font-headline-lg text-primary font-black text-2xl mt-0.5">
            {(profile.xp ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border p-5 text-center">
          <span className="text-2xl mb-1 block animate-fire">🔥</span>
          <span className="font-label-sm text-text-muted text-xs uppercase font-bold block">Day Streak</span>
          <p className="font-headline-lg text-secondary font-black text-2xl mt-0.5">
            {profile.streakCount ?? 0}
          </p>
        </div>

        <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border p-5 text-center">
          <span className="text-2xl mb-1 block">📚</span>
          <span className="font-label-sm text-text-muted text-xs uppercase font-bold block">Completed</span>
          <p className="font-headline-lg text-emerald-600 font-black text-2xl mt-0.5">
            {completedLessons.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border p-5 text-center">
          <span className="text-2xl mb-1 block">🏆</span>
          <span className="font-label-sm text-text-muted text-xs uppercase font-bold block">Badges</span>
          <p className="font-headline-lg text-purple-600 font-black text-2xl mt-0.5">
            {userBadgesData.length}
          </p>
        </div>
      </div>

      {/* ── Badges Showcase ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 shadow-clay-surface border border-surface-border mb-8 animate-slide-up delay-150">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-6">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎖️</span>
            <div>
              <h2 className="font-headline-md text-text-primary font-black">Achievements & Badges</h2>
              <p className="font-body-sm text-text-muted text-xs">
                Earned {userBadgesData.length} of {allBadges.length} available badges
              </p>
            </div>
          </div>
          <span className="font-label-sm bg-purple-100 text-purple-700 font-black px-3 py-1 rounded-full text-xs border border-purple-200">
            {Math.round((userBadgesData.length / Math.max(allBadges.length, 1)) * 100)}%
          </span>
        </div>

        {/* Earned Badges */}
        <h3 className="font-label-md text-text-primary font-black mb-3 uppercase tracking-wider text-xs">
          Unlocked ({userBadgesData.length})
        </h3>

        {userBadgesData.length === 0 ? (
          <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 mb-6">
            <p className="text-sm text-text-muted font-bold">No badges unlocked yet. Complete lessons to earn your first badge!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
            {userBadgesData.map((badge: any) => (
              <div
                key={badge.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 text-center shadow-sm hover:scale-105 transition-transform"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 mx-auto mb-2 flex items-center justify-center text-2xl shadow-md border-2 border-white">
                  🏆
                </div>
                <p className="font-label-md font-black text-amber-950 text-sm">{badge.name}</p>
                <p className="font-body-sm text-amber-800/80 text-xs mt-0.5 line-clamp-2">{badge.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <>
            <h3 className="font-label-md text-text-muted font-black mb-3 uppercase tracking-wider text-xs">
              Locked Badges ({lockedBadges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {lockedBadges.map((badge: any) => (
                <div
                  key={badge.id}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-center opacity-70"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-200 mx-auto mb-2 flex items-center justify-center text-xl text-gray-400">
                    🔒
                  </div>
                  <p className="font-label-md font-bold text-gray-700 text-sm">{badge.name}</p>
                  <p className="font-body-sm text-gray-500 text-xs mt-0.5 line-clamp-2">{badge.description}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
