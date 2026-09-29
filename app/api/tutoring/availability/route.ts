import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorAvailability } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tutorId = searchParams.get("tutorId") || user.id;

    const availability = await db
      .select()
      .from(tutorAvailability)
      .where(and(eq(tutorAvailability.tutorId, tutorId), eq(tutorAvailability.isActive, true)))
      .orderBy(tutorAvailability.dayOfWeek);

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Failed to fetch availability:", error);
    return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 });
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
    const { dayOfWeek, startTime, endTime, isRecurring = true } = body;

    // Validate input
    if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: "Invalid dayOfWeek" }, { status: 400 });
    }
    if (!startTime || !endTime || startTime >= endTime) {
      return NextResponse.json({ error: "Invalid time range" }, { status: 400 });
    }

    // Check for overlapping slots
    const existing = await db
      .select()
      .from(tutorAvailability)
      .where(
        and(
          eq(tutorAvailability.tutorId, user.id),
          eq(tutorAvailability.dayOfWeek, dayOfWeek),
          eq(tutorAvailability.isActive, true)
        )
      );

    const hasOverlap = existing.some(slot => 
      (startTime < slot.endTime && endTime > slot.startTime)
    );

    if (hasOverlap) {
      return NextResponse.json({ error: "This time slot overlaps with existing availability" }, { status: 400 });
    }

    // Insert new availability slot
    const [newSlot] = await db
      .insert(tutorAvailability)
      .values({
        tutorId: user.id,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newSlot, { status: 201 });
  } catch (error) {
    console.error("Failed to create availability:", error);
    return NextResponse.json({ error: "Failed to create availability" }, { status: 500 });
  }
}