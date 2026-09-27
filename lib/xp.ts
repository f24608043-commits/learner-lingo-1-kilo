/**
 * XP Leveling System — Duolingo-style
 * Level = floor(sqrt(xp / 100)) + 1
 * Each level requires progressively more XP (quadratic curve)
 */

export interface LevelInfo {
  level: number;
  title: string;
  league: "bronze" | "silver" | "gold" | "diamond";
  leagueLabel: string;
  leagueColor: string;
  leagueBg: string;
  leagueGlow: string;
  xpForLevel: number;
  xpForNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

/** Map XP to full level info */
export function getLevelInfo(xp: number): LevelInfo {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpInCurrentLevel = xp - xpForLevel;
  const xpNeededForNext = xpForNextLevel - xpForLevel;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100));

  const leagueMap: Record<
    number,
    { league: LevelInfo["league"]; label: string; color: string; bg: string; glow: string }
  > = {
    1: { league: "bronze",  label: "Bronze League",  color: "#CD7F32", bg: "from-amber-700 to-amber-500",   glow: "league-glow-bronze" },
    2: { league: "bronze",  label: "Bronze League",  color: "#CD7F32", bg: "from-amber-700 to-amber-500",   glow: "league-glow-bronze" },
    3: { league: "silver",  label: "Silver League",  color: "#A8A9AD", bg: "from-gray-500 to-gray-400",     glow: "league-glow-silver" },
    4: { league: "silver",  label: "Silver League",  color: "#A8A9AD", bg: "from-gray-500 to-gray-400",     glow: "league-glow-silver" },
    5: { league: "gold",    label: "Gold League",    color: "#FFD700", bg: "from-yellow-500 to-yellow-400", glow: "league-glow-gold"   },
    6: { league: "gold",    label: "Gold League",    color: "#FFD700", bg: "from-yellow-500 to-yellow-400", glow: "league-glow-gold"   },
    7: { league: "diamond", label: "Diamond League", color: "#60CBFF", bg: "from-cyan-400 to-blue-400",     glow: "league-glow-diamond"},
  };

  const leagueKey = Math.min(7, level);
  const leagueData = leagueMap[leagueKey] ?? leagueMap[7];

  const titles = [
    "Newcomer", "Learner", "Explorer", "Achiever", "Challenger",
    "Expert", "Master", "Legend", "Champion", "Grandmaster",
  ];
  const title = titles[Math.min(level - 1, titles.length - 1)];

  return {
    level,
    title,
    league: leagueData.league,
    leagueLabel: leagueData.label,
    leagueColor: leagueData.color,
    leagueBg: leagueData.bg,
    leagueGlow: leagueData.glow,
    xpForLevel,
    xpForNextLevel,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent,
  };
}

/** XP to award per event type */
export const XP_REWARDS = {
  lesson_complete:    20,
  quiz_correct:       10,
  quiz_perfect:       25,
  daily_goal:         50,
  streak_milestone_7: 100,
  streak_milestone_30:500,
  friend_added:       15,
  first_lesson:       30,
} as const;

/** Daily XP goal — matches Duolingo's casual/regular/serious/insane */
export const DAILY_XP_GOALS = {
  casual:  10,
  regular: 20,
  serious: 30,
  insane:  50,
} as const;
