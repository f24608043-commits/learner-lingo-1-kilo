import { getSession, getSessionNotes } from "../../actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SessionPageClient from "./SessionPageClient";

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const { sessionId } = await params;
  
  if (!sessionId) {
    return (
      <div className="w-full px-6 py-6">
        <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold mb-4">Invalid Session ID</h1>
        <p className="font-body-md text-on-surface-variant">Session ID is required to view session details.</p>
      </div>
    );
  }

  const session = await getSession(sessionId);
  const notes = await getSessionNotes(sessionId);

  if (!session) {
    return (
      <div className="w-full px-6 py-6">
        <h1 className="font-headline-xl text-headline-xl text-on-surface font-extrabold mb-4">Session Not Found</h1>
        <p className="font-body-md text-on-surface-variant">This session does not exist or you don't have access to it.</p>
      </div>
    );
  }

  const isTutor = session.tutorId === user.id;

  return (
    <SessionPageClient
      session={session}
      notes={notes || []}
      isTutor={isTutor}
      currentUserId={user.id}
    />
  );
}