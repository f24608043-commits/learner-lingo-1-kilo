"use client";

import React, { useState, useEffect, useCallback } from "react";

interface TimeSlot {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isRecurring?: boolean;
  date?: string;
}

interface TutorAvailability {
  id: string;
  tutorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const endOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
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

export default function ScheduleCalendar() {
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date()));
  const [availability, setAvailability] = useState<TutorAvailability[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newSlot, setNewSlot] = useState<TimeSlot>({
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "10:00",
    isRecurring: true,
  });
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startDay: number;
    startTime: string;
    currentDay: number;
    currentTime: string;
  } | null>(null);

  // Fetch tutor availability
  const fetchAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/tutoring/availability");
      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  const weekStart = formatDate(currentWeek, "MMM d");
  const weekEnd = formatDate(addDays(currentWeek, 6), "MMM d, yyyy");

  // Generate time slots from 6 AM to 11 PM
  const timeSlots = Array.from({ length: 34 }, (_, i) => {
    const hour = 6 + Math.floor(i / 2);
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  });

  // Check if a slot is available
  const isSlotAvailable = (dayOfWeek: number, time: string) => {
    return availability.some((a) => 
      a.dayOfWeek === dayOfWeek && 
      a.isActive &&
      a.startTime <= time && 
      a.endTime > time
    );
  };

  // Check if a slot is the start of an availability block
  const isSlotStart = (dayOfWeek: number, time: string) => {
    return availability.some((a) => 
      a.dayOfWeek === dayOfWeek && 
      a.isActive &&
      a.startTime === time
    );
  };

  // Get availability block height
  const getBlockHeight = (dayOfWeek: number, time: string) => {
    const block = availability.find((a) => 
      a.dayOfWeek === dayOfWeek && 
      a.isActive &&
      a.startTime === time
    );
    if (!block) return 1;
    const startIndex = timeSlots.indexOf(block.startTime);
    const endIndex = timeSlots.indexOf(block.endTime);
    return endIndex > startIndex ? endIndex - startIndex : 1;
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));
  const handleToday = () => setCurrentWeek(startOfWeek(new Date()));

  const openSlotModal = (dayOfWeek: number, time: string) => {
    setNewSlot({
      dayOfWeek,
      startTime: time,
      endTime: timeSlots[timeSlots.indexOf(time) + 1] || "23:00",
      isRecurring: true,
    });
    setShowSlotModal(true);
  };

  const handleSaveSlot = async () => {
    try {
      const response = await fetch("/api/tutoring/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSlot),
      });
      if (response.ok) {
        fetchAvailability();
        setShowSlotModal(false);
      } else {
        throw new Error("Failed to save slot");
      }
    } catch (error) {
      console.error("Failed to save slot:", error);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm("Delete this availability slot?")) return;
    try {
      const response = await fetch(`/api/tutoring/availability/${slotId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAvailability();
      }
    } catch (error) {
      console.error("Failed to delete slot:", error);
    }
  };

  // Drag handlers for creating slots visually
  const handleMouseDown = (dayOfWeek: number, time: string) => {
    setDragState({
      isDragging: true,
      startDay: dayOfWeek,
      startTime: time,
      currentDay: dayOfWeek,
      currentTime: time,
    });
  };

  const handleMouseMove = (dayOfWeek: number, time: string) => {
    if (dragState?.isDragging) {
      setDragState(prev => prev ? { ...prev, currentDay: dayOfWeek, currentTime: time } : null);
    }
  };

  const handleMouseUp = () => {
    if (dragState?.isDragging && dragState.startDay === dragState.currentDay) {
      const startIdx = timeSlots.indexOf(dragState.startTime);
      const endIdx = timeSlots.indexOf(dragState.currentTime);
      if (endIdx > startIdx) {
        openSlotModal(dragState.startDay, dragState.startTime);
        setNewSlot(prev => ({
          ...prev,
          dayOfWeek: dragState.startDay,
          startTime: dragState.startTime,
          endTime: dragState.currentTime,
        }));
      }
    }
    setDragState(null);
  };

  useEffect(() => {
    if (dragState?.isDragging) {
      window.addEventListener("mousemove", handleGlobalMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState]);

  const handleGlobalMouseMove = (e: MouseEvent) => {
    // This would need element position calculation for full drag support
    // Simplified for now
  };

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-purple-50 to-pink-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold">
            Weekly Schedule 📅
          </h1>
          <p className="font-body-md text-text-muted mt-1">
            Manage your tutoring availability for {weekStart} - {weekEnd}
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
          <button
            onClick={() => {
              setNewSlot({ dayOfWeek: 1, startTime: "09:00", endTime: "10:00", isRecurring: true });
              setShowSlotModal(true);
            }}
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Slot
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-3xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
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
        <div className="overflow-x-auto max-h-[600px]">
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
                  const isStart = isSlotStart(dayIdx, time);
                  const blockHeight = getBlockHeight(dayIdx, time);
                  
                  if (isStart) {
                    return (
                      <div
                        key={`${dayIdx}-${time}`}
                        className={`relative min-h-[44px] border-b border-surface-border/50 border-r border-surface-border/50 ${isToday(day) ? "bg-blue-50/30" : ""}`}
                        style={{ gridRow: `span ${blockHeight * 2}` }}
                        onMouseDown={() => handleMouseDown(dayIdx, time)}
                        onMouseEnter={() => handleMouseMove(dayIdx, time)}
                      >
                        <div
                          className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 shadow-inner border-2 border-purple-200"
                          style={{ top: 2, bottom: 2, left: 2, right: 2 }}
                        >
                          <div className="absolute inset-0 p-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-purple-800 bg-white/80 px-1.5 py-0.5 rounded">
                                {time}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteSlot(availability.find(a => a.dayOfWeek === dayIdx && a.startTime === time)?.id || "");
                                }}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                            <div className="text-xs text-purple-700 opacity-80">
                              {availability.find(a => a.dayOfWeek === dayIdx && a.startTime === time)?.endTime || ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (!isAvailable || (isAvailable && !isStart)) {
                    return (
                      <div
                        key={`${dayIdx}-${time}`}
                        className={`relative min-h-[44px] border-b border-surface-border/50 border-r border-surface-border/50 ${isToday(day) ? "bg-blue-50/30" : ""}`}
                        onClick={() => !isAvailable && openSlotModal(dayIdx, time)}
                        onMouseDown={() => handleMouseDown(dayIdx, time)}
                        onMouseEnter={() => handleMouseMove(dayIdx, time)}
                      >
                        {!isAvailable && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-gray-300 text-xs font-label-sm">+ Add</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-100 to-pink-100 border-2 border-purple-200"></div>
          <span>Available Slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-dashed border-gray-300 bg-gray-50"></div>
          <span>Click to Add</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-50/30 border border-blue-200"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">drag_indicator</span>
          <span>Drag to Create</span>
        </div>
      </div>

      {/* Add/Edit Slot Modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-4 border-white p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">
                {selectedSlot ? "Edit Slot" : "Add Availability"}
              </h2>
              <button
                onClick={() => setShowSlotModal(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveSlot(); }}>
              <div className="space-y-4">
                <div>
                  <label className="block font-label-sm text-text-primary font-bold mb-1.5">
                    Day
                  </label>
                  <select
                    value={newSlot.dayOfWeek}
                    onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: Number(e.target.value) })}
                    className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                  >
                    {FULL_DAYS.map((day, idx) => (
                      <option key={idx} value={idx}>{day}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-text-primary font-bold mb-1.5">
                      Start Time
                    </label>
                    <select
                      value={newSlot.startTime}
                      onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>
                          {formatDate(parseISO(`2000-01-01T${slot}:00`), "h:mm a")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-sm text-text-primary font-bold mb-1.5">
                      End Time
                    </label>
                    <select
                      value={newSlot.endTime}
                      onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>
                          {formatDate(parseISO(`2000-01-01T${slot}:00`), "h:mm a")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={newSlot.isRecurring}
                    onChange={(e) => setNewSlot({ ...newSlot, isRecurring: e.target.checked })}
                    className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary"
                  />
                  <label htmlFor="recurring" className="font-label-sm text-text-primary font-medium">
                    Recurring weekly
                  </label>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSlotModal(false)}
                  className="flex-1 rounded-xl border-2 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 px-4 py-2 font-label-md font-semibold hover:from-gray-200 hover:to-gray-300 transition-all shadow-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}