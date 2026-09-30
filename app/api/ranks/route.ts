import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { userRanks, tutorEnrollments, profiles } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId") || user.id;

    // Check if user is requesting their own rank or if they're a tutor viewing learner's rank
    if (targetUserId !== user.id) {
      // Check if user is a tutor enrolled with this learner
      const [enrollment] = await db
        .select()
        .from(tutorEnrollments)
        .where(
          and(
            eq(tutorEnrollments.tutorId, user.id),
            eq(tutorEnrollments.learnerId, targetUserId),
            eq(tutorEnrollments.status, "enrolled")
          )
        )
        .limit(1);

      if (!enrollment) {
        return NextResponse.json({ error: "Unauthorized to view this rank" }, { status: 403 });
      }
    }

    // Get user's rank
    const [rank] = await db
      .select()
      .from(userRanks)
      .where(eq(userRanks.userId, targetUserId))
      .limit(1);

    if (!rank) {
      // Return default rank if not exists
      return NextResponse.json({
        level: 1,
        points: 0,
        metrics: {},
      });
    }

    return NextResponse.json(rank);
  } catch (error) {
    console.error("Failed to fetch rank:", error);
    return NextResponse.json({ error: "Failed to fetch rank" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetUserId, pointsDelta, metricsUpdate } = body;

    if (!targetUserId || typeof pointsDelta !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check authorization - users can only update their own rank, or tutors updating learners
    if (targetUserId !== user.id) {
      const [enrollment] = await db
        .select()
        .from(tutorEnrollments)
        .where(
          and(
            eq(tutorEnrollments.tutorId, user.id),
            eq(tutorEnrollments.learnerId, targetUserId),
            eq(tutorEnrollments.status, "enrolled")
          )
        )
        .limit(1);

      if (!enrollment) {
        return NextResponse.json({ error: "Unauthorized to update this rank" }, { status: 403 });
      }
    }

    // Update rank points
    const [updated] = await db
      .insert(userRanks)
      .values({
        userId: targetUserId,
        role: "learner", // Default, will be updated
        points: Math.max(0, pointsDelta), // Ensure non-negative
        level: 1,
        metrics: {},
      })
      .onConflictDoUpdate({
        target: userRanks.userId,
        set: {
          points: sql`${userRanks.points} + ${pointsDelta}`,
          updatedAt: new Date(),
        },
      })
      .returning();

    // Calculate level based on points
    const points = updated.points;
    const newLevel = Math.floor(points / 100) + 1;

    if (newLevel !== updated.level) {
      await db
        .update(userRanks)
        .set({ level: newLevel, updatedAt: new Date() })
        .where(eq(userRanks.userId, targetUserId));
    }

    return NextResponse.json({ ...updated, level: newLevel });
  } catch (error) {
    console.error("Failed to update rank:", error);
    return NextResponse.json({ error: "Failed to update rank" }, { status: 500 });
  }
}