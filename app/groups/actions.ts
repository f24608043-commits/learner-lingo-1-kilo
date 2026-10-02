"use server";

import { db } from "@/db";
import {
  assignments,
  assignmentAttachments,
  assignmentStatusEnum,
  submissions,
  submissionAttachments,
  submissionStatusEnum,
  groups,
  groupMembers,
  profiles,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/notifications/actions";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  return user;
}

/** Tutor-only access. Profilerless tutors and non-owners are rejected. */
async function requireGroupTutor(groupId: string) {
  const user = await requireUser();

  const [group] = await db
    .select({ id: groups.id, tutorId: groups.tutorId, name: groups.name })
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.tutorId, user.id)))
    .limit(1);

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  return { user, group };
}

/** Member-or-tutor access. Uses a row check, not an array truthiness check. */
async function requireGroupAccess(groupId: string) {
  const user = await requireUser();

  const [group] = await db
    .select({ id: groups.id, tutorId: groups.tutorId, name: groups.name })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    throw new Error("Group not found");
  }

  if (group.tutorId === user.id) {
    return { user, group, isTutor: true };
  }

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id)))
    .limit(1);

  if (!membership) {
    throw new Error("You are not a member of this group");
  }

  return { user, group, isTutor: false };
}

async function getGroupStudentIds(groupId: string): Promise<string[]> {
  const rows = await db
    .select({ learnerId: groupMembers.learnerId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));

  return rows.map((r) => r.learnerId);
}

// ── Assignments ──────────────────────────────────────────────

export async function createAssignment(data: {
  groupId: string;
  title: string;
  description?: string;
  instructions?: string;
  dueDate?: string | null;
  availableFrom?: string | null;
  points?: number;
}) {
  const { user, group } = await requireGroupTutor(data.groupId);

  const title = data.title?.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const [created] = await db
    .insert(assignments)
    .values({
      groupId: data.groupId,
      tutorId: user.id,
      title,
      description: data.description ?? null,
      instructions: data.instructions ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      points: data.points ?? 100,
      status: "draft",
    })
    .returning();

  revalidatePath(`/groups/${data.groupId}/assignments`);
  return created;
}

export async function updateAssignment(
  assignmentId: string,
  data: {
    title?: string;
    description?: string;
    instructions?: string;
    dueDate?: string | null;
    availableFrom?: string | null;
    points?: number;
  }
) {
  const { group } = await requireAssignmentAccess(assignmentId);

  await db
    .update(assignments)
    .set({
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
        : {}),
      ...(data.availableFrom !== undefined
        ? { availableFrom: data.availableFrom ? new Date(data.availableFrom) : null }
        : {}),
      ...(data.points !== undefined ? { points: data.points } : {}),
      updatedAt: new Date(),
    })
    .where(eq(assignments.id, assignmentId));

  revalidatePath(`/groups/${group.id}/assignments`);
  return { success: true };
}

export async function setAssignmentStatus(
  assignmentId: string,
  status: (typeof assignmentStatusEnum.enumValues)[number]
) {
  const { user, group } = await requireAssignmentTutor(assignmentId);

  await db
    .update(assignments)
    .set({ status, updatedAt: new Date() })
    .where(eq(assignments.id, assignmentId));

  if (status === "published") {
    const studentIds = (await getGroupStudentIds(group.id)).filter((id) => id !== user.id);

    await Promise.all(
      studentIds.map((studentId) =>
        createNotification({
          userId: studentId,
          type: "assignment_published",
          title: "New assignment",
          message: `A new assignment was posted in ${group.name}.`,
          data: { assignmentId, groupId: group.id },
        })
      )
    );
  }

  revalidatePath(`/groups/${group.id}/assignments`);
  return { success: true };
}

export async function deleteAssignment(assignmentId: string) {
  const { group } = await requireAssignmentTutor(assignmentId);

  await db.delete(assignments).where(eq(assignments.id, assignmentId));

  revalidatePath(`/groups/${group.id}/assignments`);
  return { success: true };
}

/** Loads the assignment and confirms the caller may touch its group. */
async function requireAssignmentAccess(assignmentId: string) {
  const [assignment] = await db
    .select({ id: assignments.id, groupId: assignments.groupId })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const access = await requireGroupAccess(assignment.groupId);
  return { ...access, assignment };
}

async function requireAssignmentTutor(assignmentId: string) {
  const [assignment] = await db
    .select({ id: assignments.id, groupId: assignments.groupId })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!assignment) {
    throw new Error("Assignment not found");
  }

  const access = await requireGroupTutor(assignment.groupId);
  return { ...access, assignment };
}

export async function getGroupAssignments(groupId: string) {
  const { user, isTutor } = await requireGroupAccess(groupId);

  const rows = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      description: assignments.description,
      instructions: assignments.instructions,
      dueDate: assignments.dueDate,
      availableFrom: assignments.availableFrom,
      points: assignments.points,
      status: assignments.status,
      createdAt: assignments.createdAt,
      tutorId: assignments.tutorId,
      // Note: Drizzle strips table qualifiers inside `sql` templates, so these
      // aggregates name their tables explicitly to avoid binding to the wrong one.
      submissionCount: sql<number>`count(distinct "submissions"."id") filter (where "submissions"."status" <> 'draft')::int`,
      myStatus: sql<string | null>`max("submissions"."status") filter (where "submissions"."student_id" = ${user.id})`,
    })
    .from(assignments)
    .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
    .where(eq(assignments.groupId, groupId))
    .groupBy(assignments.id)
    .orderBy(asc(assignments.dueDate), desc(assignments.createdAt));

  // Learners only see published work.
  const visible = isTutor ? rows : rows.filter((r) => r.status === "published");

  return visible.map((r) => ({
    ...r,
    submissionCount: Number(r.submissionCount),
  }));
}

export async function getAssignmentDetail(assignmentId: string) {
  const { user, isTutor, assignment } = await requireAssignmentAccess(assignmentId);

  const [row] = await db
    .select()
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!row || (!isTutor && row.status !== "published")) {
    throw new Error("Assignment not found");
  }

  const files = await db
    .select()
    .from(assignmentAttachments)
    .where(eq(assignmentAttachments.assignmentId, assignmentId));

  const mySubmission = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.studentId, user.id)
      )
    )
    .limit(1);

  return {
    assignment: row,
    attachments: files,
    mySubmission: mySubmission[0] ?? null,
    isTutor,
  };
}

// ── Submissions ──────────────────────────────────────────────

export async function saveSubmission(
  assignmentId: string,
  data: { textAnswer?: string; submit?: boolean; fileUrls?: string[] }
) {
  const { user, assignment } = await requireAssignmentAccess(assignmentId);
  const groupId = assignment.groupId;

  const [parent] = await db
    .select({ status: assignments.status, title: assignments.title, dueDate: assignments.dueDate })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  if (!parent || parent.status !== "published") {
    throw new Error("This assignment is not open for submissions");
  }

  const now = new Date();
  const isLate = parent.dueDate ? now > parent.dueDate : false;

  let status: (typeof submissionStatusEnum.enumValues)[number] = data.submit
    ? isLate
      ? "late"
      : "submitted"
    : "draft";

  const [existing] = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.assignmentId, assignmentId),
        eq(submissions.studentId, user.id)
      )
    )
    .limit(1);

  let submission;
  if (existing) {
    // Re-submission after grading resets the grade.
    const wasGraded = existing.status === "graded" || existing.status === "returned";
    [submission] = await db
      .update(submissions)
      .set({
        ...(data.textAnswer !== undefined ? { textAnswer: data.textAnswer } : {}),
        status,
        ...(data.submit ? { submittedAt: now } : {}),
        ...(wasGraded && data.submit
          ? { pointsEarned: null, feedback: null, gradedBy: null, gradedAt: null }
          : {}),
        updatedAt: now,
      })
      .where(eq(submissions.id, existing.id))
      .returning();
  } else {
    [submission] = await db
      .insert(submissions)
      .values({
        assignmentId,
        studentId: user.id,
        textAnswer: data.textAnswer ?? null,
        status,
        ...(data.submit ? { submittedAt: now } : {}),
      })
      .returning();
  }

  if (data.fileUrls?.length && submission) {
    await db.insert(submissionAttachments).values(
      data.fileUrls.map((url) => ({ submissionId: submission.id, fileUrl: url }))
    );
  }

  if (data.submit) {
    const tutorId = await getGroupTutorId(groupId);

    if (tutorId) {
      await createNotification({
        userId: tutorId,
        type: "submission_received",
        title: "Submission received",
        message: `A student submitted "${parent.title}".`,
        data: { assignmentId, submissionId: submission?.id, groupId },
      });
    }
  }

  revalidatePath(`/groups/${groupId}/assignments`);
  return submission;
}

async function getGroupTutorId(groupId: string): Promise<string | null> {
  const [row] = await db
    .select({ tutorId: groups.tutorId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return row?.tutorId ?? null;
}

export async function getAssignmentSubmissions(assignmentId: string) {
  await requireAssignmentTutor(assignmentId);

  const rows = await db
    .select({
      id: submissions.id,
      studentId: submissions.studentId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      textAnswer: submissions.textAnswer,
      submittedAt: submissions.submittedAt,
      status: submissions.status,
      pointsEarned: submissions.pointsEarned,
      feedback: submissions.feedback,
      gradedAt: submissions.gradedAt,
    })
    .from(submissions)
    .leftJoin(profiles, eq(submissions.studentId, profiles.id))
    .where(eq(submissions.assignmentId, assignmentId))
    .orderBy(asc(submissions.submittedAt));

  const [parent] = await db
    .select({ points: assignments.points, title: assignments.title })
    .from(assignments)
    .where(eq(assignments.id, assignmentId))
    .limit(1);

  return { submissions: rows, maxPoints: parent?.points ?? 100, title: parent?.title ?? "" };
}

export async function gradeSubmission(
  submissionId: string,
  data: { pointsEarned: number; feedback?: string }
) {
  const user = await requireUser();

  const [submission] = await db
    .select({ id: submissions.id, studentId: submissions.studentId, assignmentId: submissions.assignmentId })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  const { group } = await requireAssignmentTutor(submission.assignmentId);

  const [parent] = await db
    .select({ points: assignments.points, title: assignments.title })
    .from(assignments)
    .where(eq(assignments.id, submission.assignmentId))
    .limit(1);

  const maxPoints = parent?.points ?? 100;
  const points = Number(data.pointsEarned);

  if (!Number.isFinite(points) || points < 0 || points > maxPoints) {
    throw new Error(`Score must be between 0 and ${maxPoints}`);
  }

  await db
    .update(submissions)
    .set({
      pointsEarned: points,
      feedback: data.feedback ?? null,
      status: "graded",
      gradedBy: user.id,
      gradedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId));

  await createNotification({
    userId: submission.studentId,
    type: "submission_graded",
    title: "Assignment graded",
    message: `Your work on "${parent?.title ?? "assignment"}" was graded.`,
    data: { assignmentId: submission.assignmentId, submissionId, groupId: group.id, points },
  });

  revalidatePath(`/groups/${group.id}/assignments`);
  return { success: true };
}

export async function deleteSubmission(submissionId: string) {
  const user = await requireUser();

  const [submission] = await db
    .select({ studentId: submissions.studentId, assignmentId: submissions.assignmentId })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission) {
    throw new Error("Submission not found");
  }

  // The owner may delete an unsubmitted draft; anything else needs the tutor.
  if (submission.studentId !== user.id) {
    await requireAssignmentTutor(submission.assignmentId);
  }

  await db.delete(submissions).where(eq(submissions.id, submissionId));
  return { success: true };
}

export async function getGroupAssignmentStats(groupId: string) {
  await requireGroupAccess(groupId);

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) FILTER (WHERE ${assignments.status} = 'published')::int`,
      drafts: sql<number>`count(*) FILTER (WHERE ${assignments.status} = 'draft')::int`,
    })
    .from(assignments)
    .where(eq(assignments.groupId, groupId));

  const studentIds = await getGroupStudentIds(groupId);

  const graded = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .where(
      and(
        eq(assignments.groupId, groupId),
        eq(submissions.status, "graded")
      )
    );

  return {
    total: Number(totals?.total ?? 0),
    published: Number(totals?.published ?? 0),
    drafts: Number(totals?.drafts ?? 0),
    studentCount: studentIds.length,
    gradedCount: Number(graded[0]?.count ?? 0),
  };
}
