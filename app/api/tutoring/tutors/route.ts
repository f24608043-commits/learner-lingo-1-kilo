import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorProfiles, profiles } from "@/db/schema";
import { eq, and, desc, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId");

    let query = db
      .select({        id: tutorProfiles.id,
        tutorId: tutorProfiles.tutorId,
        bio: tutorProfiles.bio,
        subjects: tutorProfiles.subjects,
        hourlyRate: tutorProfiles.hourlyRate,
        timezone: tutorProfiles.timezone,
        rating: tutorProfiles.rating,
        totalSessions: tutorProfiles.totalSessions,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      })
      .from(tutorProfiles)
      .innerJoin(profiles, eq(tutorProfiles.tutorId, profiles.id));

    const conditions: SQL[] = [eq(tutorProfiles.isActive, true)];

    if (tutorId) {
      conditions.push(eq(tutorProfiles.tutorId, tutorId));
    }

    const tutors = await query
      .where(and(...conditions))
      .orderBy(desc(tutorProfiles.rating))
      .limit(50);

    return NextResponse.json(tutors);
  } catch (error) {
    console.error("Failed to fetch tutors:", error);
    return NextResponse.json({ error: "Failed to fetch tutors" }, { status: 500 });
  }
}