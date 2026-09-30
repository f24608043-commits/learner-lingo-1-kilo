import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorSessions } from "@/db/schema";
import { eq, and, gte, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";

// Short-lived cache so repeated polling from the header does not re-query per page load
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; payload: unknown }>();

const EMPTY = {
  upcomingIn1Hour: [],
  upcomingIn24Hours: [],
  totalUpcoming: 0,
};

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(EMPTY);
    }

    const cached = cache.get(user.id);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }

    // Get upcoming sessions for the user (both as tutor and learner) in one query
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    let sessions: Array<{
      id: string;
      scheduledAt: Date;
      durationMins: number;
      status: string;
      jitsiRoomId: string | null;
      tutorId: string;
      learnerId: string;
    }> = [];

    try {
      sessions = await db
        .select({
          id: tutorSessions.id,
          scheduledAt: tutorSessions.scheduledAt,
          durationMins: tutorSessions.durationMins,
          status: tutorSessions.status,
          jitsiRoomId: tutorSessions.jitsiRoomId,
          tutorId: tutorSessions.tutorId,
          learnerId: tutorSessions.learnerId,
        })
        .from(tutorSessions)
        .where(
          and(
            eq(tutorSessions.status, "confirmed"),
            or(
              eq(tutorSessions.tutorId, user.id),
              eq(tutorSessions.learnerId, user.id)
            ),
            gte(tutorSessions.scheduledAt, now),
            lte(tutorSessions.scheduledAt, twentyFourHoursLater)
          )
        )
        .orderBy(tutorSessions.scheduledAt);
    } catch (err) {
      console.error("Error fetching sessions for reminders:", err);
    }

    if (!sessions || sessions.length === 0) {
      cache.set(user.id, { at: Date.now(), payload: EMPTY });
      return NextResponse.json(EMPTY);
    }

    // Categorize reminders
    const upcomingIn1Hour = sessions.filter(s =>
      new Date(s.scheduledAt).getTime() <= oneHourLater.getTime()
    );
    const upcomingIn24Hours = sessions.filter(s =>
      new Date(s.scheduledAt).getTime() > oneHourLater.getTime() &&
      new Date(s.scheduledAt).getTime() <= twentyFourHoursLater.getTime()
    );

    const payload = {
      upcomingIn1Hour,
      upcomingIn24Hours,
      totalUpcoming: sessions.length,
    };

    cache.set(user.id, { at: Date.now(), payload });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to fetch session reminders:", error);
    return NextResponse.json(EMPTY);
  }
}
