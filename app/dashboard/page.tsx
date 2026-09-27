import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { 
  profiles, 
  notifications, 
  userProgress, 
  lessons, 
  units, 
  courses, 
  enrollments,
  tutorSessions,
  tutorProfiles
} from "@/db/schema";
import { eq, and, desc, count, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getLevelInfo } from "@/lib/xp";
import Mascot from "@/components/Mascot";
import { getMySessions } from "@/app/tutoring/actions";
import dynamic from "next/dynamic";

// Lazy load components
const NotificationBell = dynamic(() => import("@/components/NotificationBell"), { loading: () => null });

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Get profile
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) redirect("/onboarding");
  if (!profile.onboardingDone) redirect("/onboarding");

  // Get active enrollment
  const [activeEnrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, user.id), eq(enrollments.isActive, true)))
    .limit(1);

  // Get my sessions
  const mySessions = await getMySessions();
  const now = new Date();
  const upcomingSessions = mySessions
    .filter((s: any) => new Date(s.scheduledAt) > now)
    .slice(0, 3);

  // Get course progress
  let courseProgress = null;
  let nextLesson = null;
  let totalLessons = 0;
  let completedLessons = 0;

  if (activeEnrollment) {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, activeEnrollment.courseId))
      .limit(1);

    if (course) {
      const courseUnits = await db
        .select()
        .from(units)
        .where(eq(units.courseId, course.id))
        .orderBy(units.orderIndex);

      const unitIds = courseUnits.map(u => u.id);
      const courseLessons = unitIds.length > 0 ? await db
        .select()
        .from(lessons)
        .where(inArray(lessons.unitId, unitIds))
        .orderBy(lessons.orderIndex) : [];

      const lessonIds = courseLessons.map(l => l.id);
      const progressRows = lessonIds.length > 0 ? await db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, user.id), inArray(userProgress.lessonId, lessonIds))) : [];

      const progressMap = new Map(progressRows.map(p => [p.lessonId, p.status]));
      totalLessons = courseLessons.length;
      completedLessons = courseLessons.filter(l => progressMap.get(l.id) === "completed").length;

      // Find next lesson
      for (const lesson of courseLessons) {
        if (progressMap.get(lesson.id) !== "completed") {
          nextLesson = lesson;
          break;
        }
      }

      courseProgress = {
        course,
        totalLessons,
        completedLessons,
        nextLesson,
        progressPercent: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    }
  }

  // Get unread notifications count
  const [unreadCount] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

  // Get recent notifications
  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(5);

  const levelInfo = getLevelInfo(profile.xp ?? 0);

  return (
    <div className="w-full px-4 md:px-6 py-6 bg-gradient-to-br from-background via-primary/5 to-secondary/5 min-h-screen">
      {/* ── Notification Bell ─────────────────────────────────── */}
      <NotificationBell count={Number(unreadCount.count) ?? 0} />

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
                    🎮 {courseProgress?.course.title || "Learning"}
                  </span>
                </div>
                <h1 className="font-headline-lg text-text-primary leading-snug">
                  Hey {profile.displayName?.split(" ")[0] || "Learner"}! 🌟
                </h1>
                <p className="font-body-sm text-text-muted">
                  {nextLesson ? `Up next: ${nextLesson.title}` : courseProgress ? "All lessons complete! 🎉" : "Enroll in a course to begin your journey"}
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
      {nextLesson && (
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
                    {courseProgress?.course.title || ""}
                  </span>
                </div>
                <h2 className="font-headline-md text-text-primary">{nextLesson.title}</h2>
                <p className="font-body-sm text-text-muted">{nextLesson.description}</p>
                <div className="w-full mt-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-label-sm text-text-muted font-bold text-xs">Progress</span>
                    <span className="font-label-sm font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent text-xs">
                      {completedLessons}/{totalLessons}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full progress-fill"
                      style={{ width: totalLessons > 0 ? `${(completedLessons / totalLessons) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>
              <div className="z-10 flex flex-col items-center w-full md:w-auto gap-2">
                <a
                  href={`/lesson/${nextLesson.id}`}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-label-lg uppercase tracking-wider shadow-xl border-b-4 border-purple-700 hover:scale-105 transition-all active:translate-y-[3px] active:border-b-[1px]"
                >
                  <span>Start Lesson</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </a>
                <div className="flex items-center gap-1 text-secondary font-label-sm text-xs">
                  <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "FILL 1" }}>stars</span>
                  <span>+{nextLesson.xpReward ?? 20} XP on completion</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Upcoming Sessions ─────────────────────────────────── */}
      {upcomingSessions.length > 0 && (
        <section className="mb-6 animate-slide-up delay-225">
          <div className="bg-white rounded-3xl p-5 shadow-clay-surface border border-surface-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500 text-[22px]" style={{ fontVariationSettings: "FILL 1" }}>videocam</span>
                <h2 className="font-headline-md text-text-primary">Upcoming Sessions</h2>
              </div>
              <a href="/tutoring" className="font-label-sm text-primary font-bold hover:underline text-sm">View All →</a>
            </div>
            <div className="space-y-3">
              {upcomingSessions.map((session: any) => (
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

      {/* ── Notifications ─────────────────────────────────────── */}
      {recentNotifications.length > 0 && (
        <section className="mb-6 animate-slide-up delay-300">
          <div className="bg-white rounded-3xl p-5 shadow-clay-surface border border-surface-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "FILL 1" }}>notifications</span>
                <h2 className="font-headline-md text-text-primary">Notifications</h2>
              </div>
              <a href="/notifications" className="font-label-sm text-primary font-bold hover:underline text-sm">View All →</a>
            </div>
            <div className="space-y-3">
              {recentNotifications.map((notif: any) => (
                <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-xl border-2 ${!notif.isRead ? "bg-primary/5 border-primary/20" : "bg-gray-50 border-gray-100"}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notif.isRead ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                    <span className="material-symbols-outlined text-[20px]">{notif.type === "badge_earned" ? "military_tech" : notif.type === "friend_request" ? "person_add" : notif.type === "lesson_completed" ? "check_circle" : "notifications"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-label-sm ${!notif.isRead ? "font-bold text-text-primary" : "text-text-muted"}`}>{notif.title}</p>
                    <p className="font-body-sm text-text-muted truncate">{notif.message}</p>
                    <p className="font-body-xs text-text-muted mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <section className="mb-6 animate-slide-up delay-375">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/path" className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white p-6 shadow-clay-primary border-4 border-white/30 hover:shadow-xl hover:border-white/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[28px] group-hover:animate-bounce">home</span>
              <h3 className="font-label-lg font-extrabold">Learning Path</h3>
            </div>
            <p className="font-body-sm opacity-90">Continue your lessons</p>
          </a>
          <a href="/library" className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 shadow-clay-tertiary border-4 border-white/30 hover:shadow-xl hover:border-white/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[28px] group-hover:animate-bounce">menu_book</span>
              <h3 className="font-label-lg font-extrabold">Library</h3>
            </div>
            <p className="font-body-sm opacity-90">Watch lesson videos</p>
          </a>
          <a href="/tutoring" className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white p-6 shadow-clay-tertiary border-4 border-white/30 hover:shadow-xl hover:border-white/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[28px] group-hover:animate-bounce">school</span>
              <h3 className="font-label-lg font-extrabold">Tutoring</h3>
            </div>
            <p className="font-body-sm opacity-90">Find expert tutors</p>
          </a>
          <a href="/friends" className="rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white p-6 shadow-clay-secondary border-4 border-white/30 hover:shadow-xl hover:border-white/50 transition-all group">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-[28px] group-hover:animate-bounce">diversity_3</span>
              <h3 className="font-label-lg font-extrabold">Friends</h3>
            </div>
            <p className="font-body-sm opacity-90">Connect with peers</p>
          </a>
        </div>
      </section>
    </div>
  );
}