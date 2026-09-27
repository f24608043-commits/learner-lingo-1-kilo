import { db } from "@/db";
import { courses, units, lessons } from "@/db/schema";
import { asc, count, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateCourse, createUnit } from "./actions";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) notFound();

  const courseUnits = await db
    .select()
    .from(units)
    .where(eq(units.courseId, courseId))
    .orderBy(asc(units.orderIndex));

  // Lesson counts per unit
  const unitIds = courseUnits.map((u) => u.id);
  const lessonCounts =
    unitIds.length > 0
      ? await db
          .select({ unitId: lessons.unitId, count: count() })
          .from(lessons)
          .where(inArray(lessons.unitId, unitIds))
          .groupBy(lessons.unitId)
      : [];

  const lessonCountMap = new Map(lessonCounts.map((l) => [l.unitId, Number(l.count)]));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-blue-600">
          Courses
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-800">{course.title}</span>
      </nav>

      {/* Edit Course */}
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-gray-900">Course Details</h2>
        <form action={updateCourse} className="space-y-4">
          <input type="hidden" name="courseId" value={course.id} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="title">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={course.title}
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
              defaultValue={course.description ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="coverUrl">
              Cover Image URL
            </label>
            <input
              id="coverUrl"
              name="coverUrl"
              type="url"
              defaultValue={course.coverUrl ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublished"
              name="isPublished"
              type="checkbox"
              defaultChecked={course.isPublished}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
              Published (visible to learners)
            </label>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </section>

      {/* Units List */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">
            Units ({courseUnits.length})
          </h2>
        </div>

        {courseUnits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
            No units yet. Add your first unit below.
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {courseUnits.map((unit, idx) => (
              <Link
                key={unit.id}
                href={`/admin/units/${unit.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900">{unit.title}</p>
                    <p className="text-xs text-gray-500">
                      {lessonCountMap.get(unit.id) || 0} lessons
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

        {/* Add Unit Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-extrabold text-gray-700">+ Add New Unit</h3>
          <form action={createUnit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex-1">
              <input
                name="title"
                type="text"
                required
                placeholder="Unit title (e.g. Python Fundamentals)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <input
                name="description"
                type="text"
                placeholder="Short description (optional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Create Unit →
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
