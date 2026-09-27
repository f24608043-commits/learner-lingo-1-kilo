"use server";

import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { challenges, challengeOptions, lessons, profiles } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { generateQuiz, type GeneratedQuestion } from "@/lib/ai/generateQuiz";
import { extractYouTubeId } from "@/utils/youtube";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const [profile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile || profile.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }

  return user;
}

// ── Update lesson metadata (title, description, YouTube URL, XP, publish) ──
export async function updateLesson(formData: FormData) {
  await assertAdmin();

  const lessonId = formData.get("lessonId") as string;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const youtubeUrl = (formData.get("youtubeUrl") as string)?.trim();
  const xpReward = parseInt(formData.get("xpReward") as string, 10) || 10;
  const isPublished = formData.get("isPublished") === "on";

  if (!lessonId || !title || !youtubeUrl) {
    throw new Error("lessonId, title, and YouTube URL are required");
  }

  const videoId = extractYouTubeId(youtubeUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  await db
    .update(lessons)
    .set({ title, description, youtubeVideoId: videoId, xpReward, isPublished, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId));

  revalidatePath(`/admin/lessons/${lessonId}`);
}

// ── Add a single question manually (FR9.1b manual flow) ──
export async function addQuestion(formData: FormData) {
  await assertAdmin();

  const lessonId = formData.get("lessonId") as string;
  const questionText = (formData.get("questionText") as string)?.trim();
  const points = parseInt(formData.get("points") as string, 10) || 1;

  if (!lessonId || !questionText) {
    throw new Error("lessonId and questionText are required");
  }

  // Parse options: optionText_0..3 and correctIndex
  const correctIndex = parseInt(formData.get("correctIndex") as string, 10);
  const optionTexts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const t = (formData.get(`optionText_${i}`) as string)?.trim();
    if (t) optionTexts.push(t);
  }

  if (optionTexts.length < 2) throw new Error("At least 2 option texts are required");
  if (correctIndex < 0 || correctIndex >= optionTexts.length) {
    throw new Error("correctIndex must be a valid option index");
  }

  // Determine next orderIndex for challenges
  const existingChallenges = await db
    .select({ orderIndex: challenges.orderIndex })
    .from(challenges)
    .where(eq(challenges.lessonId, lessonId));
  const maxIdx = existingChallenges.reduce((m, c) => Math.max(m, c.orderIndex), -1);

  const [newChallenge] = await db
    .insert(challenges)
    .values({
      lessonId,
      questionText,
      points,
      orderIndex: maxIdx + 1,
      isPublished: true,
    })
    .returning({ id: challenges.id });

  // Insert options
  await db.insert(challengeOptions).values(
    optionTexts.map((optionText, i) => ({
      challengeId: newChallenge.id,
      optionText,
      isCorrect: i === correctIndex,
      orderIndex: i,
    }))
  );

  revalidatePath(`/admin/lessons/${lessonId}`);
}

// ── Delete a challenge question ──
export async function deleteQuestion(formData: FormData) {
  await assertAdmin();

  const challengeId = formData.get("challengeId") as string;
  const lessonId = formData.get("lessonId") as string;

  if (!challengeId) throw new Error("challengeId is required");

  await db.delete(challenges).where(eq(challenges.id, challengeId));

  revalidatePath(`/admin/lessons/${lessonId}`);
}

// ── AI generation: returns questions for admin review, does NOT persist ──
// Called as a regular async function from a Client Component via a Server Action
export async function generateQuestionsAI(
  lessonId: string,
  count: number = 3
): Promise<{ questions: GeneratedQuestion[]; provider: string; error?: string }> {
  const user = await assertAdmin();

  try {
    const result = await generateQuiz({
      lessonId,
      count,
      mode: "admin",
      triggeredBy: user.id,
    });
    return { questions: result.questions, provider: result.provider };
  } catch (err: any) {
    return { questions: [], provider: "none", error: err.message };
  }
}

// ── Save AI-reviewed questions in bulk (called after admin edits them) ──
export async function saveGeneratedQuestions(
  lessonId: string,
  questions: GeneratedQuestion[]
): Promise<void> {
  await assertAdmin();

  if (!lessonId || !questions?.length) return;

  // Determine starting order_index
  const existingChallenges = await db
    .select({ orderIndex: challenges.orderIndex })
    .from(challenges)
    .where(eq(challenges.lessonId, lessonId));
  let maxIdx = existingChallenges.reduce((m, c) => Math.max(m, c.orderIndex), -1);

  for (const q of questions) {
    maxIdx += 1;
    const [newChallenge] = await db
      .insert(challenges)
      .values({
        lessonId,
        questionText: q.questionText,
        points: q.points,
        orderIndex: maxIdx,
        isPublished: true,
      })
      .returning({ id: challenges.id });

    await db.insert(challengeOptions).values(
      q.options.map((opt, i) => ({
        challengeId: newChallenge.id,
        optionText: opt.optionText,
        isCorrect: opt.isCorrect,
        orderIndex: i,
      }))
    );
  }

  revalidatePath(`/admin/lessons/${lessonId}`);
}
