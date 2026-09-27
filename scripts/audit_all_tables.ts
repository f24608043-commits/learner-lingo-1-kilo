import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AUDIT: All Database Tables ===\n");

  try {
    // Query all tables
    const allTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`Total tables: ${allTables.length}\n`);
    console.log("All tables:");
    allTables.forEach((table: any, index: number) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

    // Identify new tables from 17 baseline
    console.log("\n=== Table Count Analysis ===");
    console.log("Baseline (Phase 0-4): 17 tables");
    console.log("Current count:", allTables.length);
    console.log("New tables:", allTables.length - 17);

    if (allTables.length > 17) {
      console.log("\n=== New Tables (since baseline) ===");
      const baselineTables = [
        "profiles",
        "courses",
        "units",
        "lessons",
        "challenges",
        "challenge_options",
        "user_progress",
        "enrollments",
        "badges",
        "user_badges",
        "ai_interactions",
        "daily_activity_log",
        "friendships",
        "friend_streaks",
        "library_views",
        "notifications",
        "tutor_availability",
        "tutor_sessions"
      ];

      const newTables = allTables.filter((t: any) => !baselineTables.includes(t.table_name));
      
      newTables.forEach((table: any) => {
        console.log(`- ${table.table_name}`);
      });
    }

  } catch (error) {
    console.error("Audit failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
