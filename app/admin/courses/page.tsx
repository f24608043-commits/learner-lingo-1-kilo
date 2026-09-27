import { getAllCourses, createCourse, createUnit, createLesson, getCourseUnits, getUnitLessons } from "./actions";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AdminCoursesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin role first
  const [userProfile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!userProfile) {
    console.error('[ADMIN ACCESS] No profile found for user:', user.id);
    redirect("/sign-in?error=profile_not_found");
  }

  if (userProfile.role !== 'admin') {
    console.error('[ADMIN ACCESS] Non-admin user attempted access:', user.id, 'role:', userProfile.role);
    redirect("/?error=admin_only");
  }

  const courses = await getAllCourses();

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-green-50 to-emerald-50 min-h-screen">
      <div className="mb-6">
        <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold mb-2">Course Management 📚</h1>
        <p className="font-body-md text-text-muted">Create and manage courses, units, and lessons</p>
      </div>

      {/* Create Course Form */}
      <div className="rounded-2xl bg-gradient-to-br from-white to-green-50 p-6 shadow-xl border-4 border-green-100 mb-6">
        <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-4">Create New Course</h2>
        <form action={async (formData) => {
          "use server";
          const data = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            category: formData.get("category") as string,
          };
          await createCourse(data);
        }} suppressHydrationWarning={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-label-md text-text-primary font-semibold mb-1">Course Name</label>
              <input
                type="text"
                name="name"
                required
                className="w-full px-3 py-2 border-4 border-green-200 rounded-xl bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-lg"
                placeholder="Course name"
                suppressHydrationWarning={true}
              />
            </div>
            <div>
              <label className="block font-label-md text-text-primary font-semibold mb-1">Category</label>
              <input
                type="text"
                name="category"
                required
                className="w-full px-3 py-2 border-4 border-green-200 rounded-xl bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-lg"
                placeholder="Programming"
                suppressHydrationWarning={true}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-label-md text-text-primary font-semibold mb-1">Description</label>
            <textarea
              name="description"
              required
              className="w-full px-3 py-2 border-4 border-green-200 rounded-xl bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-lg"
              rows={2}
              placeholder="Course description"
              suppressHydrationWarning={true}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            Create Course
          </button>
        </form>
      </div>

      {/* Courses List */}
      <div className="rounded-2xl bg-gradient-to-br from-white to-green-50 shadow-xl border-4 border-green-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-green-500 to-emerald-500 border-b-4 border-green-200">
            <tr>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Name</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Category</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Description</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-text-muted">
                  No courses found. Create your first course above.
                </td>
              </tr>
            ) : (
              courses.map((course: any) => (
                <tr key={course.id} className="border-b-4 border-green-100 hover:bg-green-50 transition-colors">
                  <td className="px-6 py-4 font-label-md font-semibold text-text-primary">{course.name}</td>
                  <td className="px-6 py-4 font-body-sm text-text-primary">{course.category}</td>
                  <td className="px-6 py-4 font-body-sm text-text-muted">{course.description}</td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/courses/${course.id}`} className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-body-sm font-semibold shadow-lg border-2 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                      Manage Units
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 font-body-sm text-text-primary">
        Total courses: {courses.length}
      </div>
    </div>
  );
}
