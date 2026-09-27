import { db } from "@/db";
import { aiInteractions, profiles } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

// Zod schema for mascot response validation
export const MascotResponseSchema = z.object({
  message: z.string().min(1, "Response cannot be empty"),
  suggestedPose: z.enum(["idle", "celebrate", "encouraging", "empty", "waving", "thinking", "pointing"]).optional(),
});

export type MascotResponse = z.infer<typeof MascotResponseSchema>;

export interface MascotChatParams {
  userId: string;
  message: string;
  context?: {
    lessonId?: string;
    lessonTitle?: string;
    currentStreak?: number;
    xp?: number;
    recentQuizResult?: "correct" | "incorrect";
  };
  // Optional flag to simulate failures in automated tests
  simulateOpenAiFailure?: boolean;
  simulateOpenRouterFailure?: boolean;
}

export interface MascotChatResult {
  message: string;
  suggestedPose?: "idle" | "celebrate" | "encouraging" | "empty" | "waving" | "thinking" | "pointing";
  provider: "openrouter" | "openai" | "canned";
  usedFallback: boolean;
}

// Rate limit: 20 messages per hour per user
const RATE_LIMIT_PER_HOUR = 20;

// Canned fallback responses keyed by context
const CANNED_RESPONSES: Record<string, string[]> = {
  general: [
    "That's a great question! Let's keep learning together! 🎓",
    "I'm here to help you on your learning journey! 🚀",
    "You're doing great! Keep up the awesome work! ⭐",
    "Learning is an adventure, and I'm your guide! 🗺️",
    "Every question helps you grow! Keep asking! 💡",
  ],
  lesson_complete: [
    "Amazing work! You nailed that lesson! 🎉",
    "You're making incredible progress! Keep it up! 🔥",
    "That lesson is complete! You're on fire! ⚡",
    "Fantastic job! Time to celebrate! 🏆",
    "You conquered that lesson! Ready for the next challenge? 🎯",
  ],
  wrong_answer: [
    "No worries! Let's try again together! 💪",
    "That's okay! Mistakes help us learn! 🌱",
    "Don't give up! You've got this! 🌟",
    "Almost there! Let's think through it! 🤔",
    "Practice makes perfect! Try once more! 🎯",
  ],
  streak_risk: [
    "Hey! Don't break your streak! Come learn something today! 🔥",
    "Your streak is waiting! Keep it going! ⚡",
    "A quick lesson today keeps your streak alive! 🎯",
    "Don't let your streak fade away! Learn now! 🌟",
  ],
  badge_unlocked: [
    "You earned a new badge! That's awesome! 🏅",
    "Badge unlocked! You're becoming a master! 🎖️",
    "New achievement unlocked! Celebrate! 🎉",
    "You're collecting badges like a pro! 🏆",
  ],
  greeting: [
    "Welcome back! Ready to learn something new? 🎓",
    "Hey there! Let's make today count! 🚀",
    "Good to see you! Time for some learning! 📚",
    "Welcome back! Your streak is waiting! 🔥",
  ],
  loading: [
    "Loading your learning adventure... 🗺️",
    "Getting everything ready for you! ⚙️",
    "Preparing your next challenge! 🎯",
    "Almost there! Learning awaits! 🚀",
  ],
};

function getCannedResponse(context?: string): string {
  const contextKey = context || "general";
  const responses = CANNED_RESPONSES[contextKey] || CANNED_RESPONSES.general;
  return responses[Math.floor(Math.random() * responses.length)];
}

export async function mascotChat({
  userId,
  message,
  context,
  simulateOpenAiFailure = false,
  simulateOpenRouterFailure = false,
}: MascotChatParams): Promise<MascotChatResult> {
  // 1. Check rate limit
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [messageCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(aiInteractions)
    .where(
      and(
        eq(aiInteractions.triggeredBy, userId),
        gte(aiInteractions.createdAt, oneHourAgo),
        eq(aiInteractions.provider, "mascot_chat")
      )
    );

  if ((messageCount.count || 0) >= RATE_LIMIT_PER_HOUR) {
    // Rate limit exceeded - return canned response
    await logAttempt("rate_limit", false, 0, null, "Rate limit exceeded");
    return {
      message: "You've reached the chat limit for this hour. Take a break and come back later! ☕",
      suggestedPose: "encouraging",
      provider: "canned",
      usedFallback: true,
    };
  }

  // 2. Determine context for fallback
  let fallbackContext = "general";
  if (context?.recentQuizResult === "correct") fallbackContext = "lesson_complete";
  if (context?.recentQuizResult === "incorrect") fallbackContext = "wrong_answer";
  if (context?.currentStreak && context.currentStreak > 0) fallbackContext = "streak_risk";
  if (message.toLowerCase().includes("hello") || message.toLowerCase().includes("hi")) fallbackContext = "greeting";

  // 3. Build system prompt with context
  const systemPrompt = `You are a friendly LEGO learning mascot. Keep responses short (under 150 tokens), fun, and encouraging. You are helping a learner on a gamified micro-learning platform.

Current context:
${context?.lessonTitle ? `- Current lesson: ${context.lessonTitle}` : ""}
${context?.xp ? `- User XP: ${context.xp}` : ""}
${context?.currentStreak ? `- Current streak: ${context.currentStreak} days` : ""}
${context?.recentQuizResult ? `- Recent quiz result: ${context.recentQuizResult}` : ""}

You can suggest poses in your response by including phrases like:
- "celebrate" or "bounce" for celebration
- "encouraging" or "thumbs up" for encouragement
- "thinking" or "hmm" for thoughtfulness
- "pointing" or "look here" for pointing
- "waving" or "hello" for greeting
- "empty" or "sad" for sympathy

Keep the response conversational and brief. Do not include markdown code blocks.`;

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
        lessonId: context?.lessonId || null,
        triggeredBy: userId,
        provider,
        prompt: systemPrompt + "\n\nUser: " + message,
        response: response || null,
        latencyMs,
        success,
        errorMsg: errorMsg || null,
      });
    } catch (e) {
      console.error("Failed to log ai_interaction:", e);
    }
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
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const latencyMs = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || "";

      // Extract suggested pose from response
      let suggestedPose: MascotChatResult["suggestedPose"];
      const lowerContent = rawContent.toLowerCase();
      if (lowerContent.includes("celebrate") || lowerContent.includes("bounce")) suggestedPose = "celebrate";
      else if (lowerContent.includes("encourag") || lowerContent.includes("thumbs up")) suggestedPose = "encouraging";
      else if (lowerContent.includes("think") || lowerContent.includes("hmm")) suggestedPose = "thinking";
      else if (lowerContent.includes("point") || lowerContent.includes("look here")) suggestedPose = "pointing";
      else if (lowerContent.includes("wave") || lowerContent.includes("hello") || lowerContent.includes("hi")) suggestedPose = "waving";
      else if (lowerContent.includes("sad") || lowerContent.includes("sorry")) suggestedPose = "empty";

      const validated = MascotResponseSchema.parse({
        message: rawContent,
        suggestedPose,
      });

      await logAttempt("openrouter", true, latencyMs, validated);

      return {
        message: validated.message,
        suggestedPose: validated.suggestedPose,
        provider: "openrouter",
        usedFallback: false,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || "Unknown error";
      
      // Check if it's a quota/credit error
      if (errorMsg.includes("credit") || errorMsg.includes("quota") || errorMsg.includes("402")) {
        await logAttempt("openrouter", false, latencyMs, null, `OpenRouter quota/credit error: ${errorMsg}`);
        console.warn("OpenRouter quota error, using canned fallback");
      } else {
        await logAttempt("openrouter", false, latencyMs, null, errorMsg);
        console.warn("OpenRouter generation failed, proceeding to OpenAI fallback:", errorMsg);
      }
    }
  } else {
    await logAttempt("openrouter", false, 0, null, "OpenRouter key unavailable or simulated fallback");
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
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const latencyMs = Date.now() - startTime;
      const rawContent = response.choices[0]?.message?.content || "";

      // Extract suggested pose from response
      let suggestedPose: MascotChatResult["suggestedPose"];
      const lowerContent = rawContent.toLowerCase();
      if (lowerContent.includes("celebrate") || lowerContent.includes("bounce")) suggestedPose = "celebrate";
      else if (lowerContent.includes("encourag") || lowerContent.includes("thumbs up")) suggestedPose = "encouraging";
      else if (lowerContent.includes("think") || lowerContent.includes("hmm")) suggestedPose = "thinking";
      else if (lowerContent.includes("point") || lowerContent.includes("look here")) suggestedPose = "pointing";
      else if (lowerContent.includes("wave") || lowerContent.includes("hello") || lowerContent.includes("hi")) suggestedPose = "waving";
      else if (lowerContent.includes("sad") || lowerContent.includes("sorry")) suggestedPose = "empty";

      const validated = MascotResponseSchema.parse({
        message: rawContent,
        suggestedPose,
      });

      await logAttempt("openai", true, latencyMs, validated);

      return {
        message: validated.message,
        suggestedPose: validated.suggestedPose,
        provider: "openai",
        usedFallback: true,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      await logAttempt("openai", false, latencyMs, null, err.message);
      console.warn("OpenAI fallback failed:", err.message);
    }
  } else if (simulateOpenAiFailure) {
    await logAttempt("openai", false, 0, null, "Simulated OpenAI API Failure");
  }

  // ──────────────────────────────────────────────────────────
  // ATTEMPT 3: Canned Fallback (Never breaks)
  // ──────────────────────────────────────────────────────────
  const cannedMessage = getCannedResponse(fallbackContext);
  
  await logAttempt("canned", true, 5, { message: cannedMessage });

  return {
    message: cannedMessage,
    suggestedPose: fallbackContext === "wrong_answer" ? "encouraging" : 
                 fallbackContext === "lesson_complete" ? "celebrate" :
                 fallbackContext === "greeting" ? "waving" : "idle",
    provider: "canned",
    usedFallback: true,
  };
}
