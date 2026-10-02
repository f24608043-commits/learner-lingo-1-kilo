import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const BUCKET = "classwork";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
  }

  let body: { groupId?: string; fileName?: string; fileType?: string; data?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { groupId, fileName, fileType, data } = body;

  if (!groupId || !fileName || !data) {
    return NextResponse.json({ error: "groupId, fileName and data are required" }, { status: 400 });
  }

  // The user must be the group tutor or an enrolled member.
  const [group] = await db
    .select({ id: groups.id, tutorId: groups.tutorId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.tutorId !== user.id) {
    const [membership] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }
  }

  // data is a base64 payload, optionally a data URL.
  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return NextResponse.json({ error: "Could not decode file" }, { status: 400 });
  }

  if (buffer.byteLength === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  // Folder name must equal the uploader's uid so the delete policy matches.
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: fileType || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    url: urlData.publicUrl,
    path,
    fileName: safeName,
    fileSize: buffer.byteLength,
    fileType: fileType ?? null,
  });
}