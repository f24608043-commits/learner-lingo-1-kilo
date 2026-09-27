import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../db";
import { profiles, tutorProfiles, tutorAvailability, courses, enrollments, units, lessons } from "../db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "../utils/supabase/server";

async function createDemoTutorData() {
  console.log("=== Creating Demo Tutor Data for orphix.itsolutions@gmail.com ===\n");

  try {
    const supabase = await createClient();
    
    // Find the user by email from auth
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === "orphix.itsolutions@gmail.com");
    
    if (!authUser) {
      console.log("User not found in auth. Please check the email.");
      return;
    }

    console.log("Found auth user:", authUser.id);

    // Get the profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, authUser.id))
      .limit(1);

    if (!profile) {
      console.log("Profile not found in database. Creating profile...");
      await db.insert(profiles).values({
        id: authUser.id,
        displayName: "Orphix Tutor",
        role: "tutor",
        xp: 1000,
        streakCount: 5,
        onboardingDone: true,
      });
      console.log("✓ Created profile");
    } else {
      console.log("Profile found:", profile.displayName);
    }

    // Promote to tutor if not already
    if (profile && profile.role !== "tutor" && profile.role !== "admin") {
      await db
        .update(profiles)
        .set({ role: "tutor" })
        .where(eq(profiles.id, authUser.id));
      console.log("✓ Promoted user to tutor role");
    }

    // Create tutor profile
    const [existingTutorProfile] = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.tutorId, authUser.id))
      .limit(1);

    if (!existingTutorProfile) {
      await db.insert(tutorProfiles).values({
        tutorId: authUser.id,
        bio: "Experienced Python and web development tutor with 5+ years of teaching experience. I specialize in helping beginners build strong foundations in programming.",
        subjects: ["Python", "Web Development", "JavaScript", "React"],
        hourlyRate: 25,
        timezone: "UTC",
        rating: 4.8,
        totalSessions: 42,
        isActive: true,
      });
      console.log("✓ Created tutor profile");
    } else {
      console.log("Tutor profile already exists");
    }

    // Set availability (Monday-Friday, 9AM-5PM)
    await db
      .delete(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, authUser.id));

    const availabilitySlots = [
      { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, // Monday
      { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, // Tuesday
      { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, // Wednesday
      { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, // Thursday
      { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }, // Friday
    ];

    await db.insert(tutorAvailability).values(
      availabilitySlots.map(slot => ({
        tutorId: authUser.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isActive: true,
      }))
    );
    console.log("✓ Set availability slots");

    // Create demo course if it doesn't exist
    const [existingCourse] = await db
      .select()
      .from(courses)
      .where(eq(courses.title, "Python Fundamentals"))
      .limit(1);

    let courseId;
    if (!existingCourse) {
      const [newCourse] = await db.insert(courses).values({
        title: "Python Fundamentals",
        description: "Learn the basics of Python programming from scratch",
        isPublished: true,
      }).returning();
      courseId = newCourse.id;
      console.log("✓ Created demo course");
    } else {
      courseId = existingCourse.id;
      console.log("Course already exists");
    }

    // Enroll tutor in their own course
    const [existingEnrollment] = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.userId, authUser.id))
      .limit(1);

    if (!existingEnrollment) {
      await db.insert(enrollments).values({
        userId: authUser.id,
        courseId: courseId,
        isActive: true,
      });
      console.log("✓ Enrolled tutor in course");
    }

    // Create unit if it doesn't exist
    const [existingUnit] = await db
      .select()
      .from(units)
      .where(eq(units.courseId, courseId))
      .limit(1);

    let unitId;
    if (!existingUnit) {
      const [newUnit] = await db.insert(units).values({
        courseId: courseId,
        title: "Getting Started",
        description: "Introduction to Python",
        orderIndex: 0,
      }).returning();
      unitId = newUnit.id;
      console.log("✓ Created unit");
    } else {
      unitId = existingUnit.id;
      console.log("Unit already exists");
    }

    // Create demo lesson if it doesn't exist
    const [existingLesson] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.unitId, unitId))
      .limit(1);

    if (!existingLesson) {
      await db.insert(lessons).values({
        unitId: unitId,
        title: "Hello World",
        description: "Your first Python program",
        youtubeVideoId: "kqtD5dpn9C8", // Python tutorial video
        orderIndex: 0,
        xpReward: 10,
        isPublished: true,
      });
      console.log("✓ Created demo lesson");
    } else {
      console.log("Lesson already exists");
    }

    console.log("\n✅ Demo tutor data created successfully!");
    console.log("User can now access tutor dashboard and accept session requests.");

  } catch (error) {
    console.error("Error creating demo tutor data:", error);
    throw error;
  }
}

createDemoTutorData().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
