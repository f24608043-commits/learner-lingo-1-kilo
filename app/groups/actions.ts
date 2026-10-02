"use server";

import { db, withDbRetry } from "@/db";
import {
  assignments,
  assignmentAttachments,
  assignmentStatusEnum,
  submissions,
  submissionAttachments,
  submissionStatusEnum,
  groups,
  groupMembers,
  groupAnnouncements,
  groupComments,
  commentTargetTypeEnum,
  profiles,
  quizzes,
  quizQuestions,
  quizOptions,
  quizAttempts,
  quizAnswers,
  quizQuestionTypeEnum,
  enrollmentRequests,
  enrollmentRequestStatusEnum,
  tutorEnrollments,
  tutorReviews,
  notifications,
} from "@/db/schema";
import { and, asc, count, desc, eq, inArray, isNull, ne, or, sql, sum } from "drizzle-orm";
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

  const [group] = await withDbRetry(() =>
    db
      .select({ id: groups.id, tutorId: groups.tutorId, name: groups.name })
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.tutorId, user.id)))
      .limit(1)
  );

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  return { user, group };
}

/** Member-or-tutor access. Uses a row check, not an array truthiness check. */
async function requireGroupAccess(groupId: string) {
  const user = await requireUser();

  const [group] = await withDbRetry(() =>
    db
      .select({ id: groups.id, tutorId: groups.tutorId, name: groups.name })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1)
  );

  if (!group) {
    throw new Error("Group not found");
  }

  if (group.tutorId === user.id) {
    return { user, group, isTutor: true };
  }

  const [membership] = await withDbRetry(() =>
    db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id)))
      .limit(1)
  );

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
    .select({
      id: assignments.id,
      groupId: assignments.groupId,
      status: assignments.status,
      title: assignments.title,
    })
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

  const mySubmissionFiles = mySubmission.length
    ? await db
        .select()
        .from(submissionAttachments)
        .where(eq(submissionAttachments.submissionId, mySubmission[0].id))
    : [];

  return {
    assignment: row,
    attachments: files,
    mySubmission: mySubmission[0] ?? null,
    mySubmissionAttachments: mySubmissionFiles,
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

// ── Announcements (group stream) ─────────────────────────────

export async function createAnnouncement(data: {
  groupId: string;
  title: string;
  content?: string;
  mentionUserIds?: string[];
  pinned?: boolean;
}) {
  const { user, group } = await requireGroupTutor(data.groupId);

  const title = data.title?.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  // Only mention people actually in the group.
  const memberIds = new Set(await getGroupStudentIds(data.groupId));
  const mentions = (data.mentionUserIds ?? []).filter((id) => memberIds.has(id));

  const [created] = await db
    .insert(groupAnnouncements)
    .values({
      groupId: data.groupId,
      tutorId: user.id,
      title,
      content: data.content ?? null,
      mentionUserIds: mentions,
      pinned: data.pinned ?? false,
    })
    .returning();

  const recipients = [...memberIds].filter((id) => id !== user.id);
  await Promise.all(
    recipients.map((studentId) =>
      createNotification({
        userId: studentId,
        type: "group_invite",
        title: `Announcement in ${group.name}`,
        message: title,
        data: { groupId: data.groupId, announcementId: created.id },
      })
    )
  );

  revalidatePath(`/groups/${data.groupId}`);
  return created;
}

export async function updateAnnouncement(
  announcementId: string,
  data: { title?: string; content?: string; pinned?: boolean }
) {
  const { group } = await requireAnnouncementTutor(announcementId);

  await db
    .update(groupAnnouncements)
    .set({
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
      updatedAt: new Date(),
    })
    .where(eq(groupAnnouncements.id, announcementId));

  revalidatePath(`/groups/${group.id}`);
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const { group } = await requireAnnouncementTutor(announcementId);

  await db.delete(groupAnnouncements).where(eq(groupAnnouncements.id, announcementId));

  revalidatePath(`/groups/${group.id}`);
  return { success: true };
}

async function requireAnnouncementTutor(announcementId: string) {
  const [row] = await db
    .select({ groupId: groupAnnouncements.groupId })
    .from(groupAnnouncements)
    .where(eq(groupAnnouncements.id, announcementId))
    .limit(1);

  if (!row) {
    throw new Error("Announcement not found");
  }

  return requireGroupTutor(row.groupId);
}

export async function getAnnouncements(groupId: string) {
  await requireGroupAccess(groupId);

  const rows = await db
    .select({
      id: groupAnnouncements.id,
      title: groupAnnouncements.title,
      content: groupAnnouncements.content,
      pinned: groupAnnouncements.pinned,
      mentionUserIds: groupAnnouncements.mentionUserIds,
      createdAt: groupAnnouncements.createdAt,
      updatedAt: groupAnnouncements.updatedAt,
      tutorId: groupAnnouncements.tutorId,
      authorName: profiles.displayName,
      authorAvatar: profiles.avatarUrl,
      commentCount: sql<number>`(
        SELECT count(*)::int FROM ${groupComments}
        WHERE ${groupComments.targetType} = 'announcement'
          AND ${groupComments.targetId} = ${groupAnnouncements.id}
      )`,
    })
    .from(groupAnnouncements)
    .leftJoin(profiles, eq(groupAnnouncements.tutorId, profiles.id))
    .where(eq(groupAnnouncements.groupId, groupId))
    .orderBy(desc(groupAnnouncements.pinned), desc(groupAnnouncements.createdAt));

  return rows.map((r) => ({ ...r, commentCount: Number(r.commentCount) }));
}

// ── Comments (stream + threaded) ─────────────────────────────

export async function createComment(data: {
  groupId: string;
  content: string;
  targetType?: (typeof commentTargetTypeEnum.enumValues)[number];
  targetId?: string | null;
  parentId?: string | null;
}) {
  const { user, group } = await requireGroupAccess(data.groupId);

  const content = data.content?.trim();
  if (!content) {
    throw new Error("Comment cannot be empty");
  }

  // A threaded reply must belong to a comment in this same group.
  if (data.parentId) {
    const [parent] = await db
      .select({ id: groupComments.id, groupId: groupComments.groupId })
      .from(groupComments)
      .where(eq(groupComments.id, data.parentId))
      .limit(1);

    if (!parent || parent.groupId !== data.groupId) {
      throw new Error("Parent comment not found");
    }
  }

  const [created] = await db
    .insert(groupComments)
    .values({
      groupId: data.groupId,
      userId: user.id,
      content,
      targetType: data.targetType ?? "group",
      targetId: data.targetId ?? null,
      parentId: data.parentId ?? null,
    })
    .returning();

  revalidatePath(`/groups/${group.id}`);
  return created;
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();

  const [comment] = await db
    .select({ id: groupComments.id, userId: groupComments.userId, groupId: groupComments.groupId })
    .from(groupComments)
    .where(eq(groupComments.id, commentId))
    .limit(1);

  if (!comment) {
    throw new Error("Comment not found");
  }

  // Authors can delete their own; otherwise it must be the group tutor.
  if (comment.userId !== user.id) {
    await requireGroupTutor(comment.groupId);
  }

  await db.delete(groupComments).where(eq(groupComments.id, commentId));

  revalidatePath(`/groups/${comment.groupId}`);
  return { success: true };
}

export async function getComments(data: {
  groupId: string;
  targetType: (typeof commentTargetTypeEnum.enumValues)[number];
  targetId?: string | null;
}) {
  await requireGroupAccess(data.groupId);

  const rows = await db
    .select({
      id: groupComments.id,
      content: groupComments.content,
      parentId: groupComments.parentId,
      createdAt: groupComments.createdAt,
      userId: groupComments.userId,
      authorName: profiles.displayName,
      authorAvatar: profiles.avatarUrl,
      authorRole: profiles.role,
    })
    .from(groupComments)
    .leftJoin(profiles, eq(groupComments.userId, profiles.id))
    .where(
      and(
        eq(groupComments.groupId, data.groupId),
        eq(groupComments.targetType, data.targetType),
        data.targetId
          ? eq(groupComments.targetId, data.targetId)
          : isNull(groupComments.targetId)
      )
    )
    .orderBy(asc(groupComments.createdAt));

  return rows;
}

// ── Enrollment requests ──────────────────────────────────────

export async function requestGroupEnrollment(data: {
  groupId?: string;
  groupCode?: string;
}) {
  const user = await requireUser();

  let groupId = data.groupId;

  if (!groupId) {
    const code = data.groupCode?.trim().toUpperCase();
    if (!code) {
      throw new Error("Provide a group code or id");
    }

    const [group] = await db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.groupCode, code))
      .limit(1);

    if (!group) {
      throw new Error("No group matches that code");
    }

    groupId = group.id;
  }

  // Deliberately not requireGroupAccess: a non-member is exactly who may
  // request enrollment, so membership must not be checked here.
  const [group] = await db
    .select({ id: groups.id, tutorId: groups.tutorId, name: groups.name, privacy: groups.privacy })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    throw new Error("Group not found");
  }

  // The tutor already has access; nothing to request.
  if (group.tutorId === user.id) {
    throw new Error("You already own this group");
  }

  // An archived or invite-only group should not accept open requests.
  if (group.privacy === "archived") {
    throw new Error("This group is archived");
  }

  const [alreadyMember] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id)))
    .limit(1);

  if (alreadyMember) {
    throw new Error("You are already in this group");
  }

  const existing = await db
    .select()
    .from(enrollmentRequests)
    .where(
      and(
        eq(enrollmentRequests.groupId, groupId),
        eq(enrollmentRequests.studentId, user.id)
      )
    )
    .limit(1);

  if (existing.length) {
    throw new Error(
      existing[0].status === "pending"
        ? "Your request is already pending"
        : "You have already requested to join"
    );
  }

  const [created] = await db.insert(enrollmentRequests).values({
    groupId,
    studentId: user.id,
  }).returning();

  await createNotification({
    userId: group.tutorId,
    type: "group_invite",
    title: "New enrollment request",
    message: `Someone asked to join ${group.name}.`,
    data: { groupId, requestId: created.id },
  });

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return created;
}

export async function respondToEnrollmentRequest(
  requestId: string,
  response: "approved" | "rejected",
  message?: string
) {
  const [request] = await db
    .select({ id: enrollmentRequests.id, groupId: enrollmentRequests.groupId, studentId: enrollmentRequests.studentId, status: enrollmentRequests.status })
    .from(enrollmentRequests)
    .where(eq(enrollmentRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new Error("Request not found");
  }

  const { group } = await requireGroupTutor(request.groupId);

  if (request.status !== "pending") {
    throw new Error("This request was already handled");
  }

  await db
    .update(enrollmentRequests)
    .set({
      status: response,
      respondedAt: new Date(),
      responseMessage: message ?? null,
    })
    .where(eq(enrollmentRequests.id, requestId));

  if (response === "approved") {
    await db
      .insert(groupMembers)
      .values({ groupId: request.groupId, learnerId: request.studentId })
      .onConflictDoNothing();
  }

  await createNotification({
    userId: request.studentId,
    type: response === "approved" ? "enrollment_accepted" : "enrollment_declined",
    title: response === "approved" ? "Enrollment approved" : "Enrollment declined",
    message: message ?? `Your request for ${group.name} was ${response}.`,
    data: { groupId: request.groupId },
  });

  revalidatePath(`/groups/${request.groupId}`);
  revalidatePath("/groups");
  return { success: true };
}

export async function cancelEnrollmentRequest(requestId: string) {
  const user = await requireUser();

  const [request] = await db
    .select({ id: enrollmentRequests.id, studentId: enrollmentRequests.studentId, status: enrollmentRequests.status, groupId: enrollmentRequests.groupId })
    .from(enrollmentRequests)
    .where(eq(enrollmentRequests.id, requestId))
    .limit(1);

  if (!request || request.studentId !== user.id) {
    throw new Error("Request not found");
  }

  if (request.status !== "pending") {
    throw new Error("This request was already handled");
  }

  await db
    .update(enrollmentRequests)
    .set({ status: "cancelled", respondedAt: new Date() })
    .where(eq(enrollmentRequests.id, requestId));

  revalidatePath("/groups");
  revalidatePath(`/groups/${request.groupId}`);
  return { success: true };
}

export async function getEnrollmentRequestsForGroup(groupId: string) {
  await requireGroupTutor(groupId);

  return db
    .select({
      id: enrollmentRequests.id,
      status: enrollmentRequests.status,
      requestedAt: enrollmentRequests.requestedAt,
      respondedAt: enrollmentRequests.respondedAt,
      responseMessage: enrollmentRequests.responseMessage,
      studentId: profiles.id,
      studentName: profiles.displayName,
      studentAvatar: profiles.avatarUrl,
    })
    .from(enrollmentRequests)
    .leftJoin(profiles, eq(enrollmentRequests.studentId, profiles.id))
    .where(eq(enrollmentRequests.groupId, groupId))
    .orderBy(asc(enrollmentRequests.requestedAt));
}

export async function getMyEnrollmentRequests() {
  const user = await requireUser();

  return db
    .select({
      id: enrollmentRequests.id,
      groupId: enrollmentRequests.groupId,
      status: enrollmentRequests.status,
      requestedAt: enrollmentRequests.requestedAt,
      responseMessage: enrollmentRequests.responseMessage,
      groupName: groups.name,
    })
    .from(enrollmentRequests)
    .leftJoin(groups, eq(enrollmentRequests.groupId, groups.id))
    .where(eq(enrollmentRequests.studentId, user.id))
    .orderBy(desc(enrollmentRequests.requestedAt));
}

// ── Tutor reviews ────────────────────────────────────────────

export async function upsertTutorReview(data: {
  tutorId: string;
  rating: number;
  reviewText?: string;
}) {
  const user = await requireUser();

  if (user.id === data.tutorId) {
    throw new Error("You cannot review yourself");
  }

  const rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be a whole number from 1 to 5");
  }

  // Only people who actually studied with the tutor may review them.
  const [enrollment] = await db
    .select({ id: tutorEnrollments.id })
    .from(tutorEnrollments)
    .where(and(eq(tutorEnrollments.tutorId, data.tutorId), eq(tutorEnrollments.learnerId, user.id)))
    .limit(1);

  if (!enrollment) {
    throw new Error("You can only review tutors you are enrolled with");
  }

  await db
    .insert(tutorReviews)
    .values({
      tutorId: data.tutorId,
      studentId: user.id,
      rating,
      reviewText: data.reviewText?.trim() || null,
    })
    .onConflictDoUpdate({
      target: [tutorReviews.tutorId, tutorReviews.studentId],
      set: { rating, reviewText: data.reviewText?.trim() || null, updatedAt: new Date() },
    });

  revalidatePath(`/tutors/${data.tutorId}`);
  return { success: true };
}

export async function deleteTutorReview(tutorId: string) {
  const user = await requireUser();

  await db
    .delete(tutorReviews)
    .where(and(eq(tutorReviews.tutorId, tutorId), eq(tutorReviews.studentId, user.id)));

  revalidatePath(`/tutors/${tutorId}`);
  return { success: true };
}

export async function getTutorReviews(tutorId: string) {
  const reviews = await db
    .select({
      id: tutorReviews.id,
      rating: tutorReviews.rating,
      reviewText: tutorReviews.reviewText,
      createdAt: tutorReviews.createdAt,
      studentId: tutorReviews.studentId,
      studentName: profiles.displayName,
      studentAvatar: profiles.avatarUrl,
    })
    .from(tutorReviews)
    .leftJoin(profiles, eq(tutorReviews.studentId, profiles.id))
    .where(eq(tutorReviews.tutorId, tutorId))
    .orderBy(desc(tutorReviews.createdAt));

  const [aggregate] = await db
    .select({
      average: sql<number>`coalesce(avg(${tutorReviews.rating}), 0)::numeric(3,2)`,
      total: count(),
    })
    .from(tutorReviews)
    .where(eq(tutorReviews.tutorId, tutorId));

  // Star breakdown, computed from the rows we already fetched.
  const breakdown = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  return {
    reviews,
    average: Number(aggregate?.average ?? 0),
    total: Number(aggregate?.total ?? 0),
    breakdown,
  };
}

// ── Gradebook ───────────────────────────────────────────────

export async function getGradebook(groupId: string) {
  const { isTutor } = await requireGroupAccess(groupId);

  const published = await db
    .select({ id: assignments.id, title: assignments.title, points: assignments.points, dueDate: assignments.dueDate })
    .from(assignments)
    .where(and(eq(assignments.groupId, groupId), eq(assignments.status, "published")))
    .orderBy(asc(assignments.dueDate), desc(assignments.createdAt));

  const assignmentIds = published.map((a) => a.id);
  const studentIds = await getGroupStudentIds(groupId);

  const existing = assignmentIds.length
    ? await db
        .select({
          assignmentId: submissions.assignmentId,
          studentId: submissions.studentId,
          status: submissions.status,
          pointsEarned: submissions.pointsEarned,
          submittedAt: submissions.submittedAt,
        })
        .from(submissions)
        .where(inArray(submissions.assignmentId, assignmentIds))
    : [];

  const key = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    key.set(`${row.assignmentId}:${row.studentId}`, row);
  }

  const rows = studentIds.map((studentId) => {
    let earned = 0;
    let possible = 0;
    let graded = 0;

    const perAssignment = published.map((a) => {
      const cell = key.get(`${a.id}:${studentId}`);
      if (cell?.pointsEarned != null) {
        earned += cell.pointsEarned;
        graded += 1;
      }
      possible += a.points;
      return {
        assignmentId: a.id,
        status: cell?.status ?? "missing",
        pointsEarned: cell?.pointsEarned ?? null,
      };
    });

    return {
      studentId,
      earned,
      possible,
      graded,
      total: published.length,
      percent: possible ? Math.round((earned / possible) * 100) : 0,
      perAssignment,
    };
  });

  return {
    assignments: published,
    rows,
    isTutor,
    totals: {
      students: studentIds.length,
      assignments: published.length,
    },
  };
}

// ── Group discovery ──────────────────────────────────────────

export async function getMyGroups() {
  const user = await requireUser();

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.learnerId, user.id));

  const memberIds = memberships.map((m) => m.groupId);
  const owned = await db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.tutorId, user.id));

  const allIds = [...new Set([...owned.map((o) => o.id), ...memberIds])];

  if (!allIds.length) {
    return [];
  }

  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      subject: groups.subject,
      gradeLevel: groups.gradeLevel,
      coverImageUrl: groups.coverImageUrl,
      groupCode: groups.groupCode,
      privacy: groups.privacy,
      tutorId: groups.tutorId,
      tutorName: profiles.displayName,
      memberCount: sql<number>`count(distinct ${groupMembers.id})::int`,
    })
    .from(groups)
    .leftJoin(profiles, eq(groups.tutorId, profiles.id))
    .leftJoin(groupMembers, eq(groupMembers.groupId, groups.id))
    .where(inArray(groups.id, allIds))
    .groupBy(groups.id, profiles.displayName)
    .orderBy(desc(groups.createdAt));

  return rows.map((r) => ({
    ...r,
    memberCount: Number(r.memberCount),
    role: r.tutorId === user.id ? ("tutor" as const) : ("student" as const),
  }));
}

export async function getGroupPeople(groupId: string) {
  const { isTutor } = await requireGroupAccess(groupId);

  const members = await db
    .select({
      id: groupMembers.id,
      learnerId: groupMembers.learnerId,
      role: groupMembers.role,
      enrolledAt: groupMembers.enrolledAt,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(groupMembers)
    .leftJoin(profiles, eq(groupMembers.learnerId, profiles.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(profiles.displayName));

  const pending = isTutor
    ? await db
        .select({
          id: enrollmentRequests.id,
          studentId: enrollmentRequests.studentId,
          status: enrollmentRequests.status,
          requestedAt: enrollmentRequests.requestedAt,
          displayName: profiles.displayName,
          avatarUrl: profiles.avatarUrl,
        })
        .from(enrollmentRequests)
        .leftJoin(profiles, eq(enrollmentRequests.studentId, profiles.id))
        .where(
          and(
            eq(enrollmentRequests.groupId, groupId),
            eq(enrollmentRequests.status, "pending")
          )
        )
        .orderBy(asc(enrollmentRequests.requestedAt))
    : [];

  return { members, pendingRequests: pending };
}

// ── Quizzes ──────────────────────────────────────────────────

export type QuizQuestionInput = {
  questionText: string;
  questionType: (typeof quizQuestionTypeEnum.enumValues)[number];
  points: number;
  correctText?: string | null;
  explanation?: string | null;
  options?: { optionText: string; isCorrect: boolean }[];
};

export async function createQuiz(data: {
  assignmentId: string;
  timeLimitMinutes?: number | null;
  allowRetakes?: boolean;
  maxAttempts?: number;
  passingScore?: number | null;
  questions: QuizQuestionInput[];
}) {
  const { group } = await requireAssignmentTutor(data.assignmentId);

  if (!data.questions?.length) {
    throw new Error("A quiz needs at least one question");
  }

  for (const [i, q] of data.questions.entries()) {
    if (!q.questionText?.trim()) {
      throw new Error(`Question ${i + 1} is missing its text`);
    }
    const points = Number(q.points);
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error(`Question ${i + 1} needs a positive point value`);
    }
    if (q.questionType === "multiple_choice" || q.questionType === "true_false") {
      if (!q.options?.length) {
        throw new Error(`Question ${i + 1} needs answer options`);
      }
      if (!q.options.some((o) => o.isCorrect)) {
        throw new Error(`Question ${i + 1} needs at least one correct option`);
      }
    }
  }

  const [quiz] = await db
    .insert(quizzes)
    .values({
      assignmentId: data.assignmentId,
      timeLimitMinutes: data.timeLimitMinutes ?? null,
      allowRetakes: data.allowRetakes ?? false,
      maxAttempts: Math.max(1, data.maxAttempts ?? 1),
      passingScore: data.passingScore ?? null,
    })
    .returning();

  for (const [index, q] of data.questions.entries()) {
    const [question] = await db
      .insert(quizQuestions)
      .values({
        quizId: quiz.id,
        questionText: q.questionText.trim(),
        questionType: q.questionType,
        points: Number(q.points),
        orderIndex: index,
        correctText: q.correctText?.trim() || null,
        explanation: q.explanation?.trim() || null,
      })
      .returning();

    if (q.options?.length) {
      await db.insert(quizOptions).values(
        q.options.map((o, i) => ({
          questionId: question.id,
          optionText: o.optionText,
          isCorrect: o.isCorrect,
          orderIndex: i,
        }))
      );
    }
  }

  revalidatePath(`/groups/${group.id}`);
  return quiz;
}

export async function getQuizForAssignment(assignmentId: string) {
  const { user, isTutor, assignment } = await requireAssignmentAccess(assignmentId);

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.assignmentId, assignmentId)).limit(1);

  if (!quiz) {
    return null;
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.orderIndex));

  const options = questions.length
    ? await db
        .select()
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, questions.map((q) => q.id)))
        .orderBy(asc(quizOptions.orderIndex))
    : [];

  // Students never receive the answers.
  const shaped = questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    points: q.points,
    orderIndex: q.orderIndex,
    ...(isTutor
      ? { correctText: q.correctText, explanation: q.explanation }
      : {}),
    options: options
      .filter((o) => o.questionId === q.id)
      .map((o) => ({ id: o.id, optionText: o.optionText, ...(isTutor ? { isCorrect: o.isCorrect } : {}) })),
  }));

  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, quiz.id), eq(quizAttempts.studentId, user.id)))
    .orderBy(desc(quizAttempts.attemptNumber));

  return { quiz, questions: shaped, attempts, isTutor, assignment };
}

export async function submitQuizAttempt(data: {
  quizId: string;
  answers: { questionId: string; selectedOptionId?: string | null; textAnswer?: string | null }[];
}) {
  const user = await requireUser();

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, data.quizId)).limit(1);
  if (!quiz) {
    throw new Error("Quiz not found");
  }

  const { isTutor, assignment } = await requireAssignmentAccess(quiz.assignmentId);

  if (isTutor) {
    throw new Error("Tutors cannot take their own quiz");
  }

  if (assignment.status !== "published") {
    throw new Error("This quiz is not open");
  }

  const priorAttempts = await db
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.quizId, data.quizId), eq(quizAttempts.studentId, user.id)));

  if (priorAttempts.some((a) => a.completedAt)) {
    throw new Error("You already completed this attempt");
  }

  if (!quiz.allowRetakes && priorAttempts.length >= quiz.maxAttempts) {
    throw new Error("You have no attempts remaining");
  }

  if (priorAttempts.length >= quiz.maxAttempts) {
    throw new Error("You have no attempts remaining");
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, data.quizId));

  if (!questions.length) {
    throw new Error("This quiz has no questions");
  }

  const questionIds = new Set(questions.map((q) => q.id));
  const optionRows = await db
    .select()
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questions.map((q) => q.id)));

  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const option of optionRows) {
    const list = optionsByQuestion.get(option.questionId) ?? [];
    list.push(option);
    optionsByQuestion.set(option.questionId, list);
  }

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      quizId: data.quizId,
      studentId: user.id,
      attemptNumber: priorAttempts.length + 1,
    })
    .returning();

  let score = 0;
  let maxScore = 0;
  const answerRows: (typeof quizAnswers.$inferInsert)[] = [];

  for (const question of questions) {
    maxScore += question.points;

    const given = data.answers?.find((a) => a.questionId === question.id);
    const options = optionsByQuestion.get(question.id) ?? [];

    let isCorrect: boolean | null = null;
    let pointsEarned: number | null = null;

    // Objective types auto-grade; essays are left for the tutor.
    if (question.questionType === "multiple_choice" || question.questionType === "true_false") {
      if (given?.selectedOptionId) {
        const chosen = options.find((o) => o.id === given.selectedOptionId);
        // Reject options that belong to a different question.
        isCorrect = chosen ? chosen.isCorrect : false;
        pointsEarned = isCorrect ? question.points : 0;
        score += pointsEarned;
      } else {
        isCorrect = false;
        pointsEarned = 0;
      }
    }

    if (given) {
      answerRows.push({
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: given.selectedOptionId ?? null,
        textAnswer: given.textAnswer ?? null,
        isCorrect,
        pointsEarned,
        autoGraded: isCorrect !== null,
      });
    }
  }

  if (answerRows.length) {
    await db.insert(quizAnswers).values(answerRows);
  }

  const passed = quiz.passingScore != null ? score >= quiz.passingScore : null;

  await db
    .update(quizAttempts)
    .set({ completedAt: new Date(), score, maxScore, passed })
    .where(eq(quizAttempts.id, attempt.id));

  void questionIds;

  return { attemptId: attempt.id, score, maxScore, passed };
}

/** Resolves a quiz to its assignment and requires member-or-tutor access to that group. */
async function requireQuizAccess(quizId: string) {
  const [quiz] = await db
    .select({ id: quizzes.id, assignmentId: quizzes.assignmentId })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  return { quiz, ...(await requireAssignmentAccess(quiz.assignmentId)) };
}

export async function getAttemptDetail(attemptId: string) {
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.id, attemptId))
    .limit(1);

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  const { user, isTutor } = await requireQuizAccess(attempt.quizId);

  if (!isTutor && attempt.studentId !== user.id) {
    throw new Error("Not authorized to view this attempt");
  }

  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, attempt.quizId)).limit(1);

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, attempt.quizId))
    .orderBy(asc(quizQuestions.orderIndex));

  const options = questions.length
    ? await db.select().from(quizOptions).where(inArray(quizOptions.questionId, questions.map((q) => q.id)))
    : [];

  const answers = await db
    .select()
    .from(quizAnswers)
    .where(eq(quizAnswers.attemptId, attemptId));

  // Only the tutor sees model answers and correctness before grading.
  const reveal = isTutor || Boolean(quiz?.showResultsAfter);

  return {
    attempt,
    quiz,
    answers: answers.map((a) => ({
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      textAnswer: a.textAnswer,
      pointsEarned: reveal ? a.pointsEarned : null,
      isCorrect: reveal ? a.isCorrect : null,
      feedback: a.feedback,
    })),
    questions: questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points,
      ...(reveal ? { correctText: q.correctText, explanation: q.explanation } : {}),
      options: options
        .filter((o) => o.questionId === q.id)
        .map((o) => ({ id: o.id, optionText: o.optionText, ...(reveal ? { isCorrect: o.isCorrect } : {}) })),
    })),
  };
}

export async function getQuizAttemptsForTutor(quizId: string) {
  const [quiz] = await db
    .select({ assignmentId: quizzes.assignmentId })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);

  if (!quiz) {
    throw new Error("Quiz not found");
  }

  await requireAssignmentTutor(quiz.assignmentId);

  return db
    .select({
      id: quizAttempts.id,
      attemptNumber: quizAttempts.attemptNumber,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      passed: quizAttempts.passed,
      completedAt: quizAttempts.completedAt,
      studentId: profiles.id,
      studentName: profiles.displayName,
      studentAvatar: profiles.avatarUrl,
    })
    .from(quizAttempts)
    .leftJoin(profiles, eq(quizAttempts.studentId, profiles.id))
    .where(eq(quizAttempts.quizId, quizId))
    .orderBy(asc(quizAttempts.attemptNumber));
}
