"use server";

import { db } from "@/db";
import { tutorProfiles, tutorAvailability, tutorSessions, sessionRequests, sessionNotes, profiles } from "@/db/schema";
import { eq, and, or, desc, inArray, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/notifications/actions";

// Tutor Profile Actions
export async function createTutorProfile(data: {
  bio: string;
  subjects: string[];
  hourlyRate: number | null;
  timezone: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Check if profile already exists
  const [existing] = await db
    .select()
    .from(tutorProfiles)
    .where(eq(tutorProfiles.tutorId, user.id))
    .limit(1);

  if (existing) {
    throw new Error("Tutor profile already exists");
  }

  await db.insert(tutorProfiles).values({
    tutorId: user.id,
    bio: data.bio,
    subjects: data.subjects,
    hourlyRate: data.hourlyRate,
    timezone: data.timezone,
  });

  revalidatePath("/tutoring");
  return { success: true };
}

export async function updateTutorProfile(data: {
  bio?: string;
  subjects?: string[];
  hourlyRate?: number | null;
  timezone?: string;
  isActive?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  await db
    .update(tutorProfiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(tutorProfiles.tutorId, user.id));

  revalidatePath("/tutoring");
  return { success: true };
}

export async function getTutorProfile(tutorId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("tutor_profiles")
    .select("*")
    .eq("tutor_id", tutorId)
    .maybeSingle();

  return profile;
}

// Tutor Availability Actions
export async function setAvailability(slots: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Delete existing availability
  await db
    .delete(tutorAvailability)
    .where(eq(tutorAvailability.tutorId, user.id));

  // Insert new availability slots
  if (slots.length > 0) {
    await db.insert(tutorAvailability).values(
      slots.map(slot => ({
        tutorId: user.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
    );
  }

  revalidatePath("/tutoring");
  return { success: true };
}

export async function getTutorAvailability(tutorId: string) {
  const availability = await db
    .select()
    .from(tutorAvailability)
    .where(and(eq(tutorAvailability.tutorId, tutorId), eq(tutorAvailability.isActive, true)))
    .orderBy(tutorAvailability.dayOfWeek)
    .limit(50);

  return availability;
}

// Session Booking Actions
export async function requestSession(data: {
  tutorId: string;
  courseId?: string;
  requestedSlots: Array<{ date: string; startTime: string; endTime: string }>;
  message?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Check for double-booking
  for (const slot of data.requestedSlots) {
    const [existing] = await db
      .select()
      .from(tutorSessions)
      .where(
        and(
          eq(tutorSessions.tutorId, data.tutorId),
          eq(tutorSessions.status, "confirmed"),
          gte(tutorSessions.scheduledAt, new Date(slot.date + "T" + slot.startTime)),
          lte(tutorSessions.scheduledAt, new Date(slot.date + "T" + slot.endTime))
        )
      )
      .limit(1);

    if (existing) {
      throw new Error("This time slot is already booked");
    }
  }

  // Create session request
  const [request] = await db
    .insert(sessionRequests)
    .values({
      learnerId: user.id,
      tutorId: data.tutorId,
      requestedSlots: data.requestedSlots,
      message: data.message,
    })
    .returning();

  // Notify tutor
  await createNotification({
    userId: data.tutorId,
    type: "lesson_completed", // Reusing existing type for now
    title: "New Session Request",
    message: "You have a new tutoring session request",
    data: { requestId: request.id },
  });

  revalidatePath("/tutoring");
  return { success: true, requestId: request.id };
}

export async function acceptSessionRequest(requestId: string, selectedSlotIndex: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Get the request
  const [request] = await db
    .select()
    .from(sessionRequests)
    .where(eq(sessionRequests.id, requestId))
    .limit(1);

  if (!request || request.tutorId !== user.id) {
    throw new Error("Request not found or unauthorized");
  }

  const selectedSlot = (request.requestedSlots as any)[selectedSlotIndex];
  if (!selectedSlot) {
    throw new Error("Invalid slot selection");
  }

  // Generate Jitsi room ID
  const jitsiRoomId = `${requestId}-${Math.random().toString(36).substring(2, 10)}`;

  // Create confirmed session
  const [session] = await db
    .insert(tutorSessions)
    .values({
      learnerId: request.learnerId,
      tutorId: request.tutorId,
      courseId: null, // Will be set from request if needed
      scheduledAt: new Date(selectedSlot.date + "T" + selectedSlot.startTime),
      durationMins: 60, // Calculate from slot times
      status: "confirmed",
      jitsiRoomId,
    })
    .returning();

  // Update request status
  await db
    .update(sessionRequests)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(sessionRequests.id, requestId));

  // Notify learner
  await createNotification({
    userId: request.learnerId,
    type: "lesson_completed",
    title: "Session Request Accepted",
    message: "Your tutoring session has been confirmed",
    data: { sessionId: session.id },
  });

  revalidatePath("/tutoring");
  return { success: true, sessionId: session.id };
}

export async function declineSessionRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Get the request
  const [request] = await db
    .select()
    .from(sessionRequests)
    .where(eq(sessionRequests.id, requestId))
    .limit(1);

  if (!request || request.tutorId !== user.id) {
    throw new Error("Request not found or unauthorized");
  }

  // Update request status
  await db
    .update(sessionRequests)
    .set({ status: "declined", updatedAt: new Date() })
    .where(eq(sessionRequests.id, requestId));

  // Notify learner
  await createNotification({
    userId: request.learnerId,
    type: "lesson_completed",
    title: "Session Request Declined",
    message: "Your tutoring session request was declined",
    data: { requestId },
  });

  revalidatePath("/tutoring");
  return { success: true };
}

// Session Management Actions
export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [session] = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  // Check access control
  if (session.tutorId !== user.id && session.learnerId !== user.id) {
    throw new Error("Unauthorized access to session");
  }

  return session;
}

export async function updateSessionStatus(sessionId: string, status: "confirmed" | "cancelled" | "completed" | "no_show") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [session] = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  // Only tutor can update status
  if (session.tutorId !== user.id) {
    throw new Error("Only tutor can update session status");
  }

  await db
    .update(tutorSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(tutorSessions.id, sessionId));

  revalidatePath("/tutoring");
  return { success: true };
}

// Session Notes Actions
export async function addSessionNote(data: {
  sessionId: string;
  noteText: string;
  visibility: "private_tutor" | "shared";
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [session] = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.id, data.sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  // Only tutor can add notes
  if (session.tutorId !== user.id) {
    throw new Error("Only tutor can add session notes");
  }

  await db.insert(sessionNotes).values({
    sessionId: data.sessionId,
    authorId: user.id,
    noteText: data.noteText,
    visibility: data.visibility,
  });

  revalidatePath("/tutoring");
  return { success: true };
}

export async function getSessionNotes(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [session] = await db
    .select()
    .from(tutorSessions)
    .where(eq(tutorSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  // Check access control
  if (session.tutorId !== user.id && session.learnerId !== user.id) {
    throw new Error("Unauthorized access to session");
  }

  const notes = await db
    .select()
    .from(sessionNotes)
    .where(eq(sessionNotes.sessionId, sessionId));

  // Filter private notes for learners
  if (session.learnerId === user.id) {
    return notes.filter(note => note.visibility === "shared");
  }

  return notes;
}

// Tutor Directory Actions
export async function getTutors(filters?: {
  subject?: string;
  minRating?: number;
}) {
  const tutors = await db
    .select({
      id: tutorProfiles.id,
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
    .innerJoin(profiles, eq(tutorProfiles.tutorId, profiles.id))
    .where(eq(tutorProfiles.isActive, true))
    .orderBy(desc(tutorProfiles.rating));

  // Filter by subject if provided (client-side filter for simplicity)
  if (filters?.subject) {
    return tutors.filter((tutor) =>
      tutor.subjects?.includes(filters.subject!)
    );
  }

  // Filter by minimum rating if provided
  if (filters?.minRating) {
    return tutors.filter((tutor) =>
      (tutor.rating || 0) >= filters.minRating!
    );
  }

  return tutors;
}

export async function getMySessions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return [];
  }

  const sessions = await db
    .select()
    .from(tutorSessions)
    .where(or(eq(tutorSessions.tutorId, user.id), eq(tutorSessions.learnerId, user.id)))
    .orderBy(desc(tutorSessions.scheduledAt))
    .limit(50);

  return sessions;
}

export async function getPendingRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return [];
  }

  const requests = await db
    .select({
      id: sessionRequests.id,
      requestedSlots: sessionRequests.requestedSlots,
      message: sessionRequests.message,
      status: sessionRequests.status,
      createdAt: sessionRequests.createdAt,
      learner: {
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(sessionRequests)
    .innerJoin(profiles, eq(sessionRequests.learnerId, profiles.id))
    .where(and(eq(sessionRequests.tutorId, user.id), eq(sessionRequests.status, "pending")))
    .orderBy(desc(sessionRequests.createdAt))
    .limit(50);

  return requests;
}

// FormData-accepting wrapper functions for form actions
export async function createTutorProfileAction(formData: FormData) {
  const bio = formData.get("bio") as string;
  const subjects = formData.getAll("subjects") as string[];
  const hourlyRate = formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null;
  const timezone = formData.get("timezone") as string;
  
  await createTutorProfile({ bio, subjects, hourlyRate, timezone });
}

export async function acceptSessionRequestAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const selectedSlotIndex = Number(formData.get("selectedSlotIndex"));
  
  await acceptSessionRequest(requestId, selectedSlotIndex);
}

export async function declineSessionRequestAction(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  
  await declineSessionRequest(requestId);
}

export async function updateSessionStatusAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const status = formData.get("status") as "confirmed" | "cancelled" | "completed" | "no_show";
  
  await updateSessionStatus(sessionId, status);
}

export async function setAvailabilityAction(formData: FormData) {
  const slots = JSON.parse(formData.get("slots") as string);
  
  await setAvailability(slots);
}

export async function requestSessionAction(formData: FormData) {
  const tutorId = formData.get("tutorId") as string;
  const requestedSlots = JSON.parse(formData.get("requestedSlots") as string);
  const message = formData.get("message") as string | undefined;
  
  await requestSession({ tutorId, requestedSlots, message });
}

export async function startDirectConversationAction(formData: FormData) {
  const otherUserId = formData.get("otherUserId") as string;
  
  const { startDirectConversation } = await import("../messaging/actions");
  await startDirectConversation(otherUserId);
}
