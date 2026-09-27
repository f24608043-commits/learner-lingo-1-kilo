"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles, tutorProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function promoteToTutor(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if current user is admin
  const [currentUserProfile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!currentUserProfile || currentUserProfile.role !== "admin") {
    return { error: "Admin access required" };
  }

  try {
    // Update role to tutor
    await db
      .update(profiles)
      .set({ role: "tutor" })
      .where(eq(profiles.id, userId));

    // Check if tutor_profile exists
    const [existingTutorProfile] = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.tutorId, userId))
      .limit(1);

    if (!existingTutorProfile) {
      await db.insert(tutorProfiles).values({
        tutorId: userId,
        bio: "Experienced tutor ready to help!",
        subjects: ["Math", "Science", "English"],
        hourlyRate: 25,
        rating: 5,
        totalSessions: 0,
      });
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Error promoting to tutor:", error);
    return { error: "Failed to promote user to tutor" };
  }
}
