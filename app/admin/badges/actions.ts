"use server";

import { db } from "@/db";
import { badges, profiles, badgeCriteriaEnum } from "@/db/schema";
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

export async function getAllBadges() {
  await verifyAdmin();
  return await db.select().from(badges).orderBy(badges.name).limit(50);
}

export async function createBadge(data: {
  name: string;
  description: string;
  icon: string;
  criteriaType: "first_lesson" | "lessons_completed" | "course_complete" | "streak_days" | "xp_earned";
  criteriaValue: number;
}) {
  await verifyAdmin();

  const [badge] = await db
    .insert(badges)
    .values(data)
    .returning();

  revalidatePath("/admin/badges");
  return badge;
}

export async function updateBadge(id: string, data: {
  name: string;
  description: string;
  icon: string;
  criteriaType: "first_lesson" | "lessons_completed" | "course_complete" | "streak_days" | "xp_earned";
  criteriaValue: number;
}) {
  await verifyAdmin();

  const [badge] = await db
    .update(badges)
    .set(data)
    .where(eq(badges.id, id))
    .returning();

  revalidatePath("/admin/badges");
  return badge;
}

export async function deleteBadge(id: string) {
  await verifyAdmin();

  await db.delete(badges).where(eq(badges.id, id));

  revalidatePath("/admin/badges");
  return { success: true };
}
