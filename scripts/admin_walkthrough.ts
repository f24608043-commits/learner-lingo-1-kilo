import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { extractYouTubeId } from "../utils/youtube";
import { generateQuiz } from "../lib/ai/generateQuiz";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== ADMIN END-TO-END WALKTHROUGH ===");

  // 1. Get an existing unit
  const [unit] = await sql`SELECT id, title FROM public.units LIMIT 1`;
  console.log(`Target Unit: "${unit.title}" (${unit.id})`);

  // 2. Simulate Admin inputs: YouTube URL (FR9.1a)
  const inputUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const parsedVideoId = extractYouTubeId(inputUrl);
  console.log(`Pasted URL: ${inputUrl} -> Parsed YouTube ID: ${parsedVideoId}`);

  // Clean up any previous test run lesson
  await sql`DELETE FROM public.lessons WHERE unit_id = ${unit.id} AND order_index = 99`;

  // Create new lesson in draft mode (is_published = false)
  const [newLesson] = await sql`
    INSERT INTO public.lessons (unit_id, title, description, youtube_video_id, order_index, xp_reward, is_published)
    VALUES (${unit.id}, 'Admin E2E Walkthrough Lesson', 'Demonstrating full authoring flow', ${parsedVideoId}, 99, 15, false)
    RETURNING id, title, is_published;
  `;
  console.log(`Created Lesson: "${newLesson.title}" (${newLesson.id}), Published: ${newLesson.is_published}`);

  // 3. Generate Questions with AI (or fallback) (FR9.1b)
  console.log("Generating questions via AI generator...");
  const aiResult = await generateQuiz({
    lessonId: newLesson.id,
    count: 2,
    mode: "admin"
  });
  console.log(`AI Provider used: ${aiResult.provider}, Generated: ${aiResult.questions.length} questions`);

  // 4. Admin Edits the questions before saving (never saved raw without review)
  const reviewedQuestions = aiResult.questions.map((q, idx) => ({
    ...q,
    questionText: `[Admin Reviewed] ${q.questionText}`,
    points: 2
  }));
  console.log(`Admin edited ${reviewedQuestions.length} questions (added review prefix, set points to 2).`);

  // 5. Admin Saves Questions to DB
  for (let i = 0; i < reviewedQuestions.length; i++) {
    const q = reviewedQuestions[i];
    const [challenge] = await sql`
      INSERT INTO public.challenges (lesson_id, question_text, points, order_index, is_published)
      VALUES (${newLesson.id}, ${q.questionText}, ${q.points}, ${i}, true)
      RETURNING id, question_text;
    `;
    for (let j = 0; j < q.options.length; j++) {
      const opt = q.options[j];
      await sql`
        INSERT INTO public.challenge_options (challenge_id, option_text, is_correct, order_index)
        VALUES (${challenge.id}, ${opt.optionText}, ${opt.isCorrect}, ${j})
      `;
    }
  }

  // 6. Admin Publishes the Lesson (FR9.1c)
  await sql`UPDATE public.lessons SET is_published = true WHERE id = ${newLesson.id}`;
  console.log(`Lesson published: true`);

  // 7. Verify Real DB Rows
  const [publishedLesson] = await sql`
    SELECT id, title, youtube_video_id, is_published 
    FROM public.lessons WHERE id = ${newLesson.id}
  `;
  const savedChallenges = await sql`
    SELECT id, question_text, points 
    FROM public.challenges WHERE lesson_id = ${newLesson.id}
  `;
  const challengeIds = savedChallenges.map(c => c.id);
  const savedOptions = await sql`
    SELECT challenge_id, option_text, is_correct 
    FROM public.challenge_options WHERE challenge_id IN ${sql(challengeIds)}
  `;

  console.log("\n=== REAL DB ROWS CONFIRMED ===");
  console.log("Lesson Row:", publishedLesson);
  console.log("Challenges Rows:", savedChallenges);
  console.log(`Challenge Options Count: ${savedOptions.length} (Sample: ${JSON.stringify(savedOptions[0])})`);

  // Clean up test lesson & challenges
  await sql`DELETE FROM public.lessons WHERE id = ${newLesson.id}`;
  console.log("\nCleaned up test lesson cleanly.");

  await sql.end();
  process.exit(0);
}

run().catch(e => {
  console.error("Admin walkthrough error:", e);
  process.exit(1);
});
