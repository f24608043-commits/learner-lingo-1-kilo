"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createAssignment, setAssignmentStatus, deleteAssignment } from "@/app/groups/actions";
import { formatDate, formatDateTime } from "@/utils/formatDate";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  points: number;
  status: string;
  submissionCount: number;
  myStatus: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-background/70 text-on-surface/60",
  published: "bg-primary/15 text-primary",
  archived: "bg-background/70 text-on-surface/40",
};

export default function ClassworkClient({
  groupId,
  assignments,
  isTutor,
}: {
  groupId: string;
  assignments: Assignment[];
  isTutor: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [points, setPoints] = useState("100");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Give the assignment a title");
      return;
    }

    startTransition(async () => {
      try {
        await createAssignment({
          groupId,
          title: trimmed,
          description: description || undefined,
          dueDate: dueDate || null,
          points: Number(points) || 100,
        });
        setTitle("");
        setDescription("");
        setDueDate("");
        setPoints("100");
        setShowForm(false);
        router.refresh();
        toast.success("Assignment created as a draft");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create assignment");
      }
    });
  }

  function handlePublish(id: string, status: string) {
    startTransition(async () => {
      try {
        await setAssignmentStatus(id, status === "published" ? "draft" : "published");
        router.refresh();
        toast.success(status === "published" ? "Moved back to draft" : "Published to learners");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update status");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAssignment(id);
        router.refresh();
        toast.success("Assignment deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete");
      }
    });
  }

  return (
    <section className="clay-card p-5" data-testid="classwork-page">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-extrabold">Classwork</h2>
        {isTutor && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="clay-btn bg-primary text-white px-4 py-2 text-xs"
            data-testid="toggle-assignment-form"
          >
            {showForm ? "Cancel" : "New assignment"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="grid gap-3 mb-5 sm:grid-cols-2" data-testid="assignment-form">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            aria-label="Assignment title"
            className="sm:col-span-2 rounded-2xl border-2 border-black/5 bg-white px-4 py-3 font-bold focus:outline-none focus:border-primary/40"
            data-testid="assignment-title-input"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            aria-label="Assignment description"
            rows={3}
            className="sm:col-span-2 rounded-2xl border-2 border-black/5 bg-white px-4 py-3 focus:outline-none focus:border-primary/40"
            data-testid="assignment-description-input"
          />
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
            Due date
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="assignment-due-input"
              className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold text-on-surface/70">
            Points
            <input
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              data-testid="assignment-points-input"
              className="rounded-2xl border-2 border-black/5 bg-white px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-primary/40"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="clay-btn bg-primary text-white px-5 py-2.5 disabled:opacity-60"
            data-testid="assignment-submit"
          >
            Create draft
          </button>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="text-sm text-on-surface/60" data-testid="classwork-empty">
          {isTutor ? "No classwork yet. Create your first assignment." : "No classwork published yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="assignment-list">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl bg-background/60 p-4 flex flex-wrap items-start justify-between gap-3"
              data-testid="assignment-item"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/groups/${groupId}/classwork/${a.id}`}
                    className="font-display font-extrabold hover:underline"
                    data-testid="assignment-link"
                  >
                    {a.title}
                  </Link>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${STATUS_STYLES[a.status] ?? ""}`}
                    data-testid="assignment-status"
                  >
                    {a.status}
                  </span>
                  {a.myStatus && (
                    <span className="rounded-full bg-tertiary/15 text-tertiary px-2.5 py-0.5 text-xs font-bold">
                      yours: {a.myStatus}
                    </span>
                  )}
                </div>
                {a.description && <p className="text-sm text-on-surface/70 mt-1">{a.description}</p>}
                <p className="text-xs font-semibold text-on-surface/50 mt-2">
                  {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}` : "No due date"} ·{" "}
                  {a.points} pts
                  {isTutor ? ` · ${a.submissionCount} submitted` : ""}
                </p>
              </div>

              {isTutor && (
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePublish(a.id, a.status)}
                    className="clay-btn bg-secondary text-white px-3 py-1.5 text-xs"
                    data-testid="toggle-assignment-status"
                  >
                    {a.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-xs font-bold text-error"
                    data-testid="delete-assignment"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}