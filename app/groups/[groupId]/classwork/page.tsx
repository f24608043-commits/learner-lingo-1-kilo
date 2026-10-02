import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGroupAssignments } from "@/app/groups/actions";
import ClassworkClient from "./ClassworkClient";

export const dynamic = "force-dynamic";

export default async function ClassworkPage({
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

  let assignments = [];
  try {
    assignments = await getGroupAssignments(groupId);
  } catch {
    redirect(`/groups?denied=${groupId}`);
  }

  return (
    <ClassworkClient
      groupId={groupId}
      assignments={assignments}
      isTutor={group.tutorId === user.id}
    />
  );
}