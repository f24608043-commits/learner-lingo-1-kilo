import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Database-Level Friend Request Rate Limiting ===\n");

  try {
    // Drop existing trigger if it exists
    await sql`
      DROP TRIGGER IF EXISTS friend_request_rate_limit_trigger ON friendships
    `;

    console.log("✓ Dropped existing trigger (if any)");

    // Create function to check rate limit
    await sql`
      CREATE OR REPLACE FUNCTION check_friend_request_rate_limit()
      RETURNS TRIGGER AS $$
      DECLARE
        recent_count INTEGER;
        pending_count INTEGER;
      BEGIN
        -- Check recent requests in last hour (max 5)
        SELECT COUNT(*) INTO recent_count
        FROM friendships
        WHERE requester_id = NEW.requester_id
          AND status = 'pending'
          AND created_at >= NOW() - INTERVAL '1 hour';

        IF recent_count >= 5 THEN
          RAISE EXCEPTION 'Rate limit exceeded: Maximum 5 friend requests per hour';
        END IF;

        -- Check total pending requests (max 10)
        SELECT COUNT(*) INTO pending_count
        FROM friendships
        WHERE requester_id = NEW.requester_id
          AND status = 'pending';

        IF pending_count >= 10 THEN
          RAISE EXCEPTION 'Pending limit exceeded: Maximum 10 pending friend requests';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    console.log("✓ Created rate limit check function");

    // Create trigger
    await sql`
      CREATE TRIGGER friend_request_rate_limit_trigger
      BEFORE INSERT ON friendships
      FOR EACH ROW
      EXECUTE FUNCTION check_friend_request_rate_limit()
    `;

    console.log("✓ Created trigger on friendships table");

    console.log("\n=== Rate Limiting Now Enforced at Database Level ===");
    console.log("- Max 5 requests per hour per user");
    console.log("- Max 10 pending requests per user");
    console.log("- Applies to all INSERT operations, including direct DB access");

  } catch (error) {
    console.error("Failed to add rate limit trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
