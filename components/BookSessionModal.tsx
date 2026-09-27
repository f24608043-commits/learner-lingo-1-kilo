"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface BookSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  tutorId: string;
  tutorName: string;
  tutorSubjects?: string[];
}

export default function BookSessionModal({ isOpen, onClose, tutorId, tutorName, tutorSubjects = [] }: BookSessionModalProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([]);
  const [error, setError] = useState("");

  // Fetch tutor availability when date changes
  useEffect(() => {
    if (!selectedDate) return;
    
    const fetchAvailability = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const response = await fetch(`/api/tutors/${tutorId}/availability?date=${selectedDate}`);
        const data = await response.json();
        if (data.slots) {
          setAvailableSlots(data.slots);
        }
      } catch (error) {
        console.error("Failed to fetch availability:", error);
      }
    };
    
    fetchAvailability();
  }, [selectedDate, tutorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tutoring/request-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId,
          requestedSlots: [{
            date: selectedDate,
            startTime: selectedTime,
            endTime: `${parseInt(selectedTime.split(":")[0]) + Math.floor(duration / 60)}:${selectedTime.split(":")[1]}`
          }],
          message,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to book session");
      }

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to book session");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Generate time slots (9 AM - 8 PM, 30 min intervals)
  const timeSlots = Array.from({ length: 22 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  }).filter(t => {
    const [h, m] = t.split(":").map(Number);
    return h < 20 || (h === 20 && m === 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
              {tutorName[0]}
            </div>
            <div>
              <h3 className="font-label-lg font-bold text-text-primary">Book Session</h3>
              <p className="font-body-sm text-text-muted">with {tutorName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error font-body-sm">
              {error}
            </div>
          )}

          {/* Date Selection */}
          <div>
            <label className="block font-label-sm text-text-primary font-semibold mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-border bg-gray-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-primary"
              required
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block font-label-sm text-text-primary font-semibold mb-2">Select Time</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`px-3 py-2 rounded-xl font-label-sm font-medium transition-all ${
                    selectedTime === time
                      ? "bg-primary text-white shadow-clay-primary"
                      : "bg-gray-50 text-text-primary hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block font-label-sm text-text-primary font-semibold mb-2">Duration</label>
            <div className="flex gap-2">
              { [30, 60, 90, 120].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDuration(min)}
                  className={`flex-1 px-4 py-2 rounded-xl font-label-sm font-semibold transition-all ${
                    duration === min
                      ? "bg-primary text-white shadow-clay-primary"
                      : "bg-gray-50 text-text-primary hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  {min} min
                </button>
              )) }
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block font-label-sm text-text-primary font-semibold mb-2">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Tell the tutor what you'd like help with..."
              className="w-full px-4 py-3 rounded-xl border-2 border-surface-border bg-gray-50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-primary"
            />
          </div>

          {/* Tutor Subjects */}
          {tutorSubjects && tutorSubjects.length > 0 && (
            <div className="pt-2 border-t border-surface-border">
              <label className="block font-label-sm text-text-muted mb-2">Tutor Subjects</label>
              <div className="flex flex-wrap gap-2">
                {tutorSubjects.map((subject: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm font-semibold">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !selectedDate || !selectedTime}
            className="w-full py-3 rounded-xl bg-primary text-white font-label-lg font-bold shadow-clay-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-[2px] active:shadow-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Booking...
              </span>
            ) : (
              "Request Session"
            )}
          </button>

          <p className="text-center font-body-xs text-text-muted">
            The tutor will receive your request and can accept or propose alternative times.
          </p>
        </form>
      </div>
    </div>
  );
}