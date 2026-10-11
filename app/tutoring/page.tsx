import { getTutors, getMySessions, getPendingRequests, acceptSessionRequestAction, declineSessionRequestAction, startDirectConversationAction, getLearnerEnrollments, requestEnrollmentAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import dynamic from "next/dynamic";
import { Skeleton, GridSkeleton, ListSkeleton } from "@/components/Skeleton";

const MessagingWidget = dynamic(() => import("@/components/MessagingWidget"), {
  loading: () => null,
});

function TutoringPageSkeleton() {
  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      <Skeleton className="w-full h-48 rounded-3xl mb-6" />
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-4" />
          <ListSkeleton count={3} />
        </div>
        <div>
          <Skeleton className="h-8 w-48 mb-4" />
          <ListSkeleton count={3} />
        </div>
        <div>
          <Skeleton className="h-8 w-48 mb-4" />
          <GridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}

export default async function TutoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "tutor") {
    redirect("/tutoring/dashboard");
  }

  const [tutors, mySessions, pendingRequests, myEnrollments] = await Promise.all([
    getTutors(),
    getMySessions(),
    getPendingRequests(),
    getLearnerEnrollments()
  ]);

  const enrollmentMap = new Map();
  [...myEnrollments.pending, ...myEnrollments.enrolled, ...myEnrollments.rejected, ...myEnrollments.cancelled].forEach(enrollment => {
    enrollmentMap.set(enrollment.tutor.tutorId, enrollment);
  });

  if (!tutors && !mySessions) {
    return <TutoringPageSkeleton />;
  }

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold mb-4">Tutoring Hub 🎓</h1>
        <p className="text-gray-600 mb-8">Connect with expert tutors for personalized learning sessions</p>
        <Mascot pose="encouraging" size={96} />
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">event</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">My Sessions</h2>
        </div>
        <div className="space-y-3">
          {mySessions.map((session: any) => (
            <div key={session.id} className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-label-md text-on-surface font-semibold">
                    {new Date(session.scheduledAt).toLocaleString()}
                  </p>
                  <p className="font-body-sm text-on-surface-variant mt-1">
                    Duration: {session.durationMins} minutes
                  </p>
                  <span className={`inline-block mt-2 rounded-full px-3 py-1 font-label-sm font-semibold border-2 ${session.status === "confirmed" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-white/30" : session.status === "completed" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-white/30" : session.status === "cancelled" ? "bg-gradient-to-r from-red-400 to-rose-500 text-white border-white/30" : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"}`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {session.status === "confirmed" && session.jitsiRoomId && (
                    <a
                      href={"https://meet.jit.si/" + session.jitsiRoomId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[20px]">videocam</span>
                      Join Session
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[24px]">people</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-extrabold">Find a Tutor</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutors.map((tutor: any) => (
            <div
              key={tutor.id}
              data-testid="tutor-card"
              className="min-w-0 rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 hover:shadow-2xl hover:border-blue-200 transition-all"
            >
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
                  <a
                    href={"/tutoring/book?tutorId=" + tutor.tutorId}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 font-label-md font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                  >
                    Book Session
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}