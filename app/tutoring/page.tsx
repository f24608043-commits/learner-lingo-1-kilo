import { getTutors, getMySessions, getPendingRequests, acceptSessionRequestAction, declineSessionRequestAction, startDirectConversationAction, getLearnerEnrollments, requestEnrollmentAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import dynamic from "next/dynamic";

// Lazy load messaging widget
const MessagingWidget = dynamic(() => import("@/components/MessagingWidget"), {
  loading: () => null,
});

export default async function TutoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // If user is a tutor, redirect to tutor dashboard
  if (profile?.role === "tutor") {
    redirect("/tutoring/dashboard");
  }

  const [tutors, mySessions, pendingRequests, myEnrollments] = await Promise.all([
    getTutors(),
    getMySessions(),
    getPendingRequests(),
    getLearnerEnrollments()
  ]);

  // Create a map of enrollment status by tutorId for quick lookup
  const enrollmentMap = new Map();
  [...myEnrollments.pending, ...myEnrollments.enrolled, ...myEnrollments.rejected, ...myEnrollments.cancelled].forEach(enrollment => {
    enrollmentMap.set(enrollment.tutor.tutorId, enrollment);
  });

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      {/* Header with Mascot - Stitch Frame Style */}
      <div className="relative w-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Header info */}
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-label-sm text-label-sm tracking-wider uppercase font-bold shadow-lg border-2 border-white/30">👨‍🏫 Tutoring</span>
              <span className="text-text-muted text-label-sm">•</span>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-teal-500 to-green-500 text-white font-label-sm text-label-sm font-bold shadow-lg border-2 border-white/30">Expert Help</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
              Tutoring Hub 🎓
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
              Connect with expert tutors for personalized learning sessions
            </p>
          </div>

          {/* Right: Mascot */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
            <div className="relative max-w-xs bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-2xl shadow-xl border-4 border-white/50 order-2 sm:order-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-cyan-600 text-[18px]" style={{ fontVariationSettings: 'FILL 1' }}>school</span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-cyan-700 font-bold">Learn Together</span>
              </div>
              <p className="font-headline-md text-label-md text-text-primary font-bold leading-snug">
                "Get personalized help from expert tutors to accelerate your learning!"
              </p>
            </div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0 order-1 sm:order-2">
              <Mascot pose="encouraging" size={128} />
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Pending Requests (for tutors) - only show for tutors */}
      {false && pendingRequests.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-br from-yellow-100 to-orange-100 p-6 shadow-xl border-4 border-yellow-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-on-secondary-container text-[24px]" style={{ fontVariationSettings: 'FILL 1' }}>notifications</span>
            <h2 className="font-headline-md text-headline-md text-on-secondary-container font-extrabold">
              Pending Session Requests ({pendingRequests.length})
            </h2>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((request: any) => (
              <div key={request.id} className="rounded-2xl bg-white p-4 shadow-lg border-4 border-yellow-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-xl border-4 border-white/30">
                    {request.learner.displayName?.[0] || "?"}
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface font-semibold">
                      {request.learner.displayName || "Unknown"}
                    </p>
                    <p className="font-body-sm text-on-surface-variant">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {request.message && (
                  <p className="font-body-sm text-on-surface-variant mb-3 italic">
                    "{request.message}"
                  </p>
                )}
                <div className="flex gap-2">
                  <form action={acceptSessionRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="selectedSlotIndex" value="0" />
                    <button className="rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                      Accept
                    </button>
                  </form>
                  <form action={declineSessionRequestAction}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button className="rounded-xl border-4 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 px-4 py-2 font-label-md font-semibold hover:from-gray-200 hover:to-gray-300 transition-all shadow-lg">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Sessions */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">event</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">My Sessions</h2>
        </div>
        {mySessions.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
            <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
              <Mascot pose="empty" size={64} />
            </div>
            <p className="font-body-md text-text-muted font-bold">No sessions yet. Find a tutor to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mySessions.map((session: any) => {
              const otherUserId = session.tutorId === user.id ? session.learnerId : session.tutorId;
              const otherUserName = session.tutorId === user.id ? "Learner" : "Tutor";
              
              return (
                <div key={session.id} className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100">
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
                        session.status === "completed" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-white/30" :
                        session.status === "cancelled" ? "bg-gradient-to-r from-red-400 to-rose-500 text-white border-white/30" :
                        "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {session.status === "confirmed" && session.jitsiRoomId && (
                        <a
                          href={`https://meet.jit.si/${session.jitsiRoomId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[20px]">videocam</span>
                          Join Session
                        </a>
                      )}
<MessagingWidget
                        otherUserId={otherUserId}
                        otherUserName={session.tutor?.displayName || "Tutor"}
                        sessionId={session.id}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tutor Directory - only for learners */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">people</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">Find a Tutor</h2>
        </div>
        {tutors.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center shadow-xl border-4 border-blue-100">
            <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
              <Mascot pose="thinking" size={64} />
            </div>
            <h3 className="font-headline-md text-text-primary font-black mb-2">No tutors available yet</h3>
            <p className="font-body-md text-text-muted max-w-md mx-auto mb-6">
              Be the first tutor! Share your knowledge and help others learn.
            </p>
            <Link
              href="/tutoring?become=tutor"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">school</span>
              Become a Tutor
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tutors.map((tutor: any) => (
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
                    {tutor.hourlyRate ? `$${tutor.hourlyRate}/hour` : "Free"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <form action={startDirectConversationAction}>
                      <input type="hidden" name="otherUserId" value={tutor.tutorId} />
                      <button data-testid="tutor-message-button" className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-600 px-3 py-2 font-label-sm font-bold shadow-lg hover:from-blue-100 hover:to-cyan-100 transition-all">
                        Message
                      </button>
                    </form>
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
                              <form action={requestEnrollmentAction}>
                                <input type="hidden" name="tutorId" value={tutor.tutorId} />
                                <button className="rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-600 px-3 py-2 font-label-sm font-bold shadow-lg hover:from-red-100 hover:to-rose-100 transition-all">
                                  Request Again
                                </button>
                              </form>
                            );
                          case "cancelled":
                            return (
                              <form action={requestEnrollmentAction}>
                                <input type="hidden" name="tutorId" value={tutor.tutorId} />
                                <button className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                                  Enroll
                                </button>
                              </form>
                            );
                          default:
                            return (
                              <form action={requestEnrollmentAction}>
                                <input type="hidden" name="tutorId" value={tutor.tutorId} />
                                <button className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                                  Enroll
                                </button>
                              </form>
                            );
                        }
                      } else {
                        return (
                          <form action={requestEnrollmentAction}>
                            <input type="hidden" name="tutorId" value={tutor.tutorId} />
                            <button className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                              Enroll
                            </button>
                          </form>
                        );
                      }
                    })()}
                    <a
                      href={`/tutoring/book?tutorId=${tutor.tutorId}`}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      Book Session
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
