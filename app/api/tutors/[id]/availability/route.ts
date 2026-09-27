import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorAvailability } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Get the day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = new Date(date).getDay();

    // Get tutor's availability for this day
    const availability = await db
      .select()
      .from(tutorAvailability)
      .where(and(eq(tutorAvailability.tutorId, id), eq(tutorAvailability.dayOfWeek, dayOfWeek), eq(tutorAvailability.isActive, true)));

    // Check for existing confirmed sessions on this date
    const { tutorSessions } = await import("@/db/schema");
    const { gte, lte } = await import("drizzle-orm");

    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59");

    const existingSessions = await db
      .select()
      .from(tutorSessions)
      .where(
        and(
          eq(tutorSessions.tutorId, id),
          eq(tutorSessions.status, "confirmed"),
          gte(tutorSessions.scheduledAt, startOfDay),
          lte(tutorSessions.scheduledAt, endOfDay)
        )
      );

    // Generate available time slots based on availability
    const slots: Array<{ date: string; startTime: string; endTime: string }> = [];

    for (const avail of availability) {
      const startHour = parseInt(avail.startTime.split(":")[0]);
      const endHour = parseInt(avail.endTime.split(":")[0]);
      const startMinute = parseInt(avail.startTime.split(":")[1] || "0");

      // Generate 30-minute slots
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === startHour && minute < startMinute) continue;
          if (hour === endHour - 1 && minute > 30) continue;

          const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          const endTimeStr = `${(hour + (minute + 30 >= 60 ? 1 : 0)).toString().padStart(2, "0")}:${((minute + 30) % 60).toString().padStart(2, "0")}`;

          // Check if this slot conflicts with existing sessions
          const slotStart = new Date(date + "T" + timeStr);
          const slotEnd = new Date(date + "T" + endTimeStr);

          const hasConflict = existingSessions.some((session: any) => {
            const sessionStart = new Date(session.scheduledAt);
            const sessionEnd = new Date(sessionStart.getTime() + session.durationMins * 60000);
            return slotStart < sessionEnd && slotEnd > sessionStart;
          });

          if (!hasConflict) {
            slots.push({ date, startTime: timeStr, endTime: endTimeStr });
          }
        }
      }
    }

    return NextResponse.json({ slots });
  } catch (error: any) {
    console.error("Get tutor availability error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}