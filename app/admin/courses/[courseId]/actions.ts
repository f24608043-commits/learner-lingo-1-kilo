"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { courses, units, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }

  return user;
}

export async function updateCourse(formData: FormData) {
  await assertAdmin();

  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const coverUrl = (formData.get("coverUrl") as string)?.trim() || null;
  const isPublished = formData.get("isPublished") === "on";

  if (!courseId || !title) throw new Error("courseId and title are required");

  await db
    .update(courses)
    .set({ title, description, coverUrl, isPublished, updatedAt: new Date() })
    .where(eq(courses.id, courseId));

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function createUnit(formData: FormData) {
  await assertAdmin();

  const courseId = formData.get("courseId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;

  if (!courseId || !title) throw new Error("courseId and title are required");

  // Determine next order_index
  const existingUnits = await db
    .select({ orderIndex: units.orderIndex })
    .from(units)
    .where(eq(units.courseId, courseId));

  const maxIndex = existingUnits.reduce((m, u) => Math.max(m, u.orderIndex), -1);

  const [newUnit] = await db
    .insert(units)
    .values({ courseId, title, description, orderIndex: maxIndex + 1 })
    .returning({ id: units.id });

  redirect(`/admin/units/${newUnit.id}`);
}
