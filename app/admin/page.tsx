import { db } from "@/db";
import { courses, units, lessons, profiles, tutorProfiles, tutorSessions, badges } from "@/db/schema";
import { count, eq, desc, and } from "drizzle-orm";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Mascot from "@/components/Mascot";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin role
  const [userProfile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!userProfile || userProfile.role !== 'admin') {
    redirect("/path");
  }

  // Optimize: Only fetch stats, defer course list to separate component if needed
  const [totalUsers, totalTutors, totalSessions, totalBadges, allCourses] = await Promise.all([
    db.select({ count: count() }).from(profiles),
    db.select({ count: count() }).from(tutorProfiles),
    db.select({ count: count() }).from(tutorSessions),
    db.select({ count: count() }).from(badges),
    db
      .select({
        id: courses.id,
        title: courses.title,
        isPublished: courses.isPublished,
      })
      .from(courses)
      .orderBy(courses.createdAt)
      .limit(10), // Limit to 10 courses for dashboard
  ]);

  const userCount = totalUsers[0]?.count || 0;
  const tutorCount = totalTutors[0]?.count || 0;
  const sessionCount = totalSessions[0]?.count || 0;
  const badgeCount = totalBadges[0]?.count || 0;

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-red-50 to-orange-50 min-h-screen">
      {/* Header with Mascot - Stitch Frame Style */}
      <div className="relative w-full bg-gradient-to-br from-red-500 via-orange-500 to-amber-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-label-sm text-label-sm tracking-wider uppercase font-bold shadow-lg border-2 border-white/30">🛡️ Admin Panel</span>
              <span className="text-text-muted text-label-sm">•</span>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-label-sm text-label-sm font-bold shadow-lg border-2 border-white/30">Full Control</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
              Admin Dashboard 📊
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              Complete control over users, courses, badges, and tutoring
            </p>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0">
              <Mascot pose="idle" size={128} />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/users" className="rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 p-5 shadow-xl border-4 border-white/30 hover:shadow-2xl hover:scale-105 transition-all text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: 'FILL 1' }}>people</span>
            <span className="font-headline-xl text-headline-xl text-white font-extrabold">{userCount}</span>
          </div>
          <p className="font-label-md text-white font-semibold">Total Users</p>
          <p className="font-body-sm text-white/80">Manage all users</p>
        </Link>

        <Link href="/admin/courses" className="rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 p-5 shadow-xl border-4 border-white/30 hover:shadow-2xl hover:scale-105 transition-all text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: 'FILL 1' }}>school</span>
            <span className="font-headline-xl text-headline-xl text-white font-extrabold">{allCourses.length}</span>
          </div>
          <p className="font-label-md text-white font-semibold">Total Courses</p>
          <p className="font-body-sm text-white/80">Manage course content</p>
        </Link>

        <Link href="/admin/tutoring" className="rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 p-5 shadow-xl border-4 border-white/30 hover:shadow-2xl hover:scale-105 transition-all text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: 'FILL 1' }}>groups</span>
            <span className="font-headline-xl text-headline-xl text-white font-extrabold">{sessionCount}</span>
          </div>
          <p className="font-label-md text-white font-semibold">Total Sessions</p>
          <p className="font-body-sm text-white/80">Tutoring oversight</p>
        </Link>

        <Link href="/admin/badges" className="rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 p-5 shadow-xl border-4 border-white/30 hover:shadow-2xl hover:scale-105 transition-all text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="material-symbols-outlined text-white text-[24px]" style={{ fontVariationSettings: 'FILL 1' }}>military_tech</span>
            <span className="font-headline-xl text-headline-xl text-white font-extrabold">{badgeCount}</span>
          </div>
          <p className="font-label-md text-white font-semibold">Total Badges</p>
          <p className="font-body-sm text-white/80">Achievement system</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/users" className="rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 p-4 border-4 border-blue-200 hover:from-blue-200 hover:to-indigo-200 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center shadow-xl border-2 border-white/30">
              <span className="material-symbols-outlined text-[20px]">person_add</span>
            </div>
            <div>
              <p className="font-label-md text-text-primary font-semibold">Add User</p>
              <p className="font-body-sm text-text-muted">Create new user</p>
            </div>
          </Link>

          <Link href="/admin/courses/new" className="rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 p-4 border-4 border-green-200 hover:from-green-200 hover:to-emerald-200 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white flex items-center justify-center shadow-xl border-2 border-white/30">
              <span className="material-symbols-outlined text-[20px]">add</span>
            </div>
            <div>
              <p className="font-label-md text-text-primary font-semibold">New Course</p>
              <p className="font-body-sm text-text-muted">Create course</p>
            </div>
          </Link>

          <Link href="/admin/badges" className="rounded-2xl bg-gradient-to-br from-orange-100 to-red-100 p-4 border-4 border-orange-200 hover:from-orange-200 hover:to-red-200 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center shadow-xl border-2 border-white/30">
              <span className="material-symbols-outlined text-[20px]">emoji_events</span>
            </div>
            <div>
              <p className="font-label-md text-text-primary font-semibold">Create Badge</p>
              <p className="font-body-sm text-text-muted">New achievement</p>
            </div>
          </Link>

          <Link href="/admin/tutoring" className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-4 border-4 border-purple-200 hover:from-purple-200 hover:to-pink-200 transition-all flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center shadow-xl border-2 border-white/30">
              <span className="material-symbols-outlined text-[20px]">support_agent</span>
            </div>
            <div>
              <p className="font-label-md text-text-primary font-semibold">Manage Tutors</p>
              <p className="font-body-sm text-text-muted">Tutor oversight</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Courses Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">Recent Courses</h2>
            <p className="mt-1 font-body-sm text-text-muted">
              Latest 10 courses (manage all in Courses page)
            </p>
          </div>
          <Link
            href="/admin/courses"
            className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            View All Courses
          </Link>
        </div>

      {allCourses.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-12 text-center shadow-xl border-4 border-white/50">
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
            <Mascot pose="empty" size={64} />
          </div>
          <p className="font-body-md text-text-muted font-bold">No courses yet. Create your first course above.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allCourses.map((course) => (
            <Link
              key={course.id}
              href={`/admin/courses/${course.id}`}
              className="group rounded-2xl bg-gradient-to-br from-white to-green-50 p-5 shadow-xl border-4 border-green-100 hover:shadow-2xl hover:border-green-200 transition-all"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-label-lg text-text-primary font-semibold group-hover:text-primary">
                  {course.title}
                </h2>
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 font-label-sm font-bold border-2 ${
                    course.isPublished
                      ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-white/30"
                      : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"
                  }`}
                >
                  {course.isPublished ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-3 font-label-sm font-semibold text-primary group-hover:underline">
                Manage →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  </div>
  );
}
