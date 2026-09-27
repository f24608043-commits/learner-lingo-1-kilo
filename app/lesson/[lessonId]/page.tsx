import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import {
  challengeOptions,
  challenges,
  courses,
  enrollments,
  lessons,
  profiles,
  units,
  userProgress,
} from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import LessonClient from "./LessonClient";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const startTime = Date.now();
  const { lessonId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // 1. Check profile onboarding AND fetch lesson in parallel
  const [profileResult, lessonResult] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
    db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1)
  ]);

  const profile = profileResult[0];
  const lesson = lessonResult[0];

  if (!profile || !profile.onboardingDone) {
    redirect("/onboarding");
  }

  if (!lesson) {
    notFound();
  }

  // 2. Fetch unit first (needed to get courseId)
  const unitResult = await db.select().from(units).where(eq(units.id, lesson.unitId)).limit(1);
  const unit = unitResult[0];

  if (!unit) {
    notFound();
  }

  // 3. Fetch course using unit.courseId
  const courseResult = await db.select().from(courses).where(eq(courses.id, unit.courseId)).limit(1);
  const course = courseResult[0];

  if (!course) {
    notFound();
  }

  // 4. Server-Side Progression Gating: Verify lesson is unlocked for this learner
  // Fetch course units, progress, and challenges in parallel for speed
  const [courseUnits, allProgress, lessonChallenges] = await Promise.all([
    db.select().from(units).where(eq(units.courseId, course.id)).orderBy(asc(units.orderIndex)),
    db.select().from(userProgress).where(eq(userProgress.userId, user.id)),
    db.select().from(challenges).where(and(eq(challenges.lessonId, lesson.id), eq(challenges.isPublished, true))).orderBy(asc(challenges.orderIndex))
  ]);

  const challengeIds = lessonChallenges.map((c) => c.id);

  // Fetch all lessons and options in parallel
  const [allLessons, rawOptions] = await Promise.all([
    db.select().from(lessons).where(inArray(lessons.unitId, courseUnits.map((u) => u.id))).orderBy(asc(lessons.orderIndex)),
    challengeIds.length > 0
      ? db.select({
          id: challengeOptions.id,
          challengeId: challengeOptions.challengeId,
          optionText: challengeOptions.optionText,
        }).from(challengeOptions).where(inArray(challengeOptions.challengeId, challengeIds)).orderBy(asc(challengeOptions.orderIndex))
      : Promise.resolve([])
  ]);

  const progressMap = new Map(allProgress.map((p) => [p.lessonId, p.status]));

  // Build sequential list of lessons
  const orderedLessons: (typeof lessons.$inferSelect)[] = [];
  for (const u of courseUnits) {
    const uLessons = allLessons.filter((l) => l.unitId === u.id);
    for (const l of uLessons) {
      orderedLessons.push(l);
    }
  }

  // Check if this lesson is unlocked:
  // An unlocked lesson is either already completed, or is the first uncompleted lesson.
  let isUnlocked = false;
  for (const l of orderedLessons) {
    const status = progressMap.get(l.id);
    if (l.id === lesson.id) {
      isUnlocked = true; // Accessible!
      break;
    }
    if (status !== "completed") {
      // Encountered an earlier uncompleted lesson before reaching this lesson!
      break;
    }
  }

  if (!isUnlocked) {
    redirect("/path?error=This lesson is locked. Complete earlier levels first.");
  }

  const sanitizedChallenges = lessonChallenges.map((c) => ({
    id: c.id,
    questionText: c.questionText,
    points: c.points,
    options: rawOptions
      .filter((o) => o.challengeId === c.id)
      .map((o) => ({ id: o.id, optionText: o.optionText })),
  }));

  const currentStatus = progressMap.get(lesson.id) as
    | "completed"
    | "in_progress"
    | undefined;

  const endTime = Date.now();
  console.log(`[PERF] Lesson page server render time: ${endTime - startTime}ms`);

  return (
    <LessonClient
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      lessonDescription={lesson.description}
      youtubeVideoId={lesson.youtubeVideoId}
      xpReward={lesson.xpReward}
      unitTitle={unit.title}
      challenges={sanitizedChallenges}
      previousStatus={currentStatus}
    />
  );
}
