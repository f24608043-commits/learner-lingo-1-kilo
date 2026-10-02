"use server";

import { db } from "@/db";
import { 
  tutorProfiles, 
  tutorAvailability, 
  tutorSessions, 
  sessionRequests, 
  sessionNotes, 
  profiles,
  tutorEnrollments,
  groups,
  groupMembers,
  groupSessions,
  enrollmentStatusEnum,
  groupSessionStatusEnum
} from "@/db/schema";
import { eq, and, or, desc, inArray, gte, lte, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  revalidatePath("/tutoring/dashboard");
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
  const { conversationId } = await startDirectConversation(otherUserId);
  redirect(`/messages/${conversationId}`);
}

// Recurring Session Actions

type CreateRecurringSessionData = {
  tutorId: string;
  learnerId: string;
  startDate: string;
  endDate: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  courseId?: string;
};

export async function createRecurringSession(data: CreateRecurringSessionData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  if (user.id !== data.learnerId && user.id !== data.tutorId) {
    throw new Error("Unauthorized");
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const sessions = [];

  // Generate all dates in the range that match the day of week
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === data.dayOfWeek) {
      const startDateTime = new Date(current);
      const [startHour, startMin] = data.startTime.split(":").map(Number);
      startDateTime.setHours(startHour, startMin, 0, 0);

      const endDateTime = new Date(current);
      const [endHour, endMin] = data.endTime.split(":").map(Number);
      endDateTime.setHours(endHour, endMin, 0, 0);

      const durationMins = Math.round((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));

      // Check for conflicts
      const [conflict] = await db
        .select()
        .from(tutorSessions)
        .where(
          and(
            eq(tutorSessions.tutorId, data.tutorId),
            eq(tutorSessions.status, "confirmed"),
            gte(tutorSessions.scheduledAt, startDateTime),
            lte(tutorSessions.scheduledAt, endDateTime)
          )
        )
        .limit(1);

      if (!conflict) {
        const [session] = await db
          .insert(tutorSessions)
          .values({
            learnerId: data.learnerId,
            tutorId: data.tutorId,
            courseId: data.courseId || null,
            scheduledAt: startDateTime,
            durationMins,
            status: "confirmed",
            jitsiRoomId: `recurring-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          })
          .returning();

        sessions.push(session);
      }
    }
    current.setDate(current.getDate() + 1);
  }

  revalidatePath("/tutoring");
  return { success: true, sessions };
}

// Enrollment Actions
export async function requestEnrollment(tutorId: string, message?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Check if learner already has an enrollment with this tutor
  const [existing] = await db
    .select()
    .from(tutorEnrollments)
    .where(and(eq(tutorEnrollments.learnerId, user.id), eq(tutorEnrollments.tutorId, tutorId)))
    .limit(1);

  if (existing) {
    throw new Error("Enrollment already exists");
  }

  // Create enrollment request
  const [enrollment] = await db
    .insert(tutorEnrollments)
    .values({
      learnerId: user.id,
      tutorId,
      status: "pending",
      message,
    })
    .returning();

  // Notify tutor
  await createNotification({
    userId: tutorId,
    type: "lesson_completed",
    title: "New Enrollment Request",
    message: "A learner wants to enroll with you",
    data: { enrollmentId: enrollment.id },
  });

  revalidatePath("/tutoring");
  return { success: true, enrollmentId: enrollment.id };
}

export async function acceptEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [enrollment] = await db
    .select()
    .from(tutorEnrollments)
    .where(eq(tutorEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.tutorId !== user.id) {
    throw new Error("Enrollment not found or unauthorized");
  }

  await db
    .update(tutorEnrollments)
    .set({ status: "enrolled", updatedAt: new Date() })
    .where(eq(tutorEnrollments.id, enrollmentId));

  // Notify learner
  await createNotification({
    userId: enrollment.learnerId,
    type: "lesson_completed",
    title: "Enrollment Accepted",
    message: "Your enrollment request has been accepted!",
    data: { enrollmentId },
  });

  revalidatePath("/tutoring");
  return { success: true };
}

export async function declineEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [enrollment] = await db
    .select()
    .from(tutorEnrollments)
    .where(eq(tutorEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.tutorId !== user.id) {
    throw new Error("Enrollment not found or unauthorized");
  }

  await db
    .update(tutorEnrollments)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(tutorEnrollments.id, enrollmentId));

  // Notify learner
  await createNotification({
    userId: enrollment.learnerId,
    type: "lesson_completed",
    title: "Enrollment Request Declined",
    message: "Your enrollment request was declined",
    data: { enrollmentId },
  });

  revalidatePath("/tutoring");
  return { success: true };
}

export async function cancelEnrollment(enrollmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [enrollment] = await db
    .select()
    .from(tutorEnrollments)
    .where(eq(tutorEnrollments.id, enrollmentId))
    .limit(1);

  if (!enrollment || enrollment.learnerId !== user.id) {
    throw new Error("Enrollment not found or unauthorized");
  }

  await db
    .update(tutorEnrollments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(tutorEnrollments.id, enrollmentId));

  revalidatePath("/tutoring");
  return { success: true };
}

export async function getLearnerEnrollments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return { pending: [], enrolled: [], rejected: [], cancelled: [] };
  }

  const enrollments = await db
    .select({
      id: tutorEnrollments.id,
      status: tutorEnrollments.status,
      message: tutorEnrollments.message,
      createdAt: tutorEnrollments.createdAt,
      updatedAt: tutorEnrollments.updatedAt,
      tutor: {
        id: profiles.id,
        tutorId: tutorProfiles.tutorId,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
        bio: tutorProfiles.bio,
        subjects: tutorProfiles.subjects,
        hourlyRate: tutorProfiles.hourlyRate,
        rating: tutorProfiles.rating,
        totalSessions: tutorProfiles.totalSessions,
      },
    })
    .from(tutorEnrollments)
    .innerJoin(profiles, eq(tutorEnrollments.tutorId, profiles.id))
    .innerJoin(tutorProfiles, eq(tutorEnrollments.tutorId, tutorProfiles.tutorId))
    .where(eq(tutorEnrollments.learnerId, user.id))
    .orderBy(desc(tutorEnrollments.createdAt));

  return {
    pending: enrollments.filter(e => e.status === "pending"),
    enrolled: enrollments.filter(e => e.status === "enrolled"),
    rejected: enrollments.filter(e => e.status === "rejected"),
    cancelled: enrollments.filter(e => e.status === "cancelled"),
  };
}

export async function getTutorEnrollmentRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return { pending: [], enrolled: [], rejected: [], cancelled: [] };
  }

  const enrollments = await db
    .select({
      id: tutorEnrollments.id,
      status: tutorEnrollments.status,
      message: tutorEnrollments.message,
      createdAt: tutorEnrollments.createdAt,
      updatedAt: tutorEnrollments.updatedAt,
      learner: {
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(tutorEnrollments)
    .innerJoin(profiles, eq(tutorEnrollments.learnerId, profiles.id))
    .where(eq(tutorEnrollments.tutorId, user.id))
    .orderBy(desc(tutorEnrollments.createdAt));

  return {
    pending: enrollments.filter(e => e.status === "pending"),
    enrolled: enrollments.filter(e => e.status === "enrolled"),
    rejected: enrollments.filter(e => e.status === "rejected"),
    cancelled: enrollments.filter(e => e.status === "cancelled"),
  };
}

export async function acceptEnrollmentAction(formData: FormData) {
  const enrollmentId = formData.get("enrollmentId") as string;
  await acceptEnrollment(enrollmentId);
}

export async function declineEnrollmentAction(formData: FormData) {
  const enrollmentId = formData.get("enrollmentId") as string;
  await declineEnrollment(enrollmentId);
}

export async function cancelEnrollmentAction(formData: FormData) {
  const enrollmentId = formData.get("enrollmentId") as string;
  await cancelEnrollment(enrollmentId);
}

export async function requestEnrollmentAction(formData: FormData) {
  const tutorId = formData.get("tutorId") as string;
  const message = formData.get("message") as string | undefined;
  await requestEnrollment(tutorId, message);
}
 
// Session Template Actions
export async function createSessionTemplate(data: {
  name: string;
  description: string;
  durationMins: number;
  subjects: string[];
  materials?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // This would typically be stored in a session_templates table
  // For now, we'll return a mock template
  const template = {
    id: `template-${Date.now()}`,
    tutorId: user.id,
    ...data,
    createdAt: new Date().toISOString(),
  };

  revalidatePath("/tutoring");
  return { success: true, template };
}

export async function getSessionTemplates(tutorId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const targetTutorId = tutorId || user.id;

  // Mock templates for now - would come from a session_templates table
  return [
    {
      id: "template-1",
      name: "Python Basics Review",
      description: "Review fundamental Python concepts",
      durationMins: 60,
      subjects: ["Python", "Programming"],
      materials: "Slides and exercises provided",
    },
    {
      id: "template-2",
      name: "Math Problem Solving",
      description: "Work through challenging math problems",
      durationMins: 90,
      subjects: ["Mathematics"],
      materials: "Practice problems and solutions",
    },
  ];
}

// Quick book from template
export async function bookFromTemplate(data: {
  templateId: string;
  tutorId: string;
  learnerId: string;
  scheduledAt: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Verify template exists and get details
  const templates = await getSessionTemplates(data.tutorId);
  const template = templates.find(t => t.id === data.templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  const startDateTime = new Date(data.scheduledAt);
  const endDateTime = new Date(startDateTime.getTime() + template.durationMins * 60000);

  // Check for conflicts
  const [conflict] = await db
    .select()
    .from(tutorSessions)
    .where(
      and(
        eq(tutorSessions.tutorId, data.tutorId),
        eq(tutorSessions.status, "confirmed"),
        gte(tutorSessions.scheduledAt, startDateTime),
        lte(tutorSessions.scheduledAt, endDateTime)
      )
    )
    .limit(1);

  if (conflict) {
    throw new Error("This time slot is already booked");
  }

  const jitsiRoomId = `template-${data.templateId}-${Date.now()}`;

  const [session] = await db
    .insert(tutorSessions)
    .values({
      learnerId: data.learnerId,
      tutorId: data.tutorId,
      courseId: null,
      scheduledAt: startDateTime,
      durationMins: template.durationMins,
      status: "confirmed",
      jitsiRoomId,
    })
    .returning();

  revalidatePath("/tutoring");
  return { success: true, sessionId: session.id };
}

// Group Actions
export async function createGroup(data: {
  name: string;
  description?: string;
  learnerIds: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  // Verify all learners are enrolled with this tutor
  const enrollments = await db
    .select()
    .from(tutorEnrollments)
    .where(
      and(
        eq(tutorEnrollments.tutorId, user.id),
        eq(tutorEnrollments.status, "enrolled"),
        inArray(tutorEnrollments.learnerId, data.learnerIds)
      )
    );

  if (enrollments.length !== data.learnerIds.length) {
    throw new Error("Some learners are not enrolled with you");
  }

  const [group] = await db
    .insert(groups)
    .values({
      tutorId: user.id,
      name: data.name,
      description: data.description,
    })
    .returning();

  // Add members
  if (data.learnerIds.length > 0) {
    await db.insert(groupMembers).values(
      data.learnerIds.map(learnerId => ({
        groupId: group.id,
        learnerId,
      }))
    );
  }

  revalidatePath("/tutoring");
  return { success: true, groupId: group.id };
}

export async function getTutorGroups() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return [];
  }

  const tutorGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      createdAt: groups.createdAt,
      memberCount: sql<number>`count(${groupMembers.id})`,
    })
    .from(groups)
    .leftJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(eq(groups.tutorId, user.id))
    .groupBy(groups.id)
    .orderBy(desc(groups.createdAt));

  return tutorGroups;
}

export async function getGroupDetails(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.tutorId, user.id)))
    .limit(1);

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  const members = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      enrolledAt: groupMembers.enrolledAt,
    })
    .from(groupMembers)
    .innerJoin(profiles, eq(groupMembers.learnerId, profiles.id))
    .where(eq(groupMembers.groupId, groupId));

  const sessions = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.groupId, groupId))
    .orderBy(desc(groupSessions.scheduledAt));

  return { group, members, sessions };
}

export async function updateGroup(groupId: string, data: {
  name?: string;
  description?: string;
  learnerIds?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.tutorId, user.id)))
    .limit(1);

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  // Update group info
  if (data.name || data.description) {
    await db
      .update(groups)
      .set({
        name: data.name ?? group.name,
        description: data.description ?? group.description,
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));
  }

  // Update members if provided
  if (data.learnerIds !== undefined) {
    // Verify all learners are enrolled with this tutor
    const enrollments = await db
      .select()
      .from(tutorEnrollments)
      .where(
        and(
          eq(tutorEnrollments.tutorId, user.id),
          eq(tutorEnrollments.status, "enrolled"),
          inArray(tutorEnrollments.learnerId, data.learnerIds)
        )
      );

    if (enrollments.length !== data.learnerIds.length) {
      throw new Error("Some learners are not enrolled with you");
    }

    // Remove existing members
    await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));

    // Add new members
    if (data.learnerIds.length > 0) {
      await db.insert(groupMembers).values(
        data.learnerIds.map(learnerId => ({
          groupId,
          learnerId,
        }))
      );
    }
  }

  revalidatePath("/tutoring");
  return { success: true };
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.tutorId, user.id)))
    .limit(1);

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  // Delete members first
  await db.delete(groupMembers).where(eq(groupMembers.groupId, groupId));
  
  // Delete group
  await db.delete(groups).where(eq(groups.id, groupId));

  revalidatePath("/tutoring");
  return { success: true };
}

export async function createGroupSession(data: {
  groupId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  endTime?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, data.groupId), eq(groups.tutorId, user.id)))
    .limit(1);

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  const jitsiRoomId = `group-${data.groupId}-${Date.now()}`;

  const [session] = await db
    .insert(groupSessions)
    .values({
      groupId: data.groupId,
      tutorId: user.id,
      title: data.title,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      endTime: data.endTime ? new Date(data.endTime) : null,
      jitsiRoomId,
      status: "scheduled",
    })
    .returning();

  revalidatePath("/tutoring");
  return { success: true, sessionId: session.id, jitsiRoomId };
}

export async function getGroupSessions(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return [];
  }

  // Verify access (tutor or member)
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return [];
  }

  const isTutor = group.tutorId === user.id;
  if (!isTutor) {
    const membership = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id)))
      .limit(1);

    if (!membership.length) {
      return [];
    }
  }

  const sessions = await db
    .select()
    .from(groupSessions)
    .where(eq(groupSessions.groupId, groupId))
    .orderBy(desc(groupSessions.scheduledAt));

  return sessions;
}

export async function updateGroupSessionStatus(sessionId: string, status: "scheduled" | "ongoing" | "completed" | "cancelled") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [session] = await db
    .select({
      id: groupSessions.id,
      groupId: groupSessions.groupId,
      tutorId: groupSessions.tutorId,
    })
    .from(groupSessions)
    .where(eq(groupSessions.id, sessionId))
    .limit(1);

  if (!session) {
    throw new Error("Session not found");
  }

  // Only tutor can update status
  if (session.tutorId !== user.id) {
    throw new Error("Only tutor can update session status");
  }

  await db
    .update(groupSessions)
    .set({ status, updatedAt: new Date() })
    .where(eq(groupSessions.id, sessionId));

  revalidatePath("/tutoring");
  return { success: true };
}

export async function createGroupAction(formData: FormData) {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | undefined;
  const learnerIds = JSON.parse(formData.get("learnerIds") as string);
  
  await createGroup({ name, description, learnerIds });
}

export async function updateGroupAction(formData: FormData) {
  const groupId = formData.get("groupId") as string;
  const name = formData.get("name") as string | undefined;
  const description = formData.get("description") as string | undefined;
  const learnerIds = JSON.parse(formData.get("learnerIds") as string | "[]");
  
  await updateGroup(groupId, { name, description, learnerIds });
}

export async function deleteGroupAction(formData: FormData) {
  const groupId = formData.get("groupId") as string;
  await deleteGroup(groupId);
}

export async function createGroupSessionAction(formData: FormData) {
  const groupId = formData.get("groupId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | undefined;
  const scheduledAt = formData.get("scheduledAt") as string;
  const endTime = formData.get("endTime") as string | undefined;

  await createGroupSession({ groupId, title, description, scheduledAt, endTime });
}

export async function updateGroupSessionStatusAction(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const status = formData.get("status") as "scheduled" | "ongoing" | "completed" | "cancelled";
  await updateGroupSessionStatus(sessionId, status);
}
