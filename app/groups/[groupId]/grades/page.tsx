import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { groups, profiles, groupMembers } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getGradebook } from "@/app/groups/actions";

export const dynamic = "force-dynamic";

export default async function GradesPage({
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

  let gradebook;
  try {
    gradebook = await getGradebook(groupId);
  } catch {
    redirect(`/groups?denied=${groupId}`);
  }

  const names = await db
    .select({ id: profiles.id, displayName: profiles.displayName })
    .from(groupMembers)
    .innerJoin(profiles, eq(groupMembers.learnerId, profiles.id))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(profiles.displayName));

  const nameById = new Map(names.map((n) => [n.id, n.displayName ?? "Learner"]));

  return (
    <section className="clay-card p-5" data-testid="grades-page">
      <header className="mb-4">
        <h2 className="font-display text-lg font-extrabold">Grades</h2>
        <p className="text-sm text-on-surface/70">
          {gradebook.totals.assignments} published assignment(s) · {gradebook.totals.students} learner(s)
        </p>
      </header>

      {gradebook.assignments.length === 0 ? (
        <p className="text-sm text-on-surface/60" data-testid="grades-empty">
          Publish an assignment to start tracking grades.
        </p>
      ) : (
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[40rem] border-collapse text-sm" data-testid="gradebook-table">
            <thead>
              <tr className="text-left">
                <th scope="col" className="py-3 pr-4 font-extrabold">Learner</th>
                {gradebook.assignments.map((a) => (
                  <th key={a.id} scope="col" className="py-3 px-3 font-extrabold text-center">
                    <span className="block">{a.title}</span>
                    <span className="text-xs font-semibold text-on-surface/50">{a.points} pts</span>
                  </th>
                ))}
                <th scope="col" className="py-3 pl-3 font-extrabold text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {gradebook.rows.map((row) => (
                <tr key={row.studentId} className="border-t border-black/5" data-testid="gradebook-row">
                  <th scope="row" className="py-3 pr-4 text-left font-bold">
                    {nameById.get(row.studentId) ?? row.studentId.slice(0, 8)}
                  </th>
                  {row.perAssignment.map((cell) => (
                    <td key={cell.assignmentId} className="py-3 px-3 text-center">
                      {cell.pointsEarned != null ? (
                        <span
                          className="inline-block min-w-12 rounded-full bg-primary/15 px-2.5 py-1 font-bold text-primary"
                          data-testid="grade-cell"
                        >
                          {cell.pointsEarned}
                        </span>
                      ) : (
                        <span
                          className="inline-block min-w-12 rounded-full bg-background/70 px-2.5 py-1 font-semibold text-on-surface/50"
                          data-testid="grade-cell-missing"
                        >
                          {cell.status === "submitted"
                            ? "ungraded"
                            : cell.status === "draft"
                              ? "draft"
                              : "—"}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="py-3 pl-3 text-right font-extrabold" data-testid="grade-total">
                    {row.earned}/{row.possible}
                    <span className="ml-2 text-xs text-on-surface/50">{row.percent}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}