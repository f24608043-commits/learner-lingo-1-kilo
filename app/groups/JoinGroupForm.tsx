"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { requestGroupEnrollment } from "@/app/groups/actions";

export default function JoinGroupForm() {
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      toast.error("Enter a group code");
      return;
    }

    startTransition(async () => {
      try {
        const result = await requestGroupEnrollment({ groupCode: trimmed });

        // Only a real request clears the field, so a rejected code stays put
        // and can be corrected instead of retyped.
        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        toast.success("Request sent to the tutor");
        setCode("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not send request");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="clay-card p-5 flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="group-code" className="block text-sm font-bold text-on-surface mb-1">
          Join with a group code
        </label>
        <input
          id="group-code"
          name="groupCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. A1B2C3"
          maxLength={10}
          autoComplete="off"
          className="w-full rounded-2xl border-2 border-black/5 bg-white px-4 py-3 font-bold uppercase tracking-widest focus:outline-none focus:border-primary/40"
          data-testid="group-code-input"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="clay-btn bg-primary text-white px-6 py-3 disabled:opacity-60"
        data-testid="join-group-submit"
      >
        {isPending ? "Sending" : "Request to join"}
      </button>
    </form>
  );
}