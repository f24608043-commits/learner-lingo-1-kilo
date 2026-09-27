"use server";

import { db } from "@/db";
import { 
  conversations, 
  conversationMembers, 
  messages, 
  profiles, 
  friendships, 
  sessionRequests,
  tutorProfiles,
  blocks,
  messageReports
} from "@/db/schema";
import { eq, and, or, desc, asc, sql, lt, isNull } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

// Helper: Get current user with role verification
async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user?.id) {
    throw new Error("You must be logged in");
  }

  const [profile] = await db
    .select({ id: profiles.id, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) {
    throw new Error("User profile not found");
  }

  return { ...user, role: profile.role };
}

// Helper: Check if two users are accepted friends
async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  const [friendship] = await db
    .select()
    .from(friendships)
    .where(
      and(
        or(
          and(eq(friendships.requesterId, userId1), eq(friendships.addresseeId, userId2)),
          and(eq(friendships.requesterId, userId2), eq(friendships.addresseeId, userId1))
        ),
        eq(friendships.status, "accepted")
      )
    )
    .limit(1);

  return !!friendship;
}

// Helper: Check if session request exists between tutor and learner
async function hasSessionRequest(tutorId: string, learnerId: string): Promise<boolean> {
  const [request] = await db
    .select()
    .from(sessionRequests)
    .where(
      and(
        eq(sessionRequests.tutorId, tutorId),
        eq(sessionRequests.learnerId, learnerId)
      )
    )
    .limit(1);

  return !!request;
}

// Helper: Check if user is tutor
async function isTutor(userId: string): Promise<boolean> {
  const [tutorProfile] = await db
    .select()
    .from(tutorProfiles)
    .where(eq(tutorProfiles.tutorId, userId))
    .limit(1);

  return !!tutorProfile;
}

// Helper: Check if user is blocked
async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const [block] = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerId, blockerId),
        eq(blocks.blockedId, blockedId)
      )
    )
    .limit(1);

  return !!block;
}

// Start a direct conversation with rules enforcement
export async function startDirectConversation(otherUserId: string) {
  const user = await getCurrentUser();
  
  if (user.id === otherUserId) {
    throw new Error("Cannot start conversation with yourself");
  }

  // Check if blocked
  if (await isBlocked(otherUserId, user.id) || await isBlocked(user.id, otherUserId)) {
    throw new Error("Cannot start conversation: user is blocked");
  }

  // Get other user's role
  const [otherProfile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, otherUserId))
    .limit(1);

  if (!otherProfile) {
    throw new Error("User not found");
  }

  const userIsTutor = await isTutor(user.id);
  const otherIsTutor = await isTutor(otherUserId);

  // Enforce rules
  if (!userIsTutor && !otherIsTutor) {
   // Learner-learner: only if accepted friends
    if (!(await areFriends(user.id, otherUserId))) {
      throw new Error("You can only message learners who are your friends");
    }
  } else if (userIsTutor && !otherIsTutor) {
    // Tutor-learner: only if session request exists
    if (!(await hasSessionRequest(user.id, otherUserId))) {
      throw new Error("You can only message learners who have requested a session");
    }
  } else if (!userIsTutor && otherIsTutor) {
    // Learner-tutor: allowed (learner messaging tutor)
  }
  // Tutor-tutor: allowed

  // Generate direct_key for pair
  const ids = [user.id, otherUserId].sort();
  const directKey = `${ids[0]}-${ids[1]}`;

  // Check if conversation already exists via direct_key
  const [existing] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.directKey, directKey))
    .limit(1);

  if (existing) {
    return { success: true, conversationId: existing.id };
  }

  // Create new conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      type: "direct",
      createdBy: user.id,
      directKey,
    })
    .returning();

  // Add both participants
  await db.insert(conversationMembers).values([
    { conversationId: conversation.id, userId: user.id, role: "member" },
    { conversationId: conversation.id, userId: otherUserId, role: "member" },
  ]);

  revalidatePath("/messages");
  return { success: true, conversationId: conversation.id };
}

// Create a group conversation (tutor only, max 30 members)
export async function createGroup(title: string, memberIds: string[]) {
  const user = await getCurrentUser();
  
  if (user.role !== "tutor" && user.role !== "admin") {
    throw new Error("Only tutors can create group conversations");
  }

  if (!title || title.trim().length === 0) {
    throw new Error("Group title is required");
  }

  if (memberIds.length > 30) {
    throw new Error("Maximum 30 members allowed in a group");
  }

  // Add creator to members
  const allMemberIds = [...new Set([user.id, ...memberIds])];

  // Create conversation
  const [newConversation] = await db
    .insert(conversations)
    .values({
      type: "group",
      title,
      createdBy: user.id,
    })
    .returning();

  // Update with Jitsi room ID
  const [conversation] = await db
    .update(conversations)
    .set({ jitsiRoomId: `lego-class-${newConversation.id}-${randomUUID().slice(0, 8)}` })
    .where(eq(conversations.id, newConversation.id))
    .returning();

  // Add members (creator as admin)
  await db.insert(conversationMembers).values(
    allMemberIds.map((userId, idx) => ({
      conversationId: conversation.id,
      userId,
      role: userId === user.id ? "admin" : "member",
    }))
  );

  revalidatePath("/messages");
  return { success: true, conversationId: conversation.id };
}

// Add member to group (admin only)
export async function addMember(conversationId: string, userId: string) {
  const user = await getCurrentUser();
  
  // Check if user is admin of this conversation
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id),
        eq(conversationMembers.role, "admin")
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("Only group admins can add members");
  }

  // Check if conversation is a group
  const [conversation] = await db
    .select({ type: conversations.type })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conversation || conversation.type !== "group") {
    throw new Error("Can only add members to group conversations");
  }

  // Check if user is already a member
  const [existingMember] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (existingMember) {
    throw new Error("User is already a member");
  }

  // Check total member count
  const [memberCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationMembers)
    .where(eq(conversationMembers.conversationId, conversationId));

  if (memberCount.count >= 30) {
    throw new Error("Maximum 30 members allowed in a group");
  }

  // Add member
  await db.insert(conversationMembers).values({
    conversationId,
    userId,
    role: "member",
  });

  revalidatePath("/messages");
  return { success: true };
}

// Remove member from group (admin only)
export async function removeMember(conversationId: string, userId: string) {
  const user = await getCurrentUser();
  
  // Check if user is admin of this conversation
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id),
        eq(conversationMembers.role, "admin")
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("Only group admins can remove members");
  }

  // Cannot remove the last admin
  const [adminCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.role, "admin")
      )
    );

  const [targetMember] = await db
    .select({ role: conversationMembers.role })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    )
    .limit(1);

  if (targetMember?.role === "admin" && adminCount.count <= 1) {
    throw new Error("Cannot remove the last admin from a group");
  }

  // Remove member
  await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, userId)
      )
    );

  revalidatePath("/messages");
  return { success: true };
}

// Leave a conversation
export async function leaveGroup(conversationId: string) {
  const user = await getCurrentUser();
  
  // Check if user is a member
  const [membership] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!membership) {
    throw new Error("You are not a member of this conversation");
  }

  // Cannot leave if last admin of a group
  const [conversation] = await db
    .select({ type: conversations.type })
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (conversation?.type === "group" && membership.role === "admin") {
    const [adminCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.role, "admin")
        )
      );

    if (adminCount.count <= 1) {
      throw new Error("Cannot leave as the last admin. Promote another member first.");
    }
  }

  // Remove user from conversation
  await db
    .delete(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id)
      )
    );

  revalidatePath("/messages");
  return { success: true };
}

// Send a message
export async function sendMessage(conversationId: string, body: string) {
  const user = await getCurrentUser();
  
  if (!body || body.trim().length === 0) {
    throw new Error("Message cannot be empty");
  }

  if (body.length > 2000) {
    throw new Error("Message too long (max 2000 characters)");
  }

  // Check if user is a member (server-side validation)
  const [member] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!member) {
    throw new Error("You are not a member of this conversation");
  }

  // Check if blocked by any member
  const [blocked] = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerId, user.id),
        sql`${blocks.blockedId} IN (SELECT user_id FROM conversation_participants WHERE conversation_id = ${conversationId})`
      )
    )
    .limit(1);

  if (blocked) {
    throw new Error("You are blocked from this conversation");
  }

  // Insert message (rate limit enforced by DB trigger)
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: user.id,
      body: body.trim(),
    })
    .returning();

  revalidatePath("/messages");
  return { success: true, message };
}

// Get messages for a conversation with pagination
export async function getMessages(conversationId: string, cursor?: string, limit = 30) {
  const user = await getCurrentUser();
  
  // Check if user is a member
  const [member] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!member) {
    throw new Error("You are not a member of this conversation");
  }

  // Build query with cursor
  const whereConditions = [eq(messages.conversationId, conversationId)];
  
  if (cursor) {
    whereConditions.push(lt(messages.createdAt, new Date(cursor)));
  }

  const conversationMessages = await db
    .select({
      message: messages,
      sender: {
        id: profiles.id,
        displayName: profiles.displayName,
        avatarUrl: profiles.avatarUrl,
      },
    })
    .from(messages)
    .innerJoin(profiles, eq(messages.senderId, profiles.id))
    .where(and(...whereConditions))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return conversationMessages.reverse(); // Return in chronological order
}

// Mark messages as read
export async function markRead(conversationId: string) {
  const user = await getCurrentUser();
  
  await db
    .update(conversationMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        eq(conversationMembers.userId, user.id)
      )
    );

  return { success: true };
}

// Get unread count for all conversations
export async function getUnreadCount() {
  const user = await getCurrentUser();
  
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(conversationMembers)
    .innerJoin(messages, eq(messages.conversationId, conversationMembers.conversationId))
    .where(
      and(
        eq(conversationMembers.userId, user.id),
        or(
          isNull(conversationMembers.lastReadAt),
          lt(conversationMembers.lastReadAt, messages.createdAt)
        ),
        sql`${messages.senderId} != ${user.id}`
      )
    );

  return result?.count || 0;
}

// Block a user
export async function blockUser(blockedId: string) {
  const user = await getCurrentUser();
  
  if (user.id === blockedId) {
    throw new Error("Cannot block yourself");
  }

  // Check if already blocked
  const [existing] = await db
    .select()
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerId, user.id),
        eq(blocks.blockedId, blockedId)
      )
    )
    .limit(1);

  if (existing) {
    throw new Error("User is already blocked");
  }

  await db.insert(blocks).values({
    blockerId: user.id,
    blockedId,
  });

  revalidatePath("/messages");
  return { success: true };
}

// Unblock a user
export async function unblockUser(blockedId: string) {
  const user = await getCurrentUser();
  
  await db
    .delete(blocks)
    .where(
      and(
        eq(blocks.blockerId, user.id),
        eq(blocks.blockedId, blockedId)
      )
    );

  revalidatePath("/messages");
  return { success: true };
}

// Report a message
export async function reportMessage(messageId: string, reason: string) {
  const user = await getCurrentUser();
  
  if (!reason || reason.trim().length === 0) {
    throw new Error("Reason is required");
  }

  // Check if message exists
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message) {
    throw new Error("Message not found");
  }

  // Check if user is a member of the conversation
  const [member] = await db
    .select()
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, message.conversationId),
        eq(conversationMembers.userId, user.id)
      )
    )
    .limit(1);

  if (!member) {
    throw new Error("You can only report messages in conversations you are a member of");
  }

  await db.insert(messageReports).values({
    messageId,
    reporterId: user.id,
    reason: reason.trim(),
  });

  return { success: true };
}

// Get conversations list for current user
export async function getConversations(limit = 50) {
  const user = await getCurrentUser();
  
  const userConversations = await db
    .select({
      conversation: conversations,
      lastMessage: messages,
      lastReadAt: conversationMembers.lastReadAt,
    })
    .from(conversationMembers)
    .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
    .leftJoin(messages, eq(messages.id, sql`(
      SELECT id FROM messages
      WHERE conversation_id = conversations.id
      ORDER BY created_at DESC
      LIMIT 1
    )`))
    .where(eq(conversationMembers.userId, user.id))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);

  // Calculate unread count for each conversation
  const conversationsWithUnread = await Promise.all(
    userConversations.map(async (item) => {
      const whereConditions = [
        eq(messages.conversationId, item.conversation.id),
        sql`${messages.senderId} != ${user.id}`,
      ];

      if (item.lastReadAt === null) {
        // All messages are unread
      } else {
        whereConditions.push(sql`${messages.createdAt} > ${item.lastReadAt}`);
      }

      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(and(...whereConditions));

      return {
        ...item,
        unreadCount: unreadResult?.count || 0,
      };
    })
  );

  return conversationsWithUnread;
}
