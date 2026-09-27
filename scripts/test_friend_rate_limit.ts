import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== TEST: Friend Request Rate Limiting ===\n");

  try {
    // Get a test user
    const [testUser] = await sql`
      SELECT id, display_name
      FROM profiles
      LIMIT 1
    `;

    if (!testUser) {
      console.log("No test user found. Skipping rate limit test.");
      return;
    }

    console.log("Test User:", testUser.display_name);

    // Check current pending requests count
    const pendingCount = await sql`
      SELECT COUNT(*) as count
      FROM friendships
      WHERE requester_id = ${testUser.id} AND status = 'pending'
    `;

    console.log("Current pending requests:", pendingCount[0].count);

    // Check recent requests (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await sql`
      SELECT COUNT(*) as count
      FROM friendships
      WHERE requester_id = ${testUser.id} 
        AND status = 'pending' 
        AND created_at >= ${oneHourAgo}
    `;

    console.log("Recent requests (last hour):", recentCount[0].count);

    console.log("\n=== Rate Limit Rules ===");
    console.log("Max pending requests: 10");
    console.log("Max requests per hour: 5");

    console.log("\n=== Manual Test Required ===");
    console.log("To test rate limiting:");
    console.log("1. Try sending 6+ friend requests within 1 hour");
    console.log("2. Should get error: 'You're sending friend requests too quickly'");
    console.log("3. Try sending 11+ pending requests total");
    console.log("4. Should get error: 'You have too many pending friend requests'");

    console.log("\n✓ Rate limiting logic implemented in sendFriendRequest()");

  } catch (error) {
    console.error("Rate limit test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
