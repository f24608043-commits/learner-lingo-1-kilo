import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AUDIT: Streak Logic Testing ===\n");

  try {
    // Get a test user
    const [testUser] = await sql`
      SELECT id, display_name, streak_count, last_active_date
      FROM profiles
      WHERE id IN (
        SELECT user_id FROM user_progress LIMIT 1
      )
      LIMIT 1
    `;

    if (!testUser) {
      console.log("No test user found with progress. Skipping streak test.");
      return;
    }

    console.log("Test User:", testUser.display_name);
    console.log("Current Streak:", testUser.streak_count);
    console.log("Last Active Date:", testUser.last_active_date);

    // Check daily activity log
    const activityLog = await sql`
      SELECT activity_date
      FROM daily_activity_log
      WHERE user_id = ${testUser.id}
      ORDER BY activity_date DESC
      LIMIT 10
    `;

    console.log("\nDaily Activity Log (last 10 days):");
    if (activityLog.length === 0) {
      console.log("No activity log entries found");
    } else {
      activityLog.forEach((log: any) => {
        console.log(`- ${log.activity_date}`);
      });
    }

    // Test streak calculation logic
    console.log("\n=== Streak Calculation Test ===");
    
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split("T")[0];

    console.log("Today:", today);
    console.log("Yesterday:", yesterday);
    console.log("Two days ago:", twoDaysAgo);

    // Simulate consecutive day activity
    console.log("\n=== Test 1: Consecutive Day Activity ===");
    if (testUser.last_active_date) {
      const lastActive = new Date(testUser.last_active_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log("Days since last active:", diffDays);
      
      if (diffDays === 1) {
        console.log("✓ Should increment streak (consecutive day)");
      } else if (diffDays === 0) {
        console.log("✓ Should maintain streak (same day)");
      } else if (diffDays > 1) {
        console.log("✓ Should reset streak to 1 (day missed)");
      }
    }

    // Test missed day scenario
    console.log("\n=== Test 2: Missed Day Scenario ===");
    console.log("To test missed day reset:");
    console.log("1. Set last_active_date to 3 days ago");
    console.log("2. Complete a lesson today");
    console.log("3. Verify streak_count resets to 1");

    console.log("\n=== Manual Test Required ===");
    console.log("For full streak testing, manual UI interaction is needed:");
    console.log("- Complete lessons on consecutive days to verify increment");
    console.log("- Skip a day then complete lesson to verify reset");

  } catch (error) {
    console.error("Streak test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
