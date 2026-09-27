import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requestSession } from "@/app/tutoring/actions";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tutorId, requestedSlots, message } = body;

    if (!tutorId || !requestedSlots || !Array.isArray(requestedSlots) || requestedSlots.length === 0) {
      return NextResponse.json({ error: "tutorId and requestedSlots are required" }, { status: 400 });
    }

    // Validate slots
    for (const slot of requestedSlots) {
      if (!slot.date || !slot.startTime || !slot.endTime) {
        return NextResponse.json({ error: "Each slot must have date, startTime, and endTime" }, { status: 400 });
      }
    }

    const result = await requestSession({
      tutorId,
      requestedSlots,
      message: message || "I would like to book a session",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Request session error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}