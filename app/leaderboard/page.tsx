import { getGlobalLeaderboard, getStreakLeaderboard, getUserRank } from "./actions";
import { createClient } from "@/utils/supabase/server";
import Mascot from "@/components/Mascot";
import Link from "next/link";
import { getLevelInfo } from "@/lib/xp";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [globalLeaderboard, streakLeaderboard, userRank] = await Promise.all([
    getGlobalLeaderboard(50),
    getStreakLeaderboard(10),
    user ? getUserRank(user.id) : Promise.resolve(null),
  ]);

  const levelInfo = getLevelInfo(userRank?.xp ?? 0);

  // Top 3 Podium
  const top1 = globalLeaderboard[0];
  const top2 = globalLeaderboard[1];
  const top3 = globalLeaderboard[2];
  const restLearners = globalLeaderboard.slice(3);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* ── League Banner ─────────────────────────────────── */}
      <div className={`relative w-full rounded-3xl p-1 mb-6 shadow-2xl overflow-hidden bg-gradient-to-r ${levelInfo.leagueBg} ${levelInfo.leagueGlow} animate-slide-up`}>
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none" />
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-xl bg-gradient-to-br from-white to-gray-50 border-4 border-white/80">
              {levelInfo.league === "diamond" ? "💎" : levelInfo.league === "gold" ? "🏆" : levelInfo.league === "silver" ? "🥈" : "🥉"}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-label-sm uppercase tracking-wider font-extrabold px-3 py-0.5 rounded-full text-white bg-black/70 text-xs">
                  Current League
                </span>
                <span className="text-text-muted text-xs font-bold">• Duolingo Tier</span>
              </div>
              <h1 className="font-headline-xl text-text-primary tracking-tight">
                {levelInfo.leagueLabel}
              </h1>
              <p className="font-body-sm text-text-muted">
                Top learners advance each week! Compete to earn badges and XP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {userRank && (
              <div className="bg-surface rounded-2xl p-4 shadow-clay-surface border border-surface-border text-center min-w-[110px]">
                <span className="font-label-sm text-text-muted text-xs uppercase font-bold">Your Rank</span>
                <p className="font-headline-lg text-primary font-black">#{userRank.rank}</p>
                <span className="font-label-sm text-xs text-text-muted">{userRank.xp} XP</span>
              </div>
            )}
            <div className="w-24 h-24 hidden sm:flex items-center justify-center shrink-0">
              <div className="animate-float">
                <Mascot pose="celebrate" size={96} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top 3 Podium (Duolingo Style: 2nd - 1st - 3rd) ────────────────────────── */}
      {top1 && (
        <div className="mb-10 animate-slide-up delay-75">
          <div className="text-center mb-4">
            <h2 className="font-headline-md text-text-primary font-black tracking-tight">
              Top Champions 🌟
            </h2>
            <p className="font-body-sm text-text-muted">The highest XP earners this week</p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-lg mx-auto pt-8">
            {/* Rank 2 (Silver) */}
            <div className="flex flex-col items-center">
              {top2 ? (
                <>
                  <div className="relative mb-2">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">🥈</span>
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 p-1 shadow-lg border-4 border-white flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl">
                      {top2.displayName?.[0] || "?"}
                    </div>
                  </div>
                  <Link href={`/profile/${top2.id}`} className="font-label-sm font-bold text-text-primary truncate max-w-[100px] text-center hover:text-primary">
                    {top2.displayName || "Learner"}
                  </Link>
                  <span className="font-label-sm text-xs font-black text-gray-600 mb-2">{top2.xp} XP</span>
                  <div className="w-full h-24 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-2xl flex items-center justify-center border-t-4 border-gray-400 shadow-inner">
                    <span className="font-headline-lg font-black text-gray-600">2</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-24 bg-gray-100 rounded-t-2xl" />
              )}
            </div>

            {/* Rank 1 (Gold) */}
            <div className="flex flex-col items-center -mt-6">
              <div className="relative mb-2">
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl animate-bounce">👑</span>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 p-1.5 shadow-2xl border-4 border-white league-glow-gold flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl">
                  {top1.displayName?.[0] || "?"}
                </div>
              </div>
              <Link href={`/profile/${top1.id}`} className="font-label-md font-black text-text-primary truncate max-w-[110px] text-center hover:text-primary">
                {top1.displayName || "Champion"}
              </Link>
              <span className="font-label-sm text-xs font-black text-yellow-600 mb-2">{top1.xp} XP</span>
              <div className="w-full h-32 bg-gradient-to-t from-amber-400 to-yellow-300 rounded-t-2xl flex items-center justify-center border-t-4 border-amber-500 shadow-inner">
                <span className="font-headline-xl font-black text-white drop-shadow">1</span>
              </div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div className="flex flex-col items-center">
              {top3 ? (
                <>
                  <div className="relative mb-2">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">🥉</span>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 p-1 shadow-lg border-4 border-white flex items-center justify-center text-white font-extrabold text-lg sm:text-xl">
                      {top3.displayName?.[0] || "?"}
                    </div>
                  </div>
                  <Link href={`/profile/${top3.id}`} className="font-label-sm font-bold text-text-primary truncate max-w-[90px] text-center hover:text-primary">
                    {top3.displayName || "Learner"}
                  </Link>
                  <span className="font-label-sm text-xs font-black text-amber-700 mb-2">{top3.xp} XP</span>
                  <div className="w-full h-16 bg-gradient-to-t from-amber-200 to-amber-100 rounded-t-2xl flex items-center justify-center border-t-4 border-amber-300 shadow-inner">
                    <span className="font-headline-lg font-black text-amber-800">3</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-16 bg-gray-100 rounded-t-2xl" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Rankings List (Ranks 4+) ────────────────────────── */}
      <div className="bg-white rounded-3xl p-4 md:p-6 shadow-clay-surface border border-surface-border mb-8 animate-slide-up delay-150">
        <div className="flex items-center justify-between pb-4 border-b border-surface-border mb-4">
          <h3 className="font-headline-md text-text-primary font-black">Full Standings</h3>
          <span className="font-label-sm text-text-muted text-xs uppercase tracking-wider font-bold">Total: {globalLeaderboard.length}</span>
        </div>

        <div className="space-y-2">
          {restLearners.map((learner: any, idx: number) => {
            const rank = idx + 4;
            const isMe = user?.id === learner.id;

            return (
              <div
                key={learner.id}
                className={`p-3 md:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 transition-all ${
                  isMe
                    ? "bg-primary/10 border-2 border-primary shadow-clay-primary scale-[1.01]"
                    : "bg-surface hover:bg-surface-border border border-surface-border"
                }`}
              >
                <div className="w-7 text-center font-headline-md font-black text-text-muted text-sm sm:text-base">
                  {rank}
                </div>

                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-secondary text-white font-extrabold flex items-center justify-center text-base shadow-sm shrink-0 border-2 border-white">
                  {learner.displayName?.[0] || "?"}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${learner.id}`}
                    className="font-label-md text-text-primary font-bold truncate block hover:text-primary transition-colors text-sm sm:text-base"
                  >
                    {learner.displayName || "Anonymous Learner"} {isMe && "(You)"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {learner.streakCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        🔥 {learner.streakCount}d streak
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full border border-yellow-200 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-yellow-600" style={{ fontVariationSettings: "FILL 1" }}>bolt</span>
                    <span className="font-label-md font-black text-xs sm:text-sm">{learner.xp} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Streak Hall of Fame ─────────────────────────────── */}
      {streakLeaderboard.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-5 md:p-6 border-2 border-orange-200 shadow-lg animate-slide-up delay-225">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl animate-fire">🔥</span>
            <div>
              <h3 className="font-headline-md text-orange-950 font-black">Streak Hall of Fame</h3>
              <p className="font-body-sm text-orange-800/80 text-xs">Learners with the longest consecutive practice days</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {streakLeaderboard.slice(0, 6).map((item: any, i: number) => (
              <div key={item.id} className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between border border-orange-200/80 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-headline-md font-black text-orange-500 w-5 text-center text-sm">{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-xs">
                    {item.displayName?.[0] || "?"}
                  </div>
                  <span className="font-label-sm font-bold text-text-primary truncate text-xs sm:text-sm">{item.displayName || "Learner"}</span>
                </div>
                <span className="font-label-sm font-black text-orange-600 shrink-0 text-xs bg-orange-100 px-2 py-1 rounded-full">
                  🔥 {item.streakCount} days
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
