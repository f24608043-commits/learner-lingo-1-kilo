import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Database-Level Friend Request Rate Limiting ===\n");

  try {
    // Drop existing trigger first
    await sql`
      DROP TRIGGER IF EXISTS friend_request_rate_limit_trigger ON friendships
    `;
    console.log("✓ Dropped existing trigger (if any)");

    // Drop existing function if any
    await sql`
      DROP FUNCTION IF EXISTS check_friend_request_rate_limit()
    `;
    console.log("✓ Dropped existing function (if any)");

    // Create function to check rate limits
    await sql`
      CREATE OR REPLACE FUNCTION check_friend_request_rate_limit()
      RETURNS TRIGGER AS $$
      DECLARE
        pending_count INTEGER;
        recent_count INTEGER;
      BEGIN
        -- Check 10-pending cap
        SELECT COUNT(*) INTO pending_count
        FROM friendships
        WHERE requester_id = NEW.requester_id
        AND status = 'pending';

        IF pending_count >= 10 THEN
          RAISE EXCEPTION 'Rate limit exceeded: Maximum 10 pending friend requests';
        END IF;

        -- Check 5-per-hour cap
        SELECT COUNT(*) INTO recent_count
        FROM friendships
        WHERE requester_id = NEW.requester_id
        AND status = 'pending'
        AND created_at >= NOW() - INTERVAL '1 hour';

        IF recent_count >= 5 THEN
          RAISE EXCEPTION 'Rate limit exceeded: Maximum 5 friend requests per hour';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    console.log("✓ Created check_friend_request_rate_limit() function");

    // Drop existing trigger if any
    await sql`
      DROP TRIGGER IF EXISTS friend_request_rate_limit_trigger ON friendships
    `;
    console.log("✓ Dropped existing trigger (if any)");

    // Create trigger
    await sql`
      CREATE TRIGGER friend_request_rate_limit_trigger
      BEFORE INSERT ON friendships
      FOR EACH ROW
      WHEN (NEW.status = 'pending')
      EXECUTE FUNCTION check_friend_request_rate_limit()
    `;

    console.log("✓ Created trigger on friendships table");

    console.log("\n=== Database-Level Rate Limiting Enabled ===");
    console.log("- 10-pending cap enforced at database level");
    console.log("- 5-per-hour cap enforced at database level");
    console.log("- Applies to all INSERT operations, not just app layer");

  } catch (error) {
    console.error("Failed to add rate limiting:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
