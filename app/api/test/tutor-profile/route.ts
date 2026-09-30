import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorProfiles, tutorAvailability, profiles } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId") || user.id;

    // Tutor schedules are private, so only the owner or an admin may read this.
    if (tutorId !== user.id) {
      const [requester] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      if (requester?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const [tutorProfile] = await db
      .select()
      .from(tutorProfiles)
      .where(eq(tutorProfiles.tutorId, tutorId))
      .limit(1);

    if (!tutorProfile) {
      return NextResponse.json({ success: false, tutorProfile: null });
    }

    // Report only a count so slot times are not exposed.
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tutorAvailability)
      .where(eq(tutorAvailability.tutorId, tutorId));

    return NextResponse.json({
      success: true,
      tutorProfile,
      availabilityCount: count ?? 0,
    });
  } catch (error) {
    console.error("Failed to fetch tutor profile:", error);
    return NextResponse.json({ error: "Failed to fetch tutor profile" }, { status: 500 });
  }
}
