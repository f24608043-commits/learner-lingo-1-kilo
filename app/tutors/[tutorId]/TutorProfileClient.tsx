"use client";

import { useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { startDirectConversation } from "@/app/messaging/actions";
import { requestEnrollmentAction } from "@/app/tutoring/actions";
import TutorReviews from "./TutorReviews";

interface TutorProfileClientProps {
  profile: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  tutorProfile: {
    id: string;
    tutorId: string;
    bio: string | null;
    subjects: string[] | null;
    hourlyRate: number | null;
    timezone: string | null;
    rating: number | null;
    totalSessions: number | null;
  };
  enrollmentStats: {
    total: number;
    enrolled: number;
    pending: number;
  };
  ratingStats: {
    avgRating: number | null;
    totalRatings: number;
  };
  availability: {
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
  }[];
  awardedBadges: {
    badge: {
      id: string;
      name: string;
      iconUrl: string | null;
      category: string;
    };
    count: number;
  }[];
  rank: {
    level: number;
    points: number;
    metrics: any;
  } | null;
  reviews: {
    id: string;
    rating: number;
    reviewText: string | null;
    createdAt: Date;
    studentId: string;
    studentName: string | null;
  }[];
  reviewAverage: number;
  reviewTotal: number;
  canReview: boolean;
  currentUserId: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TutorProfileClient({
  profile,
  tutorProfile,
  enrollmentStats,
  ratingStats,
  availability,
  awardedBadges,
  rank,
  reviews,
  reviewAverage,
  reviewTotal,
  canReview,
  currentUserId,
}: TutorProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"about" | "schedule" | "reviews" | "badges">("about");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState("");

  const handleEnroll = async () => {
    if (!tutorProfile?.tutorId) return;
    setIsEnrolling(true);
    setEnrollMessage("");
    try {
      const formData = new FormData();
      formData.append("tutorId", tutorProfile.tutorId);
      formData.append("message", `Enrollment request from ${profile.displayName}`);
      await requestEnrollmentAction(formData);
      setEnrollMessage("Enrollment request sent!");
    } catch (error) {
      setEnrollMessage(error instanceof Error ? error.message : "Failed to send enrollment request");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleMessage = async () => {
    if (!tutorProfile?.tutorId) return;
    try {
      const result = await startDirectConversation(tutorProfile.tutorId);
      if (result?.conversationId) {
        window.location.href = `/messages/${result.conversationId}`;
      } else {
        window.location.href = `/messages`;
      }
    } catch (error) {
      alert("Failed to start conversation");
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDayName = (day: number) => DAYS[day];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 md:w-28 md:h-28">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-3xl md:text-4xl border-4 border-white/30 shadow-xl">
                {profile.displayName?.[0] || "?"}
              </div>
              {rank && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white flex items-center justify-center text-sm font-bold shadow-lg border-4 border-white">
                  Lv.{rank.level}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold">{profile.displayName}</h1>
              <p className="font-body-md text-text-muted mt-1">{tutorProfile.subjects?.join(", ") || "General Tutor"}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <span className="flex items-center gap-1 font-body-sm text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  {tutorProfile.timezone || "UTC"}
                </span>
                <span className="flex items-center gap-1 font-body-sm text-text-muted">
                  <span className="material-symbols-outlined text-[18px]">attach_money</span>
                  {tutorProfile.hourlyRate ? `$${tutorProfile.hourlyRate}/hr` : "Free"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleMessage}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined mr-2">chat</span>
              Message
            </button>
            <button
              type="button"
              onClick={handleEnroll}
              disabled={isEnrolling}
              className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 px-6 py-3 font-label-md font-bold shadow-lg hover:from-blue-100 hover:to-cyan-100 transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined mr-2">person_add</span>
              {isEnrolling ? "Sending…" : "Enroll"}
            </button>
            <Link
              href={`/tutoring/book?tutorId=${profile.id}`}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">event</span>
              Book Session
            </Link>
          </div>
          {enrollMessage && (
            <p className="mt-2 font-body-sm text-text-muted">{enrollMessage}</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 text-center border border-blue-100">
            <p className="font-headline-lg text-blue-600 font-extrabold">{enrollmentStats.enrolled}</p>
            <p className="font-body-sm text-text-muted">Active Learners</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-50 p-4 text-center border border-yellow-100">
            <p className="font-headline-lg text-yellow-600 font-extrabold">{enrollmentStats.pending}</p>
            <p className="font-body-sm text-text-muted">Pending</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 p-4 text-center border border-purple-100">
            <p className="font-headline-lg text-purple-600 font-extrabold">{ratingStats.totalRatings}</p>
            <p className="font-body-sm text-text-muted">Reviews</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-4 text-center border border-green-100">
            <p className="font-headline-lg text-green-600 font-extrabold">{ratingStats.avgRating ? ratingStats.avgRating.toFixed(1) : "–"}</p>
            <p className="font-body-sm text-text-muted">Avg Rating</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
          <div className="flex border-b border-surface-border">
            {[
              { id: "about", label: "About", icon: "person" },
              { id: "schedule", label: "Schedule", icon: "schedule" },
              { id: "reviews", label: "Reviews", icon: "star" },
              { id: "badges", label: "Badges", icon: "emoji_events" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-md font-semibold transition-all relative ${
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-text-muted hover:text-text-primary hover:bg-gray-50"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-headline-sm text-text-primary font-bold mb-3">About</h3>
                  <p className="font-body-md text-text-muted leading-relaxed">
                    {tutorProfile.bio || "No bio available."}
                  </p>
                </div>
                <div>
                  <h3 className="font-headline-sm text-text-primary font-bold mb-3">Subjects</h3>
                  <div className="flex flex-wrap gap-2">
                    {tutorProfile.subjects?.map((subject, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-gradient-to-r from-teal-400 to-green-500 text-white px-3 py-1 font-label-sm font-semibold shadow-lg border-2 border-white/30"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-headline-sm text-text-primary font-bold mb-3">Experience</h3>
                  <p className="font-body-md text-text-muted">
                    {tutorProfile.totalSessions
                      ? `${tutorProfile.totalSessions} sessions completed`
                      : "No completed sessions yet"}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "schedule" && (
              <div className="space-y-4">
                <h3 className="font-headline-sm text-text-primary font-bold mb-3">Weekly Availability</h3>
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {DAYS.map((day, idx) => (
                    <div key={idx} className="text-center p-2 text-center font-label-sm font-bold text-text-primary">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {Array.from({ length: 14 }).map((_, hourIdx) => {
                    const hour = 6 + Math.floor(hourIdx / 2);
                    const minute = hourIdx % 2 === 0 ? "00" : "30";
                    const timeStr = `${hour.toString().padStart(2, "0")}:${minute}`;
                    return (
                      <div key={timeStr} className="grid grid-cols-7 gap-2 items-center">
                        <div className="p-2 text-right text-xs text-text-muted font-label-sm border-b border-surface-border/50 border-r border-surface-border/50">
                          {formatTime(timeStr)}
                        </div>
                        {DAYS.map((_, dayIdx) => {
                          const slot = availability.find(a => a.dayOfWeek === dayIdx && a.startTime === timeStr);
                          return (
                            <div
                              key={dayIdx}
                              className={`min-h-[44px] border-b border-surface-border/50 border-r border-surface-border/50 ${
                                slot ? "bg-gradient-to-br from-green-100 to-emerald-100 border-2 border-green-300" : "bg-gray-50/50"
                              }`}
                            >
                              {slot && (
                                <div className="p-1 text-xs font-medium text-green-800">
                                  {formatTime(slot.endTime)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4">
                <TutorReviews
                  tutorId={profile.id}
                  reviews={reviews}
                  average={reviewAverage}
                  total={reviewTotal}
                  canReview={canReview}
                  currentUserId={currentUserId}
                />
              </div>
            )}

            {activeTab === "badges" && (
              <div className="space-y-4">
                <h3 className="font-headline-sm text-text-primary font-bold mb-3">Badges Awarded</h3>
                {awardedBadges.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {awardedBadges.map((item, idx) => (
                      <div key={item.badge.id} className="p-3 rounded-xl bg-white border border-gray-200 flex items-center gap-3 hover:shadow-md transition-shadow">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white flex items-center justify-center text-sm font-bold">
                          {item.badge.iconUrl ? <img src={item.badge.iconUrl} alt="" className="w-full h-full rounded-full" /> : "🏅"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-label-sm text-text-primary font-semibold truncate">{item.badge.name}</p>
                          <p className="font-body-xs text-text-muted capitalize">{item.badge.category}</p>
                        </div>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold text-sm">x{item.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-body-md text-text-muted text-center py-8">No badges awarded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}