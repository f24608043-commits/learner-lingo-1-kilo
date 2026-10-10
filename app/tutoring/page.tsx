import { getTutors, getMySessions, getPendingRequests, acceptSessionRequestAction, declineSessionRequestAction, startDirectConversationAction, getLearnerEnrollments, requestEnrollmentAction } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import dynamic from "next/dynamic";
import { Skeleton, GridSkeleton, ListSkeleton } from "@/components/Skeleton";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "tutor") {
    redirect("/tutoring/dashboard");
  }

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-cyan-50 min-h-screen">
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-4">Tutoring Hub</h1>
        <p className="text-gray-600">Connect with expert tutors for personalized learning sessions</p>
      </div>
    </div>
  );
}