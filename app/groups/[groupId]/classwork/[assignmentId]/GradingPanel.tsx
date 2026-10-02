"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { gradeSubmission } from "@/app/groups/actions";

type Row = {
  id: string;
  studentId: string;
  displayName: string | null;
  textAnswer: string | null;
  status: string;
  pointsEarned: number | null;
};

export default function GradingPanel({
  groupId,
  rows,
  maxPoints,
}: {
  groupId: string;
  rows: Row[];
  maxPoints: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.pointsEarned != null ? String(r.pointsEarned) : ""]))
  );
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  function grade(id: string) {
    const raw = scores[id];
    if (raw === "" || raw === undefined) {
      toast.error("Enter a score first");
      return;
    }

    startTransition(async () => {
      try {
        await gradeSubmission(id, {
          pointsEarned: Number(raw),
          feedback: feedback[id] || undefined,
        });
        router.refresh();
        toast.success("Graded");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not grade");
      }
    });
  }

  const needsGrading = rows.filter((r) => r.status !== "graded" && r.status !== "draft");

  return (
    <section className="clay-card p-5" data-testid="grading-panel">
      <h3 className="font-display font-extrabold mb-1">Submissions to grade</h3>
      <p className="text-sm text-on-surface/70 mb-4">
        {needsGrading.length} awaiting a score · out of {maxPoints} points
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-on-surface/60" data-testid="no-submissions">
          No submissions yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="grading-list">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl bg-background/60 p-4" data-testid="grading-item">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{r.displayName ?? "Learner"}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                    r.status === "graded"
                      ? "bg-primary/15 text-primary"
                      : "bg-secondary/20 text-secondary"
                  }`}
                >
                  {r.status}
                </span>
              </div>

              {r.textAnswer && (
                <p className="text-sm mt-2 whitespace-pre-wrap bg-white/60 rounded-xl p-3">{r.textAnswer}</p>
              )}

              <div className="mt-3 grid gap-2 sm:grid-cols-[6rem_1fr_auto] items-end">
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
                  Score / {maxPoints}
                  <input
                    type="number"
                    min={0}
                    max={maxPoints}
                    value={scores[r.id] ?? ""}
                    onChange={(e) => setScores((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    data-testid={`grade-score-${r.id}`}
                    className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
                  Feedback
                  <input
                    value={feedback[r.id] ?? ""}
                    onChange={(e) => setFeedback((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="Optional note"
                    aria-label={`Feedback for ${r.displayName ?? "learner"}`}
                    className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40"
                    data-testid={`grade-feedback-${r.id}`}
                  />
                </label>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => grade(r.id)}
                  className="clay-btn bg-primary text-white px-5 py-2.5 disabled:opacity-60"
                  data-testid={`grade-submit-${r.id}`}
                >
                  Save grade
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}