"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Tutor {
  id: string;
  tutorId: string;
  displayName: string;
  bio: string;
  subjects: string[];
  hourlyRate: number | null;
  timezone: string;
  rating: number;
  totalSessions: number;
  avatarUrl?: string;
}

interface TutorAvailability {
  id: string;
  tutorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface BookingSlot {
  date: string;
  startTime: string;
  endTime: string;
  tutorId: string;
  tutorName: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Native date functions
const formatDate = (date: Date, formatStr: string): string => {
  if (formatStr === "MMM d") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (formatStr === "MMM d, yyyy") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (formatStr === "h:mm a") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (formatStr === "EEE, MMM d") {
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString();
};

const startOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const addWeeks = (date: Date, weeks: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

const subWeeks = (date: Date, weeks: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - weeks * 7);
  return d;
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const parseISO = (dateString: string): Date => {
  return new Date(dateString);
};

export default function BookingCalendar({ tutorId }: { tutorId?: string }) {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date()));
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [availability, setAvailability] = useState<TutorAvailability[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<BookingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");

  // Fetch tutors
  const fetchTutors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (tutorId) params.append("tutorId", tutorId);
      const response = await fetch(`/api/tutoring/tutors?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTutors(data);
        if (tutorId && data.length > 0) {
          setSelectedTutor(data[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tutors:", error);
    }
  }, [tutorId]);

  // Fetch tutor availability
  const fetchAvailability = useCallback(async () => {
    if (!selectedTutor) {
      setAvailability([]);
      return;
    }
    try {
      const response = await fetch(`/api/tutoring/availability?tutorId=${selectedTutor.tutorId}`);
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTutor]);

  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability, selectedTutor]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const weekStart = formatDate(currentWeek, "MMM d");
  const weekEnd = formatDate(addDays(currentWeek, 6), "MMM d, yyyy");

  // Generate time slots from 6 AM to 11 PM
  const timeSlots = Array.from({ length: 34 }, (_, i) => {
    const hour = 6 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  // Check if a slot is available for the selected tutor
  const isSlotAvailable = (dayOfWeek: number, time: string) => {
    return availability.some((a) => 
      a.dayOfWeek === dayOfWeek && 
      a.isActive &&
      a.startTime <= time && 
      a.endTime > time
    );
  };

  // Check if a slot is already selected
  const isSlotSelected = (date: string, time: string) => {
    return selectedSlots.some(s => s.date === date && s.startTime === time);
  };

  // Toggle slot selection
  const toggleSlot = (dayOfWeek: number, time: string) => {
    if (!selectedTutor) return;
    
    const date = formatDate(weekDays[dayOfWeek], "yyyy-MM-dd");
    const nextTimeIdx = timeSlots.indexOf(time) + 1;
    const endTime = nextTimeIdx < timeSlots.length ? timeSlots[nextTimeIdx] : "23:00";
    
    const newSlot: BookingSlot = {
      date,
      startTime: time,
      endTime,
      tutorId: selectedTutor.tutorId,
      tutorName: selectedTutor.displayName,
    };

    if (isSlotSelected(date, time)) {
      setSelectedSlots(prev => prev.filter(s => !(s.date === date && s.startTime === time)));
    } else {
      setSelectedSlots(prev => [...prev, newSlot]);
    }
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleToday = () => setCurrentWeek(startOfWeek(new Date()));

  const handleBooking = async () => {
    if (selectedSlots.length === 0 || !selectedTutor) return;

    try {
      const response = await fetch("/api/tutoring/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: selectedTutor.tutorId,
          requestedSlots: selectedSlots.map(s => ({
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
          message: bookingMessage,
        }),
      });

      if (response.ok) {
        setSelectedSlots([]);
        setBookingMessage("");
        setShowBookingModal(false);
        alert("Session request sent successfully!");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to book session");
      }
    } catch (error) {
      console.error("Failed to book session:", error);
      alert("Failed to book session");
    }
  };

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold">
            Book a Session 📅
          </h1>
          <p className="font-body-md text-text-muted mt-1">
            {selectedTutor 
              ? `Booking with ${selectedTutor.displayName} for ${weekStart} - ${weekEnd}`
              : "Select a tutor to view availability"
            }
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleToday}
            className="rounded-xl bg-white text-text-primary px-4 py-2 font-label-md font-semibold shadow-lg border-2 border-surface-border hover:bg-gray-50 transition-all"
          >
            Today
          </button>
          <button
            onClick={handlePrevWeek}
            className="rounded-xl bg-white text-text-primary px-4 py-2 font-label-md font-semibold shadow-lg border-2 border-surface-border hover:bg-gray-50 transition-all"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            onClick={handleNextWeek}
            className="rounded-xl bg-white text-text-primary px-4 py-2 font-label-md font-semibold shadow-lg border-2 border-surface-border hover:bg-gray-50 transition-all"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Tutor Selector */}
      {!tutorId && (
        <div className="mb-6 rounded-2xl bg-white shadow-clay-surface border border-surface-border p-4">
          <label className="block font-label-sm text-text-primary font-bold mb-2">
            Select Tutor
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((tutor) => (
              <button
                key={tutor.id}
                onClick={() => setSelectedTutor(tutor)}
                className={`p-4 rounded-2xl text-left transition-all border-4 ${
                  selectedTutor?.id === tutor.id
                    ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300 shadow-xl ring-2 ring-blue-500"
                    : "bg-gradient-to-br from-white to-blue-50 border-blue-100 hover:shadow-xl hover:border-blue-200"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-xl shadow-xl border-4 border-white/30">
                    {tutor.displayName?.[0] || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md text-on-surface font-semibold truncate">
                      {tutor.displayName || "Unknown"}
                    </p>
                    <div className="flex items-center gap-1 font-body-sm text-text-muted">
                      <span className="material-symbols-outlined text-yellow-500 text-[16px]" style={{ fontVariationSettings: 'FILL 1' }}>star</span>
                      <span className="font-bold text-yellow-600">{tutor.rating}/5</span>
                    </div>
                  </div>
                </div>
                <p className="font-body-sm text-on-surface-variant mb-3 line-clamp-2">
                  {tutor.bio || "No bio available"}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tutor.subjects?.map((subject: string, idx: number) => (
                    <span key={idx} className="rounded-full bg-gradient-to-r from-teal-400 to-green-500 text-white px-2 py-1 font-label-sm font-semibold shadow-lg border-2 border-white/30">
                      {subject}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-label-sm font-semibold text-on-surface">
                    {tutor.hourlyRate ? `$${tutor.hourlyRate}/hour` : "Free"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTutor && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-lg border-2 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-xl shadow-xl border-4 border-white/30">
              {selectedTutor.displayName?.[0] || "?"}
            </div>
            <div>
              <p className="font-label-md text-on-surface font-semibold">{selectedTutor.displayName}</p>
              <p className="font-body-sm text-text-muted">
                {selectedTutor.subjects?.join(", ") || "No subjects listed"} • 
                {selectedTutor.hourlyRate ? `$${selectedTutor.hourlyRate}/hour` : "Free"}
              </p>
            </div>
            <button
              onClick={() => setSelectedTutor(null)}
              className="ml-auto text-text-muted hover:text-text-primary"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {selectedTutor && (
        <>
          {/* Calendar Grid */}
          <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border overflow-hidden mb-6">
            {/* Day Headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-surface-border bg-gray-50/50">
              <div className="p-3 font-label-sm text-text-muted font-bold text-center">Time</div>
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`p-3 text-center font-label-sm font-bold ${isToday(day) ? "bg-primary/10 text-primary" : "text-text-primary"}`}
                >
                  <div className="text-xs text-text-muted uppercase tracking-wider">{DAYS[idx]}</div>
<div className={`text-lg ${isToday(day) ? "text-primary font-extrabold" : ""}`}>
                      {day.getDate()}
                    </div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="overflow-x-auto max-h-[500px]">
              <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                {timeSlots.map((time, timeIdx) => (
                  <React.Fragment key={time}>
                    {/* Time Label */}
                    <div className="relative p-2 text-right text-xs text-text-muted font-label-sm border-b border-surface-border/50 border-r border-surface-border/50">
                      {formatDate(parseISO(`2000-01-01T${time}:00`), "h:mm a")}
                    </div>
                    {/* Day Columns */}
                    {weekDays.map((day, dayIdx) => {
                      const isAvailable = isSlotAvailable(dayIdx, time);
                      const isSelected = isSlotSelected(formatDate(weekDays[dayIdx], "yyyy-MM-dd"), time);
                      const isTodayCell = isToday(day);
                      
                      return (
                        <div
                          key={`${dayIdx}-${time}`}
                          className={`relative min-h-[44px] border-b border-surface-border/50 border-r border-surface-border/50 ${isTodayCell ? "bg-blue-50/30" : ""} ${isAvailable ? "hover:bg-blue-50" : "opacity-50"} cursor-pointer transition-colors`}
                          onClick={() => isAvailable && toggleSlot(dayIdx, time)}
                        >
                          {isAvailable && (
                            <div className={`absolute inset-0 flex items-center justify-center ${isSelected ? "bg-gradient-to-br from-blue-100 to-cyan-100" : "bg-transparent"}`}>
                              {isSelected ? (
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-cyan-100 shadow-inner border-2 border-blue-300" style={{ top: 2, bottom: 2, left: 2, right: 2 }}>
                                  <div className="absolute inset-0 p-2 flex flex-col justify-between">
                                    <span className="text-xs font-bold text-blue-800 bg-white/90 px-1.5 py-0.5 rounded">
{formatDate(parseISO(`2000-01-01T${time}:00`), "h:mm a")}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300 text-xs font-label-sm pointer-events-none">Available</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
</React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Legend & Selected Slots */}
          <div className="mb-4 flex flex-wrap gap-4 text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-100 to-cyan-100 border-2 border-blue-300"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-dashed border-gray-300 bg-gray-50"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-gray-200 bg-gray-100"></div>
              <span>Unavailable</span>
            </div>
          </div>

          {/* Selected Slots Summary */}
          {selectedSlots.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4 shadow-lg border-2 border-blue-200 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-label-md text-blue-800 font-extrabold">
                  Selected Slots ({selectedSlots.length})
                </h3>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                >
                  Request Session
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedSlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                    <div>
                      <p className="font-label-sm text-text-primary">
                        {formatDate(parseISO(slot.date), "EEEE, MMM d")} at {formatDate(parseISO(`2000-01-01T${slot.startTime}:00`), "h:mm a")} - {formatDate(parseISO(`2000-01-01T${slot.endTime}:00`), "h:mm a")}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSlots(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Modal */}
          {showBookingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-white p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">
                    Request Session
                  </h2>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleBooking(); }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block font-label-sm text-text-primary font-bold mb-1.5">
                        Message to Tutor (optional)
                      </label>
                      <textarea
                        value={bookingMessage}
                        onChange={(e) => setBookingMessage(e.target.value)}
                        rows={3}
                        className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        placeholder="Let the tutor know what you'd like help with..."
                      />
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="font-label-sm text-text-primary font-bold mb-2">Session Summary:</p>
                      <div className="space-y-1 text-sm text-text-muted">
                        {selectedSlots.map((slot, idx) => (
                          <p key={idx}>
                            {formatDate(parseISO(slot.date), "EEE, MMM d")} • {formatDate(parseISO(`2000-01-01T${slot.startTime}:00`), "h:mm a")} - {formatDate(parseISO(`2000-01-01T${slot.endTime}:00`), "h:mm a")}
                          </p>
                        ))}
                        <p className="font-bold text-text-primary mt-2">
                          Total: {selectedSlots.length} hour{selectedSlots.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 px-4 py-2 font-label-md font-semibold hover:from-gray-200 hover:to-gray-300 transition-all shadow-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      Send Request
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}