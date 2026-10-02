import { createClient } from "@/utils/supabase/server";
import { getAnnouncements, getComments } from "@/app/groups/actions";
import { db } from "@/db";
import { groups, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import StreamClient from "./StreamClient";

export const dynamic = "force-dynamic";

export default async function GroupStreamPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const [group] = await db
    .select({ id: groups.id, tutorId: groups.tutorId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    notFound();
  }

  const [me] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  // The action re-checks membership, so an outsider gets an error rather than data.
  let announcements = [];
  let comments = [];
  try {
    announcements = await getAnnouncements(groupId);
    comments = await getComments({ groupId, targetType: "group" });
  } catch {
    redirect(`/groups?denied=${groupId}`);
  }

  return (
    <StreamClient
      groupId={groupId}
      announcements={announcements}
      comments={comments}
      isTutor={group.tutorId === user.id}
      currentUserId={user.id}
      currentUserName={me?.displayName ?? "Member"}
    />
  );
}