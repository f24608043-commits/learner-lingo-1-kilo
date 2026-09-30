import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorSessions, tutorAvailability, tutorProfiles } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tutorId, requestedSlots, message } = body;

    if (!tutorId || !requestedSlots || !Array.isArray(requestedSlots) || requestedSlots.length === 0) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Verify tutor exists and is active
    const [tutorProfile] = await db
      .select()
      .from(tutorProfiles)
      .where(and(eq(tutorProfiles.tutorId, tutorId), eq(tutorProfiles.isActive, true)))
      .limit(1);

    if (!tutorProfile) {
      return NextResponse.json({ error: "Tutor not found or unavailable" }, { status: 404 });
    }

    // Check each requested slot for conflicts with existing sessions
    for (const slot of requestedSlots) {
      const { date, startTime, endTime } = slot;
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);

      if (startDateTime >= endDateTime) {
        return NextResponse.json({ error: "Invalid time range in requested slots" }, { status: 400 });
      }

      // Check for conflicts with confirmed sessions
      const [conflict] = await db
        .select()
        .from(tutorSessions)
        .where(
          and(
            eq(tutorSessions.tutorId, tutorId),
            eq(tutorSessions.status, "confirmed"),
            gte(tutorSessions.scheduledAt, startDateTime),
            lte(tutorSessions.scheduledAt, endDateTime)
          )
        )
        .limit(1);

      if (conflict) {
        return NextResponse.json({ 
          error: `Time slot ${formatTime(startDateTime)} - ${formatTime(endDateTime)} on ${formatDate(startDateTime)} is already booked` 
        }, { status: 409 });
      }

      // Check if slot is within tutor's availability
      const dayOfWeek = startDateTime.getDay();
      const [avail] = await db
        .select()
        .from(tutorAvailability)
        .where(
          and(
            eq(tutorAvailability.tutorId, tutorId),
            eq(tutorAvailability.dayOfWeek, dayOfWeek),
            eq(tutorAvailability.isActive, true)
          )
        )
        .limit(1);

      if (!avail) {
        return NextResponse.json({ 
          error: `Tutor is not available on ${formatDate(startDateTime)}` 
        }, { status: 409 });
      }

      const slotStart = startDateTime.getHours() * 60 + startDateTime.getMinutes();
      const slotEnd = endDateTime.getHours() * 60 + endDateTime.getMinutes();
      const availStart = parseTimeToMinutes(avail.startTime);
      const availEnd = parseTimeToMinutes(avail.endTime);

      if (slotStart < availStart || slotEnd > availEnd) {
        return NextResponse.json({ 
          error: `Requested time is outside tutor's availability on ${formatDate(startDateTime)}` 
        }, { status: 409 });
      }
    }

    // Create session request (we'll use tutorSessions with status "pending" for requests)
    // For simplicity, we'll create individual session records with "pending" status
    const createdSessions = [];
    
    for (const slot of requestedSlots) {
      const { date, startTime, endTime } = slot;
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      const durationMins = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      const [session] = await db
        .insert(tutorSessions)
        .values({
          learnerId: user.id,
          tutorId,
          courseId: null,
          scheduledAt: startDateTime,
          durationMins,
          status: "requested",
          jitsiRoomId: null,
        })
        .returning();

      createdSessions.push(session);
    }

    // Notify tutor (reusing notification system)
    try {
      const { createNotification } = await import("@/app/notifications/actions");
      await createNotification({
        userId: tutorId,
        type: "lesson_completed",
        title: "New Session Request",
        message: `You have ${createdSessions.length} new session request(s)`,
        data: { sessionIds: createdSessions.map(s => s.id) },
      });
    } catch (notifyError) {
      console.warn("Failed to send notification:", notifyError);
    }

    return NextResponse.json({ 
      success: true, 
      sessions: createdSessions,
      message: `Successfully requested ${createdSessions.length} session(s)`
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create session request:", error);
    return NextResponse.json({ error: "Failed to create session request" }, { status: 500 });
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}