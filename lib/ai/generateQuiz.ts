import { db } from "@/db";
import { aiInteractions, lessons, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

// Zod schema for quiz question validation
export const QuizOptionSchema = z.object({
  optionText: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean(),
});

export const QuizQuestionSchema = z.object({
  questionText: z.string().min(3, "Question text too short"),
  points: z.number().int().positive().default(1),
  options: z
    .array(QuizOptionSchema)
    .min(2, "Must have at least 2 options")
    .max(4, "Maximum 4 options")
    .refine(
      (opts) => opts.filter((o) => o.isCorrect).length === 1,
      "Exactly one option must be marked as correct"
    ),
});

export const QuizGenerationOutputSchema = z.array(QuizQuestionSchema).min(1);

export type GeneratedQuestion = z.infer<typeof QuizQuestionSchema>;

export interface GenerateQuizParams {
  lessonId: string;
  count?: number;
  mode: "admin" | "practice";
  triggeredBy?: string;
  // Optional flag to simulate failures in automated tests
  simulateOpenAiFailure?: boolean;
  simulateOpenRouterFailure?: boolean;
}

export interface GenerateQuizResult {
  questions: GeneratedQuestion[];
  provider: "openai" | "openrouter" | "generic";
  usedFallback: boolean;
}

export async function generateQuiz({
  lessonId,
  count = 3,
  mode,
  triggeredBy,
  simulateOpenAiFailure = false,
  simulateOpenRouterFailure = false,
}: GenerateQuizParams): Promise<GenerateQuizResult> {
  // 1. Fetch lesson title + description (never transcript, per SRS 2.5)
  const [lesson] = await db
    .select({
      id: lessons.id,
      title: lessons.title,
      description: lessons.description,
    })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!lesson) {
    throw new Error(`Lesson not found for ID: ${lessonId}`);
  }

  // 2. Optional learner context for practice mode
  let learnerContext = "";
  if (mode === "practice" && triggeredBy) {
    const [userProfile] = await db
      .select({ xp: profiles.xp })
      .from(profiles)
      .where(eq(profiles.id, triggeredBy))
      .limit(1);
    if (userProfile) {
      learnerContext = ` The learner has ${userProfile.xp} XP. Adjust question difficulty appropriately for this experience level.`;
    }
  }

  const prompt = `You are an expert curriculum and educational quiz designer for a gamified micro-learning platform called LEGO.
Topic: "${lesson.title}"
Lesson Description: "${lesson.description || "Core programming concepts and syntax."}"${learnerContext}

Generate ${count} high-quality, conceptual multiple-choice quiz questions based strictly on this topic.
Requirements:
1. Return ONLY a valid JSON array of question objects (no markdown, no code fences, no extra text).
2. Each question object must have:
   - "questionText": Clear, concise question statement
   - "points": Integer point value (default 1)
   - "options": Array of exactly 4 options. Each option must have:
     - "optionText": string
     - "isCorrect": boolean (EXACTLY ONE option must have isCorrect: true)
3. Do not assume or reference video timestamps.`;

  // Helper to log every attempt into ai_interactions
  async function logAttempt(
    provider: string,
    success: boolean,
    latencyMs: number,
    response: any,
    errorMsg?: string
  ) {
    try {
      await db.insert(aiInteractions).values({
        lessonId: lesson.id,
        triggeredBy: triggeredBy || null,
        provider,
        prompt,
        response: response || null,
        latencyMs,
        success,
        errorMsg: errorMsg || null,
      });
    } catch (e) {
      console.error("Failed to log ai_interaction:", e);
    }
  }

  // Helper to strip markdown fences if present
  function cleanJsonText(raw: string): string {
    return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // ──────────────────────────────────────────────────────────
  // ATTEMPT 1: OpenRouter (Primary)
  // ──────────────────────────────────────────────────────────
  if (!simulateOpenRouterFailure && process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== "sk-or-v1-mock-fallback-key") {
    const startTime = Date.now();
    try {
      const openRouterClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      const response = await openRouterClient.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You output only valid JSON arrays of quiz questions." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const latencyMs = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || "";
      const parsed = JSON.parse(cleanJsonText(rawContent));
      const candidateArray = Array.isArray(parsed)
        ? parsed
        : parsed.questions || parsed.data || Object.values(parsed)[0];

      const validated = QuizGenerationOutputSchema.parse(candidateArray);

      await logAttempt("openrouter", true, latencyMs, validated);

      return {
        questions: validated.slice(0, count),
        provider: "openrouter",
        usedFallback: false,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      await logAttempt("openrouter", false, latencyMs, null, err.message);
      console.warn("OpenRouter generation failed, proceeding to OpenAI fallback:", err.message);
    }
  } else {
    await logAttempt("openrouter", false, 40, null, "OpenRouter key unavailable or simulated fallback");
  }

  // ──────────────────────────────────────────────────────────
  // ATTEMPT 2: OpenAI (Fallback)
  // ──────────────────────────────────────────────────────────
  if (!simulateOpenAiFailure && process.env.OPENAI_API_KEY) {
    const startTime = Date.now();
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You output only valid JSON arrays of quiz questions." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const latencyMs = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || "";
      const parsed = JSON.parse(cleanJsonText(rawContent));
      // Handle both raw array or { questions: [...] }
      const candidateArray = Array.isArray(parsed)
        ? parsed
        : parsed.questions || parsed.data || Object.values(parsed)[0];

      const validated = QuizGenerationOutputSchema.parse(candidateArray);

      await logAttempt("openai", true, latencyMs, validated);

      return {
        questions: validated.slice(0, count),
        provider: "openai",
        usedFallback: true,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      await logAttempt("openai", false, latencyMs, null, err.message);
      console.warn("OpenAI fallback failed:", err.message);
    }
  } else if (simulateOpenAiFailure) {
    await logAttempt("openai", false, 50, null, "Simulated OpenAI API Failure");
  }

  // ──────────────────────────────────────────────────────────
  // ATTEMPT 3: Generic Hardcoded Fallback (Per NFR4, never breaks)
  // ──────────────────────────────────────────────────────────
  const genericFallback: GeneratedQuestion[] = [
    {
      questionText: `What is the primary topic covered in "${lesson.title}"?`,
      points: 1,
      options: [
        { optionText: `Understanding key concepts of ${lesson.title}`, isCorrect: true },
        { optionText: "Writing unrelated low-level drivers", isCorrect: false },
        { optionText: "Configuring hardware servers", isCorrect: false },
        { optionText: "Deploying operating system kernels", isCorrect: false },
      ],
    },
    {
      questionText: `Which of the following best describes the goal of "${lesson.title}"?`,
      points: 1,
      options: [
        { optionText: "To build practical understanding through concise examples", isCorrect: true },
        { optionText: "To bypass learning and skip ahead", isCorrect: false },
        { optionText: "To memorize arbitrary numbers", isCorrect: false },
        { optionText: "To delete existing files", isCorrect: false },
      ],
    },
    {
      questionText: `How should a developer apply the lessons from "${lesson.title}"?`,
      points: 1,
      options: [
        { optionText: "By writing code and verifying the results interactively", isCorrect: true },
        { optionText: "By avoiding all testing", isCorrect: false },
        { optionText: "By guessing syntax blindly", isCorrect: false },
        { optionText: "By ignoring runtime error messages", isCorrect: false },
      ],
    },
  ];

  await logAttempt("generic", true, 5, genericFallback);

  return {
    questions: genericFallback.slice(0, count),
    provider: "generic",
    usedFallback: true,
  };
}
