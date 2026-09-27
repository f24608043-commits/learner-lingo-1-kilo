import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { lessons, profiles, userProgress } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { generateQuiz } from "@/lib/ai/generateQuiz";
import PracticeClient from "./PracticeClient";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Onboarding check
  const [profile] = await db
    .select({ onboardingDone: profiles.onboardingDone })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.onboardingDone) redirect("/onboarding");

  // Fetch lesson
  const [lesson] = await db
    .select({ id: lessons.id, title: lessons.title })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) redirect("/path");

  // FR4.7: Server-enforce — lesson must be completed before practice is reachable
  const [progress] = await db
    .select({ status: userProgress.status })
    .from(userProgress)
    .where(
      and(eq(userProgress.userId, user.id), eq(userProgress.lessonId, lessonId))
    )
    .limit(1);

  if (!progress || progress.status !== "completed") {
    // Redirect back to the lesson (not a public error — just silently gate)
    redirect(`/lesson/${lessonId}`);
  }

  // Generate a fresh AI quiz for this practice session
  const generated = await generateQuiz({
    lessonId,
    count: 3,
    mode: "practice",
    triggeredBy: user.id,
  });

  return (
    <PracticeClient
      lessonId={lessonId}
      lessonTitle={lesson.title}
      questions={generated.questions}
      provider={generated.provider}
    />
  );
}
