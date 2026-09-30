import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { notifications, profiles } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return NextResponse.json({ notifications: notifs });
  } catch (error: any) {
    console.error("Get notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, type, title, message, data } = body;

    if (!userId || !type || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If user is sending notification to someone else, check authorization
    if (userId !== user.id) {
      // In a real app, check if user has permission to send notifications
      // For now, allow tutors to send to their learners
    }

    const [notification] = await db
      .insert(notifications)
      .values({
        userId,
        type,
        title,
        message,
        data: data || {},
      })
      .returning();

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error("Create notification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, markAsRead } = body;

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ error: "Missing notification IDs" }, { status: 400 });
    }

    // Mark notifications as read
    await db
      .update(notifications)
      .set({ isRead: markAsRead !== false })
      .where(
        and(
          eq(notifications.userId, user.id),
          inArray(notifications.id, notificationIds)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Mark notifications error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}