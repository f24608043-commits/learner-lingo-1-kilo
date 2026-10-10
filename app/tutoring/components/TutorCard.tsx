"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/LoadingButton";

interface TutorCardProps {
  tutor: any;
  enrollmentMap: Map<string, any>;
  onMessage: (otherUserId: string, otherUserName: string) => void;
  onEnroll: (tutorId: string) => void;
}

export function TutorCard({ tutor, enrollmentMap, onMessage, onEnroll }: TutorCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const enrollment = enrollmentMap.get(tutor.tutorId);

  return (
    <div key={tutor.id} data-testid="tutor-card" className="min-w-0 rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 hover:shadow-2xl hover:border-blue-200 transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-xl shadow-xl border-4 border-white/30">
          {tutor.displayName?.[0] || "?"}
        </div>
        <div className="min-w-0">
          <p className="font-label-md text-on-surface font-semibold truncate">
            {tutor.displayName || "Unknown"}
          </p>
          <div className="flex items-center gap-1 font-body-sm text-text-muted">
            <span className="material-symbols-outlined text-yellow-500 text-[16px]" style={{ fontVariationSettings: 'FILL 1' }}>star</span>
            <span className="font-bold text-yellow-600">{tutor.rating}/5</span>
            <span className="font-bold text-gray-500">({tutor.totalSessions} sessions)</span>
          </div>
        </div>
      </div>
      <p className="font-body-sm text-on-surface-variant mb-3 line-clamp-2">
        {tutor.bio || "No bio available"}
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {tutor.subjects?.map((subject: string, idx: number) => (
          <span key={idx} className="rounded-full bg-gradient-to-r from-teal-400 to-green-500 text-white px-2 py-1 font-label-sm font-semibold shadow-lg border-2 border-white/30">
            {subject}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-label-sm font-semibold text-on-surface">
          {tutor.hourlyRate ? "$" + tutor.hourlyRate + " per hour" : "Free"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onMessage(tutor.tutorId, tutor.displayName || "Tutor")}
            className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 px-3 py-2 font-label-sm font-bold shadow-lg hover:from-blue-100 hover:to-cyan-100 transition-all"
          >
            Message
          </button>
          {(() => {
            const enrollment = enrollmentMap.get(tutor.tutorId);
            if (enrollment) {
              switch (enrollment.status) {
                case "pending":
                  return (
                    <span className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 font-label-sm font-bold shadow-xl border-4 border-white/30">
                      Request Sent
                    </span>
                  );
                case "enrolled":
                  return (
                    <span className="rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 font-label-sm font-bold shadow-xl border-4 border-white/30">
                      Enrolled
                    </span>
                  );
                case "rejected":
                  return (
                    <button
                      onClick={() => onEnroll(tutor.tutorId)}
                      className="rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-600 px-3 py-2 font-label-sm font-bold shadow-lg hover:from-red-100 hover:to-rose-100 transition-all"
                    >
                      Request Again
                    </button>
                  );
                case "cancelled":
                  return (
                    <button
                      onClick={() => onEnroll(tutor.tutorId)}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      Enroll
                    </button>
                  );
                default:
                  return (
                    <button
                      onClick={() => onEnroll(tutor.tutorId)}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      Enroll
                    </button>
                  );
              }
            } else {
              return (
                <button
                  onClick={() => onEnroll(tutor.tutorId)}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                >
                  Enroll
                </button>
              );
            }
          })()}
          <a
            href={"/tutoring/book?tutorId=" + tutor.tutorId}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            Book Session
          </a>
        </div>
      </div>
    </div>
  );
}