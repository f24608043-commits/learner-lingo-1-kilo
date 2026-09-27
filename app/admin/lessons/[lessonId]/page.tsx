import { db } from "@/db";
import { challenges, challengeOptions, courses, lessons, units } from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateLesson } from "./actions";
import LessonEditor from "./LessonEditor";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  const [lesson] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) notFound();

  const [unit] = await db
    .select()
    .from(units)
    .where(eq(units.id, lesson.unitId))
    .limit(1);

  const [course] = unit
    ? await db
        .select({ id: courses.id, title: courses.title })
        .from(courses)
        .where(eq(courses.id, unit.courseId))
        .limit(1)
    : [null];

  // Fetch existing questions + options for this lesson
  const existingChallenges = await db
    .select()
    .from(challenges)
    .where(eq(challenges.lessonId, lessonId))
    .orderBy(asc(challenges.orderIndex));

  const challengeIds = existingChallenges.map((c) => c.id);
  const existingOptions =
    challengeIds.length > 0
      ? await db
          .select()
          .from(challengeOptions)
          .where(inArray(challengeOptions.challengeId, challengeIds))
          .orderBy(asc(challengeOptions.orderIndex))
      : [];

  const challengesWithOptions = existingChallenges.map((c) => ({
    id: c.id,
    questionText: c.questionText,
    points: c.points,
    orderIndex: c.orderIndex,
    options: existingOptions
      .filter((o) => o.challengeId === c.id)
      .map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
        orderIndex: o.orderIndex,
      })),
  }));

  // Current YouTube URL display
  const youtubeUrl = lesson.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${lesson.youtubeVideoId}`
    : "";

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-blue-600">Courses</Link>
        <span>/</span>
        {course && (
          <>
            <Link href={`/admin/courses/${course.id}`} className="hover:text-blue-600">
              {course.title}
            </Link>
            <span>/</span>
          </>
        )}
        {unit && (
          <>
            <Link href={`/admin/units/${unit.id}`} className="hover:text-blue-600">
              {unit.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="font-semibold text-gray-800">{lesson.title}</span>
      </nav>

      {/* ── Lesson Metadata Form ── */}
      <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-gray-900">Lesson Details</h2>
        <form action={updateLesson} className="space-y-4">
          <input type="hidden" name="lessonId" value={lesson.id} />

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="title">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={lesson.title}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="youtubeUrl">
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <input
              id="youtubeUrl"
              name="youtubeUrl"
              type="text"
              required
              defaultValue={youtubeUrl}
              placeholder="youtube.com/watch?v=... or youtu.be/..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Accepted: youtube.com/watch?v=ID, youtu.be/ID, or raw 11-char video ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={lesson.description ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="xpReward">
                XP Reward
              </label>
              <input
                id="xpReward"
                name="xpReward"
                type="number"
                min="1"
                defaultValue={lesson.xpReward}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="isPublished"
                  name="isPublished"
                  type="checkbox"
                  defaultChecked={lesson.isPublished}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-blue-700"
            >
              Save Lesson Details
            </button>
          </div>
        </form>
      </section>

      {/* ── Question Authoring (Client Component) ── */}
      <LessonEditor
        lessonId={lesson.id}
        youtubeVideoId={lesson.youtubeVideoId}
        existingChallenges={challengesWithOptions}
      />
    </div>
  );
}
