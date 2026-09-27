import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { courses, enrollments, lessons, profiles, units, userProgress } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import { getMySessions } from "@/app/tutoring/actions";
import { getLevelInfo } from "@/lib/xp";

// ── Serpentine path offset pattern (repeating) ──────────────────────────
// Creates the Duolingo zigzag: left-center-right-center repeat
const ZIGZAG = ["-translate-x-12", "translate-x-0", "translate-x-12", "translate-x-0"];

// Colors cycle for unit sections
const UNIT_GRADIENTS = [
  { from: "from-blue-500",   to: "to-cyan-500",    shadow: "rgba(59,130,246,0.4)"  },
  { from: "from-purple-500", to: "to-pink-500",    shadow: "rgba(139,92,246,0.4)"  },
  { from: "from-orange-500", to: "to-red-500",     shadow: "rgba(249,115,22,0.4)"  },
  { from: "from-green-500",  to: "to-teal-500",    shadow: "rgba(34,197,94,0.4)"   },
];

export default async function PathPage() {
  const startTime = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [profileResult, userEnrollments, mySessions] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
    db.select().from(enrollments).where(eq(enrollments.userId, user.id)),
    getMySessions(),
  ]);

  const profile = profileResult[0];

  if (!profile) redirect("/onboarding");
  if (!profile.onboardingDone) redirect("/onboarding");

  const activeEnrollment = userEnrollments.find((e) => e.isActive) || userEnrollments[0];
  if (!activeEnrollment) redirect("/onboarding");

  const [courseResult, courseUnits] = await Promise.all([
    db.select().from(courses).where(eq(courses.id, activeEnrollment.courseId)).limit(1),
    db.select().from(units).where(eq(units.courseId, activeEnrollment.courseId)).orderBy(asc(units.orderIndex)),
  ]);

  const course = courseResult[0];
  if (!course) redirect("/onboarding");

  const unitIds = courseUnits.map((u) => u.id);

  const [courseLessons, progressRows] = await Promise.all([
    unitIds.length > 0
      ? db.select().from(lessons).where(inArray(lessons.unitId, unitIds)).orderBy(asc(lessons.orderIndex))
      : Promise.resolve([]),
    unitIds.length > 0
      ? db.select().from(userProgress).where(and(eq(userProgress.userId, user.id), inArray(userProgress.lessonId, unitIds)))
      : Promise.resolve([]),
  ]);

  const lessonIds = courseLessons.map((l) => l.id);
  const filteredProgress = progressRows.filter((p) => lessonIds.includes(p.lessonId));
  const progressMap = new Map(filteredProgress.map((p) => [p.lessonId, p.status]));

  // State machine: completed → current → locked
  type LessonState = "completed" | "current" | "locked";
  const ordered: Array<{
    lesson: typeof lessons.$inferSelect;
    unit: typeof units.$inferSelect;
    state: LessonState;
    globalIdx: number;
  }> = [];

  for (const unit of courseUnits) {
    const unitLessons = courseLessons.filter((l) => l.unitId === unit.id);
    for (const lesson of unitLessons) {
      ordered.push({ lesson, unit, state: "locked", globalIdx: ordered.length });
    }
  }

  let foundCurrent = false;
  for (const item of ordered) {
    const status = progressMap.get(item.lesson.id);
    if (status === "completed") {
      item.state = "completed";
    } else if (!foundCurrent) {
      item.state = "current";
      foundCurrent = true;
    }
  }

  const currentLesson = ordered.find((i) => i.state === "current");
  const completedCount = ordered.filter((i) => i.state === "completed").length;
  const totalCount = ordered.length;
  const levelInfo = getLevelInfo(profile.xp ?? 0);

  const endTime = Date.now();
  console.log(`[PERF] Path page: ${endTime - startTime}ms`);

  // Group by unit for rendering
  type UnitGroup = { unit: typeof units.$inferSelect; items: typeof ordered; gradientIdx: number };
  const unitGroups: UnitGroup[] = courseUnits.map((unit, idx) => ({
    unit,
    items: ordered.filter((i) => i.unit.id === unit.id),
    gradientIdx: idx % UNIT_GRADIENTS.length,
  }));

  return (
    <div className="w-full px-4 md:px-6 py-6 bg-gradient-to-br from-background via-primary/5 to-secondary/5 min-h-screen">

      {/* ── Welcome Hero Card ─────────────────────────────────── */}
      <section className="w-full mb-6 animate-slide-up">
        <div className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-3xl p-1 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/30 pointer-events-none" />
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5">

            {/* Left: Mascot + greeting */}
            <div className="flex items-center gap-4 z-10">
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-xl border-4 border-white">
                <div className="animate-float">
                  <Mascot pose="encouraging" size={72} />
                </div>
                <span className="absolute top-0 right-0 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-label-sm text-primary uppercase tracking-wider font-extrabold border border-primary/30 px-2 py-0.5 rounded-full text-xs">
                    🎮 {course.title}
                  </span>
                </div>
                <h1 className="font-headline-lg text-text-primary leading-snug">
                  Hey {profile.displayName?.split(" ")[0] || "Learner"}! 🌟
                </h1>
                <p className="font-body-sm text-text-muted">
                  {currentLesson ? `Up next: ${currentLesson.lesson.title}` : "All lessons complete! 🎉"}
                </p>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex items-center gap-3 z-10 flex-shrink-0">
              {/* Streak */}
              <div className="flex flex-col items-center bg-gradient-to-br from-orange-400 to-red-500 text-white px-4 py-3 rounded-2xl text-center min-w-[76px] shadow-xl border-4 border-white/30 hover:scale-105 transition-transform">
                <span className="text-xl animate-fire">🔥</span>
                <span className="font-label-lg font-extrabold leading-tight">{profile.streakCount ?? 0}</span>
                <span className="font-label-sm uppercase opacity-90 font-bold text-xs">Streak</span>
              </div>
              {/* XP */}
              <div className="flex flex-col items-center bg-gradient-to-br from-blue-400 to-purple-500 text-white px-4 py-3 rounded-2xl text-center min-w-[76px] shadow-xl border-4 border-white/30 hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "FILL 1" }}>bolt</span>
                <span className="font-label-lg font-extrabold leading-tight">{(profile.xp ?? 0).toLocaleString()}</span>
                <span className="font-label-sm uppercase opacity-90 font-bold text-xs">XP</span>
              </div>
              {/* Level */}
              <div className="flex flex-col items-center bg-gradient-to-br from-green-400 to-teal-500 text-white px-4 py-3 rounded-2xl text-center min-w-[76px] shadow-xl border-4 border-white/30 hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "FILL 1" }}>emoji_events</span>
                <span className="font-label-lg font-extrabold leading-tight">{levelInfo.level}</span>
                <span className="font-label-sm uppercase opacity-90 font-bold text-xs">Level</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── XP Progress Bar ───────────────────────────────────── */}
      <section className="mb-5 animate-slide-up delay-75">
        <div className="bg-white rounded-2xl p-4 shadow-clay-surface border border-surface-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-text-muted font-bold">{levelInfo.leagueLabel}</span>
              <span className="text-sm">{levelInfo.league === "diamond" ? "💎" : levelInfo.league === "gold" ? "🥇" : levelInfo.league === "silver" ? "🥈" : "🥉"}</span>
            </div>
            <span className="font-label-sm font-extrabold text-primary">
              LVL {levelInfo.level} · {levelInfo.title}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r from-primary to-xp-end rounded-full progress-fill shadow-sm`}
              style={{ width: `${levelInfo.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-label-sm text-text-muted">{levelInfo.xpInCurrentLevel} XP</span>
            <span className="font-label-sm text-text-muted">{levelInfo.xpNeededForNext} XP to next level</span>
          </div>
        </div>
      </section>

      {/* ── Current Lesson Hero CTA ───────────────────────────── */}
      {currentLesson && (
        <section className="mb-6 animate-slide-up delay-150">
          <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 rounded-3xl p-1 shadow-2xl overflow-hidden">
            <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none" />
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 max-w-xl z-10">
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-label-sm px-3 py-1 rounded-full uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-lg text-xs">
                    <span className="material-symbols-outlined text-[13px]">play_circle</span>
                    Next Up
                  </span>
                  <span className="font-label-sm text-text-muted uppercase font-bold text-xs">
                    {currentLesson.unit.title}
                  </span>
                </div>
                <h2 className="font-headline-md text-text-primary">{currentLesson.lesson.title}</h2>
                <p className="font-body-sm text-text-muted">{currentLesson.lesson.description}</p>
                <div className="w-full mt-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-label-sm text-text-muted font-bold text-xs">Progress</span>
                    <span className="font-label-sm font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent text-xs">
                      {completedCount}/{totalCount}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full progress-fill"
                      style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="z-10 flex flex-col items-center w-full md:w-auto gap-2">
                <Link
                  href={`/lesson/${currentLesson.lesson.id}`}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-label-lg uppercase tracking-wider shadow-xl border-b-4 border-purple-700 hover:scale-105 transition-all active:translate-y-[3px] active:border-b-[1px]"
                >
                  <span>Start Lesson</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <div className="flex items-center gap-1 text-secondary font-label-sm text-xs">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "FILL 1" }}>stars</span>
                  <span>+{currentLesson.lesson.xpReward ?? 20} XP on completion</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Sessions ─────────────────────────────────── */}
      {mySessions.length > 0 && (
        <section className="mb-6 animate-slide-up delay-225">
          <div className="bg-white rounded-3xl p-5 shadow-clay-surface border border-surface-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-[22px]" style={{ fontVariationSettings: "FILL 1" }}>videocam</span>
                <h2 className="font-headline-md text-text-primary">Upcoming Sessions</h2>
              </div>
              <Link href="/tutoring" className="font-label-sm text-primary font-bold hover:underline text-sm">View All →</Link>
            </div>
            <div className="space-y-3">
              {mySessions.slice(0, 2).map((session: any) => (
                <div key={session.id} className="rounded-2xl bg-blue-50 p-4 border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="font-label-md text-text-primary font-semibold">
                      {new Date(session.scheduledAt).toLocaleString()}
                    </p>
                    <p className="font-body-sm text-text-muted">{session.durationMins} min session</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 font-label-sm font-bold text-xs border-2 ${
                    session.status === "confirmed" ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}>
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Duolingo Serpentine Path ──────────────────────────── */}
      {unitGroups.map(({ unit, items, gradientIdx }, unitIdx) => {
        const grad = UNIT_GRADIENTS[gradientIdx];
        return (
          <section key={unit.id} className="mb-8 animate-slide-up" style={{ animationDelay: `${300 + unitIdx * 100}ms` }}>
            {/* Unit Header */}
            <div className={`bg-gradient-to-br ${grad.from} ${grad.to} rounded-3xl p-1 shadow-xl overflow-hidden mb-4`}>
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grad.from} ${grad.to} flex items-center justify-center text-white shadow-lg`}>
                    <span className="material-symbols-outlined text-[24px]">school</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-text-muted uppercase tracking-wider font-bold text-xs">
                      Unit {unitIdx + 1}
                    </span>
                    <h3 className="font-headline-md text-text-primary">{unit.title}</h3>
                  </div>
                </div>
                <span className={`font-label-sm text-white bg-gradient-to-r ${grad.from} ${grad.to} px-4 py-1.5 rounded-full font-bold shadow-lg text-xs`}>
                  {items.filter((i) => i.state === "completed").length}/{items.length} done
                </span>
              </div>
            </div>

            {/* Serpentine Nodes */}
            <div className="relative w-full max-w-sm mx-auto py-4 flex flex-col items-center">
              {/* Connector SVG — drawn between nodes */}
              <svg
                className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0"
                width="200"
                height={Math.max(80, items.length * 96)}
                viewBox={`0 0 200 ${Math.max(80, items.length * 96)}`}
                fill="none"
              >
                {items.map((item, ni) => {
                  if (ni === items.length - 1) return null;
                  const x1 = 100 + (ni % 4 === 0 ? -40 : ni % 4 === 2 ? 40 : 0);
                  const x2 = 100 + ((ni + 1) % 4 === 0 ? -40 : (ni + 1) % 4 === 2 ? 40 : 0);
                  const y1 = ni * 96 + 36;
                  const y2 = (ni + 1) * 96 + 36;
                  const midY = (y1 + y2) / 2;
                  const stroke = item.state === "completed" ? "#22C55E" : "#D1D5DB";
                  const dash = item.state === "locked" ? "8 8" : undefined;
                  return (
                    <path
                      key={`conn-${ni}`}
                      d={`M ${x1} ${y1} C ${x1} ${midY} ${x2} ${midY} ${x2} ${y2}`}
                      stroke={stroke}
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeDasharray={dash}
                    />
                  );
                })}
              </svg>

              {/* Node Items */}
              {items.map((item, ni) => {
                const { lesson, state } = item;
                const zigzag = ZIGZAG[ni % ZIGZAG.length];
                const delay = ni * 50;

                return (
                  <div
                    key={lesson.id}
                    className={`relative flex flex-col items-center z-10 mb-16 ${zigzag} animate-pop-in`}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {/* Mascot bubble for current node */}
                    {state === "current" && (
                      <div className="absolute -top-10 -left-32 hidden sm:flex items-center gap-2 animate-bounce">
                        <div className="bg-white px-3 py-2 rounded-2xl shadow-clay-surface border border-surface-border">
                          <p className="font-label-sm text-text-primary text-xs">Let&apos;s go! 🚀</p>
                        </div>
                        <Mascot pose="encouraging" size={28} />
                      </div>
                    )}

                    {/* Node circle */}
                    {state !== "locked" ? (
                      <Link href={`/lesson/${lesson.id}`} className="lesson-node focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        <div className={`lesson-node ${state}`}>
                          <span className="material-symbols-outlined text-white text-[32px]" style={state === "completed" ? { fontVariationSettings: "FILL 1" } : {}}>
                            {state === "completed" ? "check_circle" : "play_circle"}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div className="lesson-node locked cursor-not-allowed">
                        <span className="material-symbols-outlined text-white text-[32px]">lock</span>
                      </div>
                    )}

                    {/* Stars for completed */}
                    {state === "completed" && (
                      <div className="flex items-center gap-0.5 mt-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full shadow-lg border-2 border-white/40 text-xs">
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "FILL 1" }}>star</span>
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "FILL 1" }}>star</span>
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "FILL 1" }}>star</span>
                      </div>
                    )}

                    {/* Lesson label */}
                    <span className="font-label-sm text-text-primary mt-1 text-center max-w-[100px] leading-tight text-xs">
                      {lesson.title}
                    </span>

                    {/* XP badge */}
                    <span className="font-label-sm text-text-muted text-[10px] mt-0.5">
                      +{lesson.xpReward ?? 20} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ── All Complete State ───────────────────────────────── */}
      {totalCount > 0 && completedCount === totalCount && (
        <div className="text-center py-10 animate-pop-in">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <h2 className="font-headline-lg text-text-primary font-extrabold">Course Complete!</h2>
          <p className="font-body-md text-text-muted mt-2">You&apos;ve mastered every lesson. Time to explore more courses!</p>
        </div>
      )}
    </div>
  );
}
