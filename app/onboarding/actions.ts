"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { enrollments, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Parse form data
  const selectedCourseIds = formData.getAll("courseIds") as string[];
  const placementAnswer = (formData.get("placementAnswer") as string) || "beginner";
  const dailyGoalMinutes = parseInt((formData.get("dailyGoalMinutes") as string) || "15", 10);

  if (!selectedCourseIds || selectedCourseIds.length === 0) {
    redirect("/onboarding?error=Please select at least one course");
  }

  // 1. Create enrollments for selected courses
  for (let i = 0; i < selectedCourseIds.length; i++) {
    const courseId = selectedCourseIds[i];
    await db
      .insert(enrollments)
      .values({
        userId: user.id,
        courseId,
        isActive: i === 0, // First selected course is active
        placementAnswer,
      })
      .onConflictDoUpdate({
        target: [enrollments.userId, enrollments.courseId],
        set: {
          isActive: i === 0,
          placementAnswer,
        },
      });
  }

  // 2. Update profile with goal and set onboarding_done = true
  const result = await db
    .update(profiles)
    .set({
      dailyGoalMinutes,
      onboardingDone: true,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id))
    .returning();

  console.log("Onboarding complete - updated profile:", result[0]);

  redirect("/path");
}
