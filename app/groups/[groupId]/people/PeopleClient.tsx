"use client";

import { useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { respondToEnrollmentRequest } from "@/app/groups/actions";
import { formatDate, formatDateTime } from "@/utils/formatDate";

type Member = {
  id: string;
  learnerId: string;
  role: string;
  enrolledAt: Date;
  displayName: string | null;
  avatarUrl: string | null;
};

type PendingRequest = {
  id: string;
  studentId: string;
  status: string;
  requestedAt: Date;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function PeopleClient({
  groupId,
  members,
  pendingRequests,
  isTutor,
}: {
  groupId: string;
  members: Member[];
  pendingRequests: PendingRequest[];
  isTutor: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(requestId: string, response: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await respondToEnrollmentRequest(requestId, response);
        router.refresh();
        toast.success(response === "approved" ? "Learner enrolled" : "Request declined");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update request");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {isTutor && (
        <section className="clay-card p-5" data-testid="pending-requests-section">
          <h2 className="font-display text-lg font-extrabold mb-4">Enrollment requests</h2>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-on-surface/60" data-testid="no-pending-requests">
              No pending requests.
            </p>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="pending-request-list">
              {pendingRequests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl bg-background/60 p-4 flex flex-wrap items-center justify-between gap-3"
                  data-testid="pending-request-item"
                >
                  <div>
                    <p className="font-bold">{r.displayName ?? "Learner"}</p>
                    <p className="text-xs text-on-surface/50">
                      Requested {new Date(r.requestedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => respond(r.id, "approved")}
                      className="clay-btn bg-primary text-white px-4 py-2 text-xs disabled:opacity-60"
                      data-testid="approve-request"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => respond(r.id, "rejected")}
                      className="clay-btn bg-error text-white px-4 py-2 text-xs disabled:opacity-60"
                      data-testid="reject-request"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="clay-card p-5">
        <h2 className="font-display text-lg font-extrabold mb-4">
          Learners ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-sm text-on-surface/60" data-testid="no-members">
            No learners have joined yet.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="member-list">
            {members.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl bg-background/60 p-4 flex items-center gap-3"
                data-testid="member-item"
              >
                <div className="h-11 w-11 shrink-0 rounded-full bg-primary/20 grid place-items-center font-extrabold">
                  {(m.displayName ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate">{m.displayName ?? "Learner"}</p>
                  <p className="text-xs text-on-surface/50">
                    {m.role} · joined {new Date(m.enrolledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}