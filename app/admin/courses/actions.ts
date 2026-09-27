"use server";

import { db } from "@/db";
import { courses, units, lessons, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Helper: Verify current user is admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    throw new Error("You must be an admin to perform this action");
  }

  return user.id;
}

export async function createCourse(data: {
  name: string;
  description: string;
  category: string;
}) {
  await verifyAdmin();

  const [course] = await db
    .insert(courses)
    .values({
      title: data.name,
      description: data.description,
    })
    .returning();

  revalidatePath("/admin/courses");
  return course;
}

export async function createUnit(data: {
  courseId: string;
  name: string;
  description: string;
  order: number;
}) {
  await verifyAdmin();

  const [unit] = await db
    .insert(units)
    .values({
      courseId: data.courseId,
      title: data.name,
      description: data.description,
      orderIndex: data.order,
    })
    .returning();

  revalidatePath("/admin/courses");
  return unit;
}

export async function createLesson(data: {
  unitId: string;
  title: string;
  description: string;
  videoUrl: string;
  xpReward: number;
  order: number;
}) {
  await verifyAdmin();

  const [lesson] = await db
    .insert(lessons)
    .values({
      unitId: data.unitId,
      title: data.title,
      description: data.description,
      youtubeVideoId: data.videoUrl,
      xpReward: data.xpReward,
      orderIndex: data.order,
    })
    .returning();

  revalidatePath("/admin/courses");
  return lesson;
}

export async function getAllCourses() {
  await verifyAdmin();
  return await db.select().from(courses).orderBy(courses.title).limit(50);
}

export async function getCourseUnits(courseId: string) {
  await verifyAdmin();
  return await db
    .select()
    .from(units)
    .where(eq(units.courseId, courseId))
    .orderBy(units.orderIndex);
}

export async function getUnitLessons(unitId: string) {
  await verifyAdmin();
  return await db
    .select()
    .from(lessons)
    .where(eq(lessons.unitId, unitId))
    .orderBy(lessons.orderIndex);
}
