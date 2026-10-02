import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { groups, groupMembers, enrollmentRequests, profiles } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import GroupTabs from "./GroupTabs";

export const dynamic = "force-dynamic";

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      subject: groups.subject,
      gradeLevel: groups.gradeLevel,
      tutorId: groups.tutorId,
      tutorName: profiles.displayName,
    })
    .from(groups)
    .leftJoin(profiles, eq(groups.tutorId, profiles.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group) {
    notFound();
  }

  const isTutor = group.tutorId === user.id;

  if (!isTutor) {
    const [membership] = await db
      .select({ id: groupMembers.id })
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.learnerId, user.id))
      )
      .limit(1);

    if (!membership) {
      redirect(`/groups?denied=${groupId}`);
    }
  }

  const pending = isTutor
    ? await db
        .select({ count: sql<number>`count(*)::int` })
        .from(enrollmentRequests)
        .where(
          and(
            eq(enrollmentRequests.groupId, groupId),
            eq(enrollmentRequests.status, "pending")
          )
        )
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 flex flex-col gap-5">
      <header className="clay-card p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold" data-testid="group-title">
            {group.name}
          </h1>
          <p className="text-sm text-on-surface/70 mt-1">
            {isTutor ? "You run this group" : `Tutor: ${group.tutorName ?? "Unknown"}`}
            {group.subject ? ` · ${group.subject}` : ""}
            {group.gradeLevel ? ` · ${group.gradeLevel}` : ""}
          </p>
          {group.description && (
            <p className="text-sm text-on-surface/70 mt-2 max-w-2xl">{group.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              isTutor ? "bg-primary/15 text-primary" : "bg-tertiary/15 text-tertiary"
            }`}
            data-testid="group-role-badge"
          >
            {isTutor ? "Tutor" : "Student"}
          </span>
          {isTutor && Number(pending[0]?.count ?? 0) > 0 && (
            <span
              className="rounded-full bg-secondary/20 text-secondary px-3 py-1 text-xs font-bold"
              data-testid="pending-requests-badge"
            >
              {Number(pending[0].count)} pending
            </span>
          )}
        </div>
      </header>

      <GroupTabs groupId={groupId} />

      <div data-testid="group-content">{children}</div>
    </div>
  );
}