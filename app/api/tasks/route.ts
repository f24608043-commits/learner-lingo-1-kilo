import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tasks, tutorEnrollments, profiles, groupMembers, groups } from "@/db/schema";
import { eq, and, or, desc, inArray, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get("targetType");
    const targetId = searchParams.get("targetId");
    const status = searchParams.get("status");

    const conditions: SQL[] = [];

    // Filter by tutor or learner
    if (searchParams.get("asTutor") === "true") {
      conditions.push(eq(tasks.tutorId, user.id));
    } else {
      // Get tasks assigned to this learner directly or via classroom
      const memberships = await db
        .select({ groupId: groupMembers.groupId })
        .from(groupMembers)
        .where(eq(groupMembers.learnerId, user.id));

      const groupIds = memberships.map(m => m.groupId);

      const direct = and(eq(tasks.targetType, "learner"), eq(tasks.targetId, user.id));

      if (groupIds.length > 0) {
        conditions.push(
          or(
            direct,
            and(eq(tasks.targetType, "classroom"), inArray(tasks.targetId, groupIds))
          ) as SQL
        );
      } else if (direct) {
        conditions.push(direct);
      }
    }

    // Filter by status if provided
    if (status) {
      conditions.push(eq(tasks.status, status as "assigned" | "submitted" | "graded" | "overdue" | "cancelled"));
    }

    const userTasks = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json(userTasks);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
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
    const { targetType, targetId, title, description, dueDate, attachments } = body;

    if (!targetType || !targetId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate target type
    if (!["learner", "classroom"].includes(targetType)) {
      return NextResponse.json({ error: "Invalid target type" }, { status: 400 });
    }

    // Validate tutor can assign to this target
    if (targetType === "learner") {
      // Check if tutor has an enrolled learner
      const [enrollment] = await db
        .select()
        .from(tutorEnrollments)
        .where(
          and(
            eq(tutorEnrollments.tutorId, user.id),
            eq(tutorEnrollments.learnerId, targetId),
            eq(tutorEnrollments.status, "enrolled")
          )
        )
        .limit(1);

      if (!enrollment) {
        return NextResponse.json({ error: "Learner not enrolled with you" }, { status: 403 });
      }
    } else if (targetType === "classroom") {
      // Check if tutor owns the classroom
      const [group] = await db
        .select()
        .from(groups)
        .where(and(eq(groups.id, targetId), eq(groups.tutorId, user.id)))
        .limit(1);

      if (!group) {
        return NextResponse.json({ error: "Classroom not found or unauthorized" }, { status: 403 });
      }
    }

    // Create task(s)
    let tasksToCreate = [];

    if (targetType === "classroom") {
      // Create individual tasks for each member
      const members = await db
        .select({ learnerId: groupMembers.learnerId })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, targetId));

      tasksToCreate = members.map(m => ({
        tutorId: user.id,
        targetType: "learner",
        targetId: m.learnerId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "assigned" as const,
        attachments,
      }));
    } else {
      tasksToCreate = [{
        tutorId: user.id,
        targetType,
        targetId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "assigned" as const,
        attachments,
      }];
    }

    const createdTasks = await db
      .insert(tasks)
      .values(tasksToCreate)
      .returning();

    // Notify learners
    for (const task of createdTasks) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: task.targetId,
          type: "task_assigned",
          title: "New Task Assigned",
          message: `You have a new task: ${task.title}`,
          data: { taskId: task.id, tutorId: user.id },
        }),
      });
    }

    return NextResponse.json(createdTasks, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}