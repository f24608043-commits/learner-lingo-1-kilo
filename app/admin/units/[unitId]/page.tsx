import { db } from "@/db";
import { units, lessons, courses, badges } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateUnit, createLesson } from "./actions";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  const [unit] = await db
    .select()
    .from(units)
    .where(eq(units.id, unitId))
    .limit(1);

  if (!unit) notFound();

  const [course] = await db
    .select({ id: courses.id, title: courses.title })
    .from(courses)
    .where(eq(courses.id, unit.courseId))
    .limit(1);

  const unitLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.unitId, unitId))
    .orderBy(asc(lessons.orderIndex));

  // All badges for badge picker
  const allBadges = await db
    .select({ id: badges.id, name: badges.name })
    .from(badges)
    .orderBy(asc(badges.name));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-blue-600">Courses</Link>
        <span>/</span>
        <Link href={`/admin/courses/${unit.courseId}`} className="hover:text-blue-600">
          {course?.title ?? "Course"}
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800">{unit.title}</span>
      </nav>

      {/* Edit Unit */}
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-gray-900">Unit Details</h2>
        <form action={updateUnit} className="space-y-4">
          <input type="hidden" name="unitId" value={unit.id} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="title">
              Unit Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={unit.title}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={unit.description ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Badge Attachment (FR9.1d) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="badgeId">
              Unit Completion Badge (optional)
            </label>
            <p className="mb-2 text-xs text-gray-500">
              Auto-awarded when a learner completes every lesson in this unit.
            </p>
            <select
              id="badgeId"
              name="badgeId"
              defaultValue={unit.badgeId ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— No badge —</option>
              {allBadges.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Save Unit
            </button>
          </div>
        </form>
      </section>

      {/* Lessons List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">
            Lessons ({unitLessons.length})
          </h2>
        </div>

        {unitLessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400 mb-6">
            No lessons yet. Add your first lesson below.
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {unitLessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                href={`/admin/lessons/${lesson.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{lesson.title}</p>
                    <p className="text-xs text-gray-500">
                      {lesson.xpReward} XP ·{" "}
                      <span
                        className={lesson.isPublished ? "text-green-600" : "text-gray-400"}
                      >
                        {lesson.isPublished ? "Published" : "Draft"}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-600 hover:underline">
                  Edit →
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Add Lesson Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-extrabold text-gray-700">+ Add New Lesson</h3>
          <form action={createLesson} className="space-y-3">
            <input type="hidden" name="unitId" value={unit.id} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Lesson Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Variables & Data Types"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  YouTube URL <span className="text-red-500">*</span>
                </label>
                <input
                  name="youtubeUrl"
                  type="text"
                  required
                  placeholder="youtube.com/watch?v=... or youtu.be/..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="Brief description (optional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  XP Reward
                </label>
                <input
                  name="xpReward"
                  type="number"
                  min="1"
                  defaultValue="10"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
              >
                Create Lesson →
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
