import { getMySessions, getSessionNotes } from "../actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Mascot from "@/components/Mascot";

export default async function SessionHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const mySessions = await getMySessions();

  // Separate upcoming and past sessions
  const now = new Date();
  const upcomingSessions = mySessions.filter((s: any) => new Date(s.scheduledAt) > now);
  const pastSessions = mySessions.filter((s: any) => new Date(s.scheduledAt) <= now);

  // Limit past sessions for performance and get notes
  const limitedPastSessions = pastSessions.slice(0, 20);
  
  // Get notes for past sessions (limited)
  const sessionsWithNotes = await Promise.all(
    limitedPastSessions.map(async (session: any) => {
      const notes = await getSessionNotes(session.id);
      return { ...session, notes };
    })
  );

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-indigo-50 to-purple-50 min-h-screen">
      {/* Header with Mascot - Stitch Frame Style */}
      <div className="relative w-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Header info */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-label-sm text-label-sm tracking-wider uppercase font-bold shadow-lg border-2 border-white/30">👨‍🏫 Tutor Portal</span>
              <span className="text-text-muted text-label-sm">•</span>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-label-sm text-label-sm font-bold shadow-lg border-2 border-white/30">Session History</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
              Session History 📜
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              View your upcoming and past tutoring sessions
            </p>
          </div>

          {/* Right: Mascot */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            <div className="relative max-w-xs bg-gradient-to-br from-indigo-100 to-purple-100 p-4 rounded-2xl shadow-xl border-4 border-white/50 order-2 sm:order-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>history</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-indigo-700 font-bold">Track Progress</span>
              </div>
              <p className="font-headline-md text-label-md text-text-primary font-bold leading-snug">
                "Review your teaching history and track learner progress!"
              </p>
            </div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <Mascot pose="idle" size={128} />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">event</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
            Upcoming Sessions ({upcomingSessions.length})
          </h2>
        </div>
        {upcomingSessions.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
            <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
              <Mascot pose="empty" size={64} />
            </div>
            <p className="font-body-md text-text-muted font-bold">No upcoming sessions scheduled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session: any) => (
              <div key={session.id} className="rounded-2xl bg-gradient-to-br from-white to-indigo-50 p-5 shadow-xl border-4 border-indigo-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-label-md text-on-surface font-semibold">
                      {new Date(session.scheduledAt).toLocaleString()}
                    </p>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Duration: {session.durationMins} minutes
                    </p>
                    <span className={`inline-block mt-2 rounded-full px-3 py-1 font-label-sm font-semibold border-2 ${
                      session.status === "confirmed" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-white/30" :
                      "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  {session.status === "confirmed" && session.jitsiRoomId && (
                    <a
                      href={`https://meet.jit.si/${session.jitsiRoomId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">videocam</span>
                      Join Session
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">history</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">
            Past Sessions ({pastSessions.length})
          </h2>
        </div>
        {sessionsWithNotes.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
            <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
              <Mascot pose="empty" size={64} />
            </div>
            <p className="font-body-md text-text-muted font-bold">No past sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessionsWithNotes.map((session: any) => (
              <div key={session.id} className="rounded-2xl bg-gradient-to-br from-white to-indigo-50 p-5 shadow-xl border-4 border-indigo-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <p className="font-label-md text-on-surface font-semibold">
                      {new Date(session.scheduledAt).toLocaleString()}
                    </p>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      Duration: {session.durationMins} minutes
                    </p>
                    <span className={`inline-block mt-2 rounded-full px-3 py-1 font-label-sm font-semibold border-2 ${
                      session.status === "completed" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-white/30" :
                      session.status === "cancelled" ? "bg-gradient-to-r from-red-400 to-rose-500 text-white border-white/30" :
                      session.status === "no_show" ? "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300" :
                      "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>

                {/* Session Notes */}
                {session.notes && session.notes.length > 0 && (
                  <div className="mt-4 pt-4 border-t-4 border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">note</span>
                      <h3 className="font-label-md text-on-surface font-semibold">Session Notes</h3>
                    </div>
                    <div className="space-y-3">
                      {session.notes.map((note: any) => (
                        <div key={note.id} className="rounded-xl border-4 border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
                          <p className="font-body-sm text-on-surface">{note.noteText}</p>
                          <p className="font-body-sm text-on-surface-variant opacity-75 mt-2">
                            {new Date(note.createdAt).toLocaleDateString()}
                            {note.visibility === "private_tutor" && <span className="ml-2">• Private</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
