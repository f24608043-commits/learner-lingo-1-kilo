import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getGroupPeople } from "@/app/groups/actions";
import PeopleClient from "./PeopleClient";

export const dynamic = "force-dynamic";

export default async function PeoplePage({
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

  let people;
  try {
    people = await getGroupPeople(groupId);
  } catch {
    redirect(`/groups?denied=${groupId}`);
  }

  return (
    <PeopleClient
      groupId={groupId}
      members={people.members}
      pendingRequests={people.pendingRequests}
      isTutor={group.tutorId === user.id}
    />
  );
}