import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyGroups, getMyEnrollmentRequests } from "@/app/groups/actions";
import JoinGroupForm from "./JoinGroupForm";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  const [groups, myRequests] = await Promise.all([getMyGroups(), getMyEnrollmentRequests()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 flex flex-col gap-6" data-testid="groups-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-on-surface">Your groups</h1>
          <p className="text-on-surface/70 mt-1">
            Classes you run as a tutor and classes you are enrolled in.
          </p>
        </div>
        <span className="clay-card px-4 py-2 text-sm font-bold text-on-surface/70">
          {groups.length} group{groups.length === 1 ? "" : "s"}
        </span>
      </header>

      <JoinGroupForm />

      {myRequests.some((r) => r.status === "pending") && (
        <section className="clay-card p-5" data-testid="my-requests">
          <h2 className="font-display text-lg font-extrabold mb-3">Pending requests</h2>
          <ul className="flex flex-col gap-2">
            {myRequests
              .filter((r) => r.status === "pending")
              .map((r) => (
                <li key={r.id} className="rounded-2xl bg-background/60 px-4 py-3 text-sm font-semibold">
                  {r.groupName ?? "Unknown group"}
                  <span className="ml-2 text-on-surface/60">awaiting tutor approval</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      {groups.length === 0 ? (
        <section className="clay-card p-10 text-center" data-testid="groups-empty">
          <p className="font-display text-xl font-extrabold mb-1">No groups yet</p>
          <p className="text-on-surface/70">
            Create a group from the tutoring hub, or enter a group code above to join one.
          </p>
        </section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="groups-grid">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="clay-card block p-5 h-full flex flex-col gap-2"
                data-testid="group-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-extrabold leading-tight">{group.name}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                      group.role === "tutor"
                        ? "bg-primary/15 text-primary"
                        : "bg-tertiary/15 text-tertiary"
                    }`}
                  >
                    {group.role === "tutor" ? "Tutor" : "Student"}
                  </span>
                </div>

                {group.description && (
                  <p className="text-sm text-on-surface/70 line-clamp-2">{group.description}</p>
                )}

                <div className="mt-auto pt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-on-surface/60">
                  {group.subject && <span className="rounded-full bg-background/70 px-2.5 py-1">{group.subject}</span>}
                  {group.gradeLevel && (
                    <span className="rounded-full bg-background/70 px-2.5 py-1">{group.gradeLevel}</span>
                  )}
                  <span>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</span>
                </div>

                {group.role === "tutor" && group.groupCode && (
                  <p className="text-xs font-bold tracking-widest text-on-surface/50">
                    CODE {group.groupCode}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}