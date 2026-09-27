import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { generateQuiz } from "../lib/ai/generateQuiz";

const dbUrl = process.env.DATABASE_URL!;
const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== GENUINE OPENROUTER TEST (NO SIMULATION) ===\n");

  // 1. Fetch an existing lesson
  const [lesson] = await sql`SELECT id, title FROM public.lessons LIMIT 1`;
  if (!lesson) {
    console.error("No lesson found in DB");
    process.exit(1);
  }
  console.log(`Using Lesson: ${lesson.title} (${lesson.id})`);

  // 2. Call generateQuiz WITHOUT any simulation flags
  console.log("\nCalling generateQuiz with NO simulation flags...");
  console.log("OPENROUTER_API_KEY:", process.env.OPENROUTER_API_KEY ? "SET" : "NOT SET");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");

  const result = await generateQuiz({
    lessonId: lesson.id,
    count: 2,
    mode: "admin"
    // NO simulateOpenRouterFailure or simulateOpenAiFailure flags
  });

  console.log(`\nResult:`);
  console.log(`Provider: ${result.provider}`);
  console.log(`Used Fallback: ${result.usedFallback}`);
  console.log(`Questions Generated: ${result.questions.length}`);
  console.log(`First Question: "${result.questions[0].questionText}"`);

  // 3. Query the latest ai_interactions entry
  const [latestLog] = await sql`
    SELECT provider, success, error_msg, latency_ms, created_at 
    FROM public.ai_interactions 
    ORDER BY created_at DESC LIMIT 1
  `;

  console.log(`\nLatest AI Interaction Log:`);
  console.log(latestLog);

  // 4. Determine if this was a genuine OpenRouter success
  if (result.provider === 'openrouter' && result.usedFallback === false) {
    console.log("\n✅ SUCCESS: OpenRouter generated real AI questions!");
  } else if (result.provider === 'openrouter' && result.usedFallback === true) {
    console.log("\n⚠️ PARTIAL: OpenRouter worked but was marked as fallback");
  } else if (result.provider === 'openai') {
    console.log("\n⚠️ FELL THROUGH: OpenRouter failed, OpenAI was used instead");
  } else if (result.provider === 'generic') {
    console.log("\n❌ FAIL: Both providers failed, generic fallback used");
  }

  await sql.end();
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
