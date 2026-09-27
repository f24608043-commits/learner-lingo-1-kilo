import { db } from "@/db";
import { tutorProfiles, tutorSessions, profiles } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { updateTutorProfile } from "@/app/tutoring/actions";
import { updateSessionStatus } from "@/app/tutoring/actions";
import { redirect } from "next/navigation";

export default async function AdminTutoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user is admin first
  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    redirect("/path");
  }

  // Get all tutor profiles (limited for performance)
  const allTutors = await db
    .select({
      id: tutorProfiles.tutorId,
      bio: tutorProfiles.bio,
      subjects: tutorProfiles.subjects,
      hourlyRate: tutorProfiles.hourlyRate,
      timezone: tutorProfiles.timezone,
      isActive: tutorProfiles.isActive,
      rating: tutorProfiles.rating,
      totalSessions: tutorProfiles.totalSessions,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(tutorProfiles)
    .innerJoin(profiles, eq(tutorProfiles.tutorId, profiles.id))
    .orderBy(desc(tutorProfiles.createdAt))
    .limit(50);

  // Get all sessions for oversight
  const allSessions = await db
    .select({
      id: tutorSessions.id,
      tutorId: tutorSessions.tutorId,
      learnerId: tutorSessions.learnerId,
      scheduledAt: tutorSessions.scheduledAt,
      durationMins: tutorSessions.durationMins,
      status: tutorSessions.status,
      jitsiRoomId: tutorSessions.jitsiRoomId,
      tutorName: profiles.displayName,
    })
    .from(tutorSessions)
    .innerJoin(profiles, eq(tutorSessions.tutorId, profiles.id))
    .orderBy(desc(tutorSessions.scheduledAt))
    .limit(50);

  // Calculate session metrics
  const totalSessions = allSessions.length;
  const confirmedSessions = allSessions.filter((s: any) => s.status === "confirmed").length;
  const completedSessions = allSessions.filter((s: any) => s.status === "completed").length;
  const cancelledSessions = allSessions.filter((s: any) => s.status === "cancelled").length;

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-purple-50 to-pink-50 min-h-screen">
      <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold mb-6">Admin Tutoring Dashboard 🎓</h1>

      {/* Session Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 p-4 shadow-xl border-4 border-white/30 text-white">
          <h3 className="font-label-md text-white/80 font-semibold">Total Sessions</h3>
          <p className="font-headline-xl text-headline-xl text-white font-extrabold">{totalSessions}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-4 shadow-xl border-4 border-white/30 text-white">
          <h3 className="font-label-md text-white/80 font-semibold">Confirmed</h3>
          <p className="font-headline-xl text-headline-xl text-white font-extrabold">{confirmedSessions}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-4 shadow-xl border-4 border-white/30 text-white">
          <h3 className="font-label-md text-white/80 font-semibold">Completed</h3>
          <p className="font-headline-xl text-headline-xl text-white font-extrabold">{completedSessions}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-red-500 to-rose-500 p-4 shadow-xl border-4 border-white/30 text-white">
          <h3 className="font-label-md text-white/80 font-semibold">Cancelled</h3>
          <p className="font-headline-xl text-headline-xl text-white font-extrabold">{cancelledSessions}</p>
        </div>
      </div>

      {/* Tutor Management */}
      <div className="mb-8">
        <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-4">Tutor Management ({allTutors.length})</h2>
        <div className="rounded-2xl bg-gradient-to-br from-white to-purple-50 shadow-xl border-4 border-purple-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500 to-pink-500 border-b-4 border-purple-200">
              <tr>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Tutor</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Subjects</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Rate</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Rating</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Sessions</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Status</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-purple-100">
              {allTutors.map((tutor: any) => (
                <tr key={tutor.id} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-label-md font-semibold shadow-lg border-2 border-white/30">
                        {tutor.displayName?.[0] || "?"}
                      </div>
                      <span className="font-label-md font-semibold text-text-primary">{tutor.displayName || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tutor.subjects?.slice(0, 2).map((subject: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded font-body-sm font-semibold shadow-lg border-2 border-white/30">
                          {subject}
                        </span>
                      ))}
                      {tutor.subjects?.length > 2 && (
                        <span className="font-body-sm text-text-muted">+{tutor.subjects.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    {tutor.hourlyRate ? `$${tutor.hourlyRate}/hr` : "Free"}
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    ⭐ {tutor.rating}/5
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    {tutor.totalSessions}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded font-body-sm font-semibold border-2 ${
                      tutor.isActive ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-white/30" : "bg-gradient-to-r from-red-400 to-rose-500 text-white border-white/30"
                    }`}>
                      {tutor.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <form action={async () => {
                      "use server";
                      await updateTutorProfile({
                        isActive: !tutor.isActive,
                      });
                    }} suppressHydrationWarning={true}>
                      <button className="px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-body-sm font-semibold shadow-lg border-2 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                        {tutor.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Oversight */}
      <div>
        <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-4">Recent Sessions (Last 50)</h2>
        <div className="rounded-2xl bg-gradient-to-br from-white to-purple-50 shadow-xl border-4 border-purple-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 border-b-4 border-indigo-200">
              <tr>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Session ID</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Tutor</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Scheduled</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Duration</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Status</th>
                <th className="px-4 py-3 text-left font-label-md font-semibold text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-4 divide-indigo-100">
              {allSessions.map((session: any) => (
                <tr key={session.id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-4 py-3 font-body-sm font-mono text-text-primary">
                    {session.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    {session.tutorName || "Unknown"}
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    {new Date(session.scheduledAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-body-sm text-text-primary">
                    {session.durationMins} min
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded font-body-sm font-semibold border-2 ${
                      session.status === "confirmed" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-white/30" :
                      session.status === "completed" ? "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-white/30" :
                      session.status === "cancelled" ? "bg-gradient-to-r from-red-400 to-rose-500 text-white border-white/30" :
                      "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 border-gray-300"
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {session.status === "confirmed" && (
                      <form action={async () => {
                        "use server";
                        await updateSessionStatus(session.id, "cancelled");
                      }} suppressHydrationWarning={true}>
                        <button className="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-body-sm font-semibold shadow-lg border-2 border-white/30 transform hover:scale-105 transition-all active:scale-95">
                          Cancel
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
