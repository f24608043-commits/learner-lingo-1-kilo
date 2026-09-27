"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq, or, ilike } from "drizzle-orm";
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

export async function getAllUsers(searchQuery: string = "") {
  await verifyAdmin();

  if (searchQuery) {
    return await db
      .select()
      .from(profiles)
      .where(
        or(
          ilike(profiles.displayName, `%${searchQuery}%`),
          ilike(profiles.role, `%${searchQuery}%`)
        )
      )
      .orderBy(profiles.displayName)
      .limit(50);
  }

  const users = await db.select().from(profiles).orderBy(profiles.displayName).limit(50);
  return users;
}

export async function changeUserRole(userId: string, newRole: "learner" | "tutor" | "admin") {
  const adminId = await verifyAdmin();

  // Prevent admin from changing their own role
  if (adminId === userId) {
    throw new Error("You cannot change your own role");
  }

  const [user] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  await db
    .update(profiles)
    .set({ role: newRole })
    .where(eq(profiles.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}
