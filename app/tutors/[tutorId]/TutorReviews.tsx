"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { deleteTutorReview, upsertTutorReview } from "@/app/groups/actions";
import { formatDate, formatDateTime } from "@/utils/formatDate";

export type TutorReview = {
  id: string;
  rating: number;
  reviewText: string | null;
  createdAt: Date;
  studentId: string;
  studentName: string | null;
};

export default function TutorReviews({
  tutorId,
  reviews,
  average,
  total,
  canReview,
  currentUserId,
}: {
  tutorId: string;
  reviews: TutorReview[];
  average: number;
  total: number;
  canReview: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const mine = reviews.find((r) => r.studentId === currentUserId);
  const [rating, setRating] = useState(mine?.rating ?? 5);
  const [text, setText] = useState(mine?.reviewText ?? "");
  const [hovered, setHovered] = useState(0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await upsertTutorReview({ tutorId, rating, reviewText: text });
        router.refresh();
        toast.success(mine ? "Review updated" : "Review submitted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save review");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      try {
        await deleteTutorReview(tutorId);
        setText("");
        setRating(5);
        router.refresh();
        toast.success("Review removed");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove review");
      }
    });
  }

  return (
    <section className="clay-card p-5 mt-5" data-testid="tutor-reviews">
      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-lg font-extrabold">Reviews</h2>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-extrabold" data-testid="review-average">
            {total ? average.toFixed(1) : "—"}
          </span>
          <span className="text-xs font-semibold text-on-surface/60">
            {total} review{total === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      {total > 0 && (
        <div className="flex items-center gap-1 mb-4" data-testid="review-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              aria-hidden
              className={star <= Math.round(average) ? "text-secondary" : "text-on-surface/25"}
            >
              ★
            </span>
          ))}
        </div>
      )}

      {canReview && (
        <form onSubmit={submit} className="rounded-2xl bg-background/60 p-4 mb-5" data-testid="review-form">
          <p className="text-sm font-bold mb-2">
            {mine ? "Update your review" : "Leave a review"}
          </p>

          <div className="flex items-center gap-1 mb-3" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
                data-testid={`review-star-${star}`}
                className={`text-3xl leading-none transition ${
                  star <= (hovered || rating) ? "text-secondary" : "text-on-surface/25"
                }`}
              >
                ★
              </button>
            ))}
            <span className="ml-2 text-sm font-bold" data-testid="review-rating-value">
              {rating}/5
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="How was your experience?"
            aria-label="Review text"
            rows={3}
            className="w-full rounded-2xl border-2 border-black/5 bg-white px-4 py-3 text-sm focus:outline-none focus:border-primary/40"
            data-testid="review-text-input"
          />

          <div className="mt-3 flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="clay-btn bg-primary text-white px-5 py-2.5 disabled:opacity-60"
              data-testid="review-submit"
            >
              {mine ? "Update review" : "Post review"}
            </button>
            {mine && (
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="clay-btn bg-white text-on-surface px-4 py-2.5 text-xs disabled:opacity-60"
                data-testid="review-delete"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-on-surface/60" data-testid="reviews-empty">
          No reviews yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="review-list">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-2xl bg-background/60 p-4" data-testid="review-item">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-extrabold">{r.studentName ?? "Learner"}</p>
                <span className="text-sm font-bold text-secondary" data-testid="review-item-rating">
                  {"★".repeat(r.rating)}
                </span>
              </div>
              {r.reviewText && <p className="text-sm mt-2">{r.reviewText}</p>}
              <p className="text-xs text-on-surface/50 mt-1">
                {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}