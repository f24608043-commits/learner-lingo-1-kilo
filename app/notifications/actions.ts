"use server";

import { db } from "@/db";
import { notifications, profiles } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createNotification({
  userId,
  type,
  title,
  message,
  data,
}: {
  userId: string;
  type: "friend_request" | "friend_accepted" | "badge_earned" | "streak_milestone" | "lesson_completed" | "leaderboard_rank";
  title: string;
  message: string;
  data?: any;
}) {
  await db.insert(notifications).values({
    userId,
    type,
    title,
    message,
    data: data || null,
  });
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return [];
  }

  const userNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  return userNotifications;
}

export async function getUnreadCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return 0;
  }

  const [result] = await db
    .select({ count: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      )
    );

  return Number(result?.count || 0);
}

export async function markAsRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, user.id));

  revalidatePath("/notifications");
  return { success: true };
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  await db
    .delete(notifications)
    .where(eq(notifications.id, notificationId));

  revalidatePath("/notifications");
  return { success: true };
}

// Helper functions to create specific notification types
export async function notifyFriendRequest(requesterId: string, addresseeId: string) {
  const [requester] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, requesterId))
    .limit(1);

  await createNotification({
    userId: addresseeId,
    type: "friend_request",
    title: "New Friend Request",
    message: `${requester?.displayName || "Someone"} sent you a friend request`,
    data: { requesterId },
  });
}

export async function notifyFriendAccepted(requesterId: string, addresseeId: string) {
  const [addressee] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, addresseeId))
    .limit(1);

  await createNotification({
    userId: requesterId,
    type: "friend_accepted",
    title: "Friend Request Accepted",
    message: `${addressee?.displayName || "Someone"} accepted your friend request`,
    data: { addresseeId },
  });
}

export async function notifyBadgeEarned(userId: string, badgeName: string) {
  await createNotification({
    userId,
    type: "badge_earned",
    title: "New Badge Earned",
    message: `Congratulations! You earned the "${badgeName}" badge`,
    data: { badgeName },
  });
}

export async function notifyStreakMilestone(userId: string, streakDays: number) {
  await createNotification({
    userId,
    type: "streak_milestone",
    title: "Streak Milestone",
    message: `Amazing! You've maintained a ${streakDays}-day learning streak`,
    data: { streakDays },
  });
}
