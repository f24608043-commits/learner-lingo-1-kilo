import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { sendMessage } from "@/app/messaging/actions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { otherUserId, content, sessionId } = body;

    if (!otherUserId || !content) {
      return NextResponse.json({ error: "otherUserId and content are required" }, { status: 400 });
    }

    // Get or create conversation
    let conversationId: string | null = null;

    if (sessionId) {
      // Get conversation for this session
      const { db } = await import("@/db");
      const { tutorSessions, conversations } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");

      const [session] = await db
        .select()
        .from(tutorSessions)
        .where(eq(tutorSessions.id, sessionId))
        .limit(1);

      if (session && session.jitsiRoomId) {
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

    if (!conversationId) {
      const { startDirectConversation } = await import("@/app/messaging/actions");
      const result = await startDirectConversation(otherUserId);
      conversationId = result.conversationId;
    }

    // Send the message
    const result = await sendMessage(conversationId!, content);

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}