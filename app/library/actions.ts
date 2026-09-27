"use server";

import { db } from "@/db";
import { libraryViews, enrollments, lessons, courses, units } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getLibraryLessons() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  // Optimized: Get all lessons in enrolled courses in a single query with joins
  const libraryLessons = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
      videoUrl: lessons.youtubeVideoId,
      xpReward: lessons.xpReward,
      unitId: lessons.unitId,
      courseId: units.courseId,
      courseName: courses.title,
      unitName: units.title,
    })
    .from(lessons)
    .innerJoin(units, eq(lessons.unitId, units.id))
    .innerJoin(courses, eq(units.courseId, courses.id))
    .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, user.id))
    .orderBy(lessons.orderIndex)
    .limit(50);

  return libraryLessons;
}

export async function recordLibraryView(lessonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("You must be logged in");
  }

  // Record library view (NEVER affects user_progress)
  await db.insert(libraryViews).values({
    userId: user.id,
    lessonId,
  });

  revalidatePath("/library");
  return { success: true };
}
