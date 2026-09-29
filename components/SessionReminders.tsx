"use client";

import { useState, useEffect } from "react";

interface ReminderSession {
  id: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  jitsiRoomId: string | null;
  tutorId: string;
  learnerId: string;
  tutor: {
    displayName: string;
    email: string;
  };
  learner: {
    displayName: string;
    email: string;
  };
}

interface RemindersData {
  upcomingIn1Hour: ReminderSession[];
  upcomingIn24Hours: ReminderSession[];
  totalUpcoming: number;
}

// Native date formatting functions
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + 
    " at " + date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const formatTimeUntil = (scheduledAt: string): string => {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diff = scheduled.getTime() - now.getTime();
  
  if (diff <= 0) return "Starting now";
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} min`;
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const formatShortTimeUntil = (scheduledAt: string): string => {
  const now = new Date();
  const scheduled = new Date(scheduledAt);
  const diff = scheduled.getTime() - now.getTime();
  
  if (diff <= 0) return "Now";
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

export default function SessionReminders({ isTutor }: { isTutor?: boolean }) {
  const [reminders, setReminders] = useState<RemindersData>({
    upcomingIn1Hour: [],
    upcomingIn24Hours: [],
    totalUpcoming: 0,
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchReminders = async () => {
    try {
      const response = await fetch("/api/tutoring/reminders");
      if (response.ok) {
        const data = await response.json();
        // Ensure data has the expected structure
        if (data && typeof data === 'object' && 'upcomingIn1Hour' in data && 'upcomingIn24Hours' in data) {
          setReminders(data);
        } else {
          setReminders({ upcomingIn1Hour: [], upcomingIn24Hours: [], totalUpcoming: 0 });
        }
      } else {
        setReminders({ upcomingIn1Hour: [], upcomingIn24Hours: [], totalUpcoming: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch reminders:", error);
      setReminders({ upcomingIn1Hour: [], upcomingIn24Hours: [], totalUpcoming: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeUntil = (scheduledAt: string) => {
    const now = new Date();
    const scheduled = new Date(scheduledAt);
    const diff = scheduled.getTime() - now.getTime();
    
    if (diff <= 0) return "Starting now";
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatSessionTime = (scheduledAt: string) => {
    return format(new Date(scheduledAt), "EEE, MMM d 'at' h:mm a");
  };

  const totalReminders = reminders.upcomingIn1Hour.length + reminders.upcomingIn24Hours.length;

  if (totalReminders === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border-2 border-red-200 shadow-lg hover:bg-red-100 transition-all"
        aria-label="Session reminders"
      >
        <span className="relative flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm">
          <span className="material-symbols-outlined text-[18px]">notifications_active</span>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {totalReminders}
          </span>
        </span>
        <span className="font-label-sm text-red-700 font-semibold hidden sm:inline">
          {totalReminders} upcoming
        </span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 animate-slide-down">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-label-md text-text-primary font-extrabold">Upcoming Sessions</h3>
            <button
              onClick={() => setShowDropdown(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {reminders.upcomingIn1Hour.length > 0 && (
              <div className="p-4 border-b border-gray-100 bg-red-50">
                <h4 className="font-label-sm text-red-700 font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Starting Within 1 Hour
                </h4>
                <div className="space-y-2">
                  {reminders.upcomingIn1Hour.map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                        {formatShortTimeUntil(session.scheduledAt).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-sm text-text-primary font-semibold truncate">
                          {formatDate(session.scheduledAt)}
                        </p>
                        <p className="font-body-xs text-text-muted truncate">
                          {isTutor ? `with ${session.learner.displayName}` : `with ${session.tutor.displayName}`}
                        </p>
                      </div>
                      {session.jitsiRoomId && session.status === "confirmed" && (
                        <a
                          href={`https://meet.jit.si/${session.jitsiRoomId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">videocam</span>
                          Join
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reminders.upcomingIn24Hours.length > 0 && (
              <div className="p-4">
                <h4 className="font-label-sm text-text-primary font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">event</span>
                  Next 24 Hours
                </h4>
                <div className="space-y-2">
                  {reminders.upcomingIn24Hours.map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                        {formatShortTimeUntil(session.scheduledAt).split(" ")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-label-sm text-text-primary font-semibold truncate">
                          {formatDate(session.scheduledAt)}
                        </p>
                        <p className="font-body-xs text-text-muted truncate">
                          {isTutor ? `with ${session.learner.displayName}` : `with ${session.tutor.displayName}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-gray-100 text-center">
              <a
                href="/tutoring"
                className="font-label-sm text-primary font-bold hover:underline"
              >
                View all sessions →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}