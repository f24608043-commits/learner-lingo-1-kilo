import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorSessions, tutorProfiles, profiles } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ 
        upcomingIn1Hour: [],
        upcomingIn24Hours: [],
        totalUpcoming: 0,
      });
    }

    // Get upcoming sessions for the user (both as tutor and learner)
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Get sessions where user is tutor
    const tutorSessionsData = await db
      .select({
        id: tutorSessions.id,
        scheduledAt: tutorSessions.scheduledAt,
        durationMins: tutorSessions.durationMins,
        status: tutorSessions.status,
        jitsiRoomId: tutorSessions.jitsiRoomId,
        tutorId: tutorSessions.tutorId,
        learnerId: tutorSessions.learnerId,
        tutor: {
          displayName: profiles.displayName,
          email: profiles.email,
        },
        learner: {
          displayName: profiles.displayName,
          email: profiles.email,
        },
      })
      .from(tutorSessions)
      .innerJoin(profiles, eq(tutorSessions.tutorId, profiles.id))
      .innerJoin(tutorProfiles, eq(tutorSessions.tutorId, tutorProfiles.tutorId))
      .where(
        and(
          eq(tutorSessions.status, "confirmed"),
          eq(tutorSessions.tutorId, user.id),
          gte(tutorSessions.scheduledAt, now),
          lte(tutorSessions.scheduledAt, twentyFourHoursLater)
        )
      )
      .orderBy(tutorSessions.scheduledAt);

    // Get sessions where user is learner
    const learnerSessionsData = await db
      .select({
        id: tutorSessions.id,
        scheduledAt: tutorSessions.scheduledAt,
        durationMins: tutorSessions.durationMins,
        status: tutorSessions.status,
        jitsiRoomId: tutorSessions.jitsiRoomId,
        tutorId: tutorSessions.tutorId,
        learnerId: tutorSessions.learnerId,
        tutor: {
          displayName: profiles.displayName,
          email: profiles.email,
        },
        learner: {
          displayName: profiles.displayName,
          email: profiles.email,
        },
      })
      .from(tutorSessions)
      .innerJoin(profiles, eq(tutorSessions.learnerId, profiles.id))
      .innerJoin(tutorProfiles, eq(tutorSessions.tutorId, tutorProfiles.tutorId))
      .where(
        and(
          eq(tutorSessions.status, "confirmed"),
          eq(tutorSessions.learnerId, user.id),
          gte(tutorSessions.scheduledAt, now),
          lte(tutorSessions.scheduledAt, twentyFourHoursLater)
        )
      )
      .orderBy(tutorSessions.scheduledAt);

    const sessions = [...(tutorSessionsData || []), ...(learnerSessionsData || [])];
    
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        upcomingIn1Hour: [],
        upcomingIn24Hours: [],
        totalUpcoming: 0,
      });
    }

    // Categorize reminders
    const upcomingIn1Hour = sessions.filter(s => 
      new Date(s.scheduledAt).getTime() <= oneHourLater.getTime()
    );
    const upcomingIn24Hours = sessions.filter(s => 
      new Date(s.scheduledAt).getTime() > oneHourLater.getTime() &&
      new Date(s.scheduledAt).getTime() <= twentyFourHoursLater.getTime()
    );

    return NextResponse.json({
      upcomingIn1Hour,
      upcomingIn24Hours,
      totalUpcoming: sessions.length,
    });
  } catch (error) {
    console.error("Failed to fetch session reminders:", error);
    return NextResponse.json({
      upcomingIn1Hour: [],
      upcomingIn24Hours: [],
      totalUpcoming: 0,
    });
  }
}