import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { mascotChat, MascotChatParams } from "@/lib/ai/mascotChat";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, context, simulateOpenAiFailure, simulateOpenRouterFailure } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const params: MascotChatParams = {
      userId: user.id,
      message,
      context: context || {},
      simulateOpenAiFailure: simulateOpenAiFailure || false,
      simulateOpenRouterFailure: simulateOpenRouterFailure || false,
    };

    const result = await mascotChat(params);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Mascot chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
