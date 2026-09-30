import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { badges, learnerBadges, tutorEnrollments, profiles, userRanks } from "@/db/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const learnerId = searchParams.get("learnerId");

    if (learnerId) {
      // Get badges for a specific learner
      const earnedBadges = await db
        .select({
          id: learnerBadges.id,
          awardedAt: learnerBadges.awardedAt,
          context: learnerBadges.context,
          badge: {
            id: badges.id,
            name: badges.name,
            description: badges.description,
            iconUrl: badges.iconUrl,
            category: badges.category,
          },
        })
        .from(learnerBadges)
        .innerJoin(badges, eq(learnerBadges.badgeId, badges.id))
        .where(eq(learnerBadges.learnerId, learnerId))
        .orderBy(desc(learnerBadges.awardedAt));

      return NextResponse.json(earnedBadges);
    }

    // Return all active badges
    const allBadges = await db
      .select()
      .from(badges)
      .where(eq(badges.isActive, true))
      .orderBy(badges.category, badges.name);

    return NextResponse.json(allBadges);
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
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
    const { learnerId, badgeId, context } = body;

    if (!learnerId || !badgeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if tutor is enrolled with this learner
    const [enrollment] = await db
      .select()
      .from(tutorEnrollments)
      .where(
        and(
          eq(tutorEnrollments.tutorId, user.id),
          eq(tutorEnrollments.learnerId, learnerId),
          eq(tutorEnrollments.status, "enrolled")
        )
      )
      .limit(1);

    if (!enrollment) {
      return NextResponse.json({ error: "Learner not enrolled with you" }, { status: 403 });
    }

    // Check if badge exists
    const [badge] = await db
      .select()
      .from(badges)
      .where(eq(badges.id, badgeId))
      .limit(1);

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    // Check if learner already has this badge
    const [existing] = await db
      .select()
      .from(learnerBadges)
      .where(and(eq(learnerBadges.learnerId, learnerId), eq(learnerBadges.badgeId, badgeId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Learner already has this badge" }, { status: 409 });
    }

    // Award badge
    const [awarded] = await db
      .insert(learnerBadges)
      .values({
        learnerId,
        badgeId,
        awardedByTutorId: user.id,
        context,
      })
      .returning();

    // Update learner's rank points (simple implementation)
    await db
      .insert(userRanks)
      .values({
        userId: learnerId,
        role: "learner",
        level: 1,
        points: 10,
        metrics: { badgesEarned: 1 },
      })
      .onConflictDoUpdate({
        target: userRanks.userId,
        set: {
          points: sql`${userRanks.points} + 10`,
          updatedAt: new Date(),
        },
      });

    // Notify learner
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: learnerId,
        type: "badge_awarded",
        title: "Badge Awarded!",
        message: `You earned the "${badge.name}" badge!`,
        data: { badgeId: badge.id, tutorId: user.id },
      }),
    });

    return NextResponse.json(awarded, { status: 201 });
  } catch (error) {
    console.error("Failed to award badge:", error);
    return NextResponse.json({ error: "Failed to award badge" }, { status: 500 });
  }
}