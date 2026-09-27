import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== TEST: Library Views Isolation ===\n");

  try {
    // Get a test user
    const [testUser] = await sql`
      SELECT id, display_name
      FROM profiles
      WHERE id IN (
        SELECT user_id FROM user_progress LIMIT 1
      )
      LIMIT 1
    `;

    if (!testUser) {
      console.log("No test user found. Skipping isolation test.");
      return;
    }

    console.log("Test User:", testUser.display_name);

    // Get a lesson from user_progress
    const [existingProgress] = await sql`
      SELECT lesson_id, status, score
      FROM user_progress
      WHERE user_id = ${testUser.id}
      LIMIT 1
    `;

    if (!existingProgress) {
      console.log("No existing user progress found. Creating test scenario...");
      
      // Get any lesson
      const [testLesson] = await sql`
        SELECT id, title
        FROM lessons
        LIMIT 1
      `;

      if (!testLesson) {
        console.log("No lessons found. Cannot test isolation.");
        return;
      }

      console.log("Test Lesson:", testLesson.title);
      console.log("Lesson ID:", testLesson.id);

      // Record a library view
      await sql`
        INSERT INTO library_views (user_id, lesson_id, viewed_at)
        VALUES (${testUser.id}, ${testLesson.id}, NOW())
      `;

      console.log("✓ Library view recorded");

      // Check if user_progress was affected
      const [progressCheck] = await sql`
        SELECT status, score
        FROM user_progress
        WHERE user_id = ${testUser.id} AND lesson_id = ${testLesson.id}
      `;

      if (progressCheck) {
        console.log("✗ FAIL: user_progress was affected by library view!");
        console.log("  Status:", progressCheck.status);
        console.log("  Score:", progressCheck.score);
      } else {
        console.log("✓ PASS: user_progress not affected by library view");
      }

    } else {
      console.log("Existing Progress Found:");
      console.log("  Lesson ID:", existingProgress.lesson_id);
      console.log("  Status:", existingProgress.status);
      console.log("  Score:", existingProgress.score);

      // Record a library view for the same lesson
      await sql`
        INSERT INTO library_views (user_id, lesson_id, viewed_at)
        VALUES (${testUser.id}, ${existingProgress.lesson_id}, NOW())
      `;

      console.log("✓ Library view recorded for same lesson");

      // Check if user_progress was affected
      const [progressCheck] = await sql`
        SELECT status, score
        FROM user_progress
        WHERE user_id = ${testUser.id} AND lesson_id = ${existingProgress.lesson_id}
      `;

      if (progressCheck.status === existingProgress.status && 
          progressCheck.score === existingProgress.score) {
        console.log("✓ PASS: user_progress unchanged after library view");
      } else {
        console.log("✗ FAIL: user_progress was affected by library view!");
        console.log("  Before - Status:", existingProgress.status, "Score:", existingProgress.score);
        console.log("  After - Status:", progressCheck.status, "Score:", progressCheck.score);
      }
    }

    // Show library_views count
    const [viewCount] = await sql`
      SELECT COUNT(*) as count
      FROM library_views
      WHERE user_id = ${testUser.id}
    `;

    console.log("\nTotal library views for user:", viewCount.count);

  } catch (error) {
    console.error("Isolation test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
