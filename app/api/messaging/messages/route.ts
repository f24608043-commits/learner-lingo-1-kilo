import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMessages } from "@/app/messaging/actions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { otherUserId, sessionId } = body;

    if (!otherUserId) {
      return NextResponse.json({ error: "otherUserId is required" }, { status: 400 });
    }

    // If sessionId is provided, get messages for that session's conversation
    // Otherwise, get or create a direct conversation between the two users
    let conversationId: string | null = null;

    if (sessionId) {
      // Get the conversation for this session
      const { db } = await import("@/db");
      const { tutorSessions, conversations, conversationMembers } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const [session] = await db
        .select()
        .from(tutorSessions)
        .where(eq(tutorSessions.id, sessionId))
        .limit(1);

      if (session && session.jitsiRoomId) {
        // Try to find conversation with this jitsi room id
        const [conv] = await db
          .select()
          .from(conversations)
          .where(eq(conversations.jitsiRoomId, session.jitsiRoomId))
          .limit(1);
        
        if (conv) {
          conversationId = conv.id;
        }
      }
    }

    // If no conversation found, get or create direct conversation
    if (!conversationId) {
      const { startDirectConversation } = await import("@/app/messaging/actions");
      const result = await startDirectConversation(otherUserId);
      conversationId = result.conversationId;
    }

    // Now get messages for this conversation
    const messages = await getMessages(conversationId!);

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}