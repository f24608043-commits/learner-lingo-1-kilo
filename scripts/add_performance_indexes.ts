import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Adding Performance Indexes ===\n");

  try {
    // Indexes for tutor_sessions
    console.log("Adding index: idx_tutor_sessions_tutor_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_tutor_id 
      ON tutor_sessions(tutor_id)
    `;
    console.log("✅ idx_tutor_sessions_tutor_id created");

    console.log("Adding index: idx_tutor_sessions_learner_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tutor_sessions_learner_id 
      ON tutor_sessions(learner_id)
    `;
    console.log("✅ idx_tutor_sessions_learner_id created");

    // Index for tutor_profiles
    console.log("Adding index: idx_tutor_profiles_tutor_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tutor_profiles_tutor_id 
      ON tutor_profiles(tutor_id)
    `;
    console.log("✅ idx_tutor_profiles_tutor_id created");

    // Index for session_requests
    console.log("Adding index: idx_session_requests_tutor_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_requests_tutor_id 
      ON session_requests(tutor_id)
    `;
    console.log("✅ idx_session_requests_tutor_id created");

    console.log("Adding index: idx_session_requests_learner_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_requests_learner_id 
      ON session_requests(learner_id)
    `;
    console.log("✅ idx_session_requests_learner_id created");

    // Index for user_progress
    console.log("Adding index: idx_user_progress_user_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id 
      ON user_progress(user_id)
    `;
    console.log("✅ idx_user_progress_user_id created");

    console.log("Adding index: idx_user_progress_lesson_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id 
      ON user_progress(lesson_id)
    `;
    console.log("✅ idx_user_progress_lesson_id created");

    // Index for enrollments
    console.log("Adding index: idx_enrollments_user_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_enrollments_user_id 
      ON enrollments(user_id)
    `;
    console.log("✅ idx_enrollments_user_id created");

    console.log("Adding index: idx_enrollments_course_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_enrollments_course_id 
      ON enrollments(course_id)
    `;
    console.log("✅ idx_enrollments_course_id created");

    // Index for friendships
    console.log("Adding index: idx_friendships_requester_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_friendships_requester_id 
      ON friendships(requester_id)
    `;
    console.log("✅ idx_friendships_requester_id created");

    console.log("Adding index: idx_friendships_addressee_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_friendships_addressee_id 
      ON friendships(addressee_id)
    `;
    console.log("✅ idx_friendships_addressee_id created");

    // Index for notifications
    console.log("Adding index: idx_notifications_user_id");
    await sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
      ON notifications(user_id)
    `;
    console.log("✅ idx_notifications_user_id created");

    console.log("\n=== All indexes created successfully ===");

  } catch (error) {
    console.error("Failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
