"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { units, lessons, profiles } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { extractYouTubeId } from "@/utils/youtube";

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

export async function updateUnit(formData: FormData) {
  await assertAdmin();

  const unitId = formData.get("unitId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const badgeId = (formData.get("badgeId") as string)?.trim() || null;

  if (!unitId || !title) throw new Error("unitId and title are required");

  await db
    .update(units)
    .set({ title, description, badgeId, updatedAt: new Date() })
    .where(eq(units.id, unitId));

  revalidatePath(`/admin/units/${unitId}`);
}

export async function createLesson(formData: FormData) {
  await assertAdmin();

  const unitId = formData.get("unitId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const youtubeUrl = (formData.get("youtubeUrl") as string)?.trim();
  const xpReward = parseInt(formData.get("xpReward") as string, 10) || 10;

  if (!unitId || !title || !youtubeUrl) {
    throw new Error("unitId, title, and YouTube URL are required");
  }

  // Parse YouTube video ID from multiple URL formats (FR9.1a)
  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Accepted formats: youtube.com/watch?v=... or youtu.be/..."
    );
  }

  // Determine next order_index
  const existingLessons = await db
    .select({ orderIndex: lessons.orderIndex })
    .from(lessons)
    .where(eq(lessons.unitId, unitId))
    .orderBy(asc(lessons.orderIndex));

  const maxIndex = existingLessons.reduce((m, l) => Math.max(m, l.orderIndex), -1);

  const [newLesson] = await db
    .insert(lessons)
    .values({
      unitId,
      title,
      description,
      youtubeVideoId: videoId,
      orderIndex: maxIndex + 1,
      xpReward,
      isPublished: false,
    })
    .returning({ id: lessons.id });

  redirect(`/admin/lessons/${newLesson.id}`);
}
