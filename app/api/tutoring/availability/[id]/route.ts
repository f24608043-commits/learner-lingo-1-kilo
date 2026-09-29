import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { tutorAvailability } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const [slot] = await db
      .select()
      .from(tutorAvailability)
      .where(and(eq(tutorAvailability.id, id), eq(tutorAvailability.tutorId, user.id)))
      .limit(1);

    if (!slot) {
      return NextResponse.json({ error: "Slot not found or unauthorized" }, { status: 404 });
    }

    await db
      .delete(tutorAvailability)
      .where(and(eq(tutorAvailability.id, id), eq(tutorAvailability.tutorId, user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete availability:", error);
    return NextResponse.json({ error: "Failed to delete availability" }, { status: 500 });
  }
}