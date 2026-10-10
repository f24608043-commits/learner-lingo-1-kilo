import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
  max: 1,
  connect_timeout: 15,
});

/**
 * Adds the core tables that power real-time features to the Supabase Realtime
 * publication (`supabase_realtime`).
 *
 * Without this, `postgres_changes` subscriptions on `friendships`,
 * `tutor_sessions`, `session_requests`, `notifications` and `profiles` connect
 * but never fire, so friend requests, session status changes, and social
 * activity only appear after a manual page reload.
 */
const TABLES_TO_PUBLISH = [
  "friendships",
  "tutor_sessions",
  "session_requests",
  "notifications",
  "profiles",
];

/** Tables where clients need the full old row on UPDATE/DELETE events. */
const FULL_REPLICA_IDENTITY = [
  "friendships",
  "tutor_sessions",
  "session_requests",
  "notifications",
];

async function run() {
  console.log("=== Enable Supabase Realtime publication ===\n");

  try {
    const [who] = await sql`SELECT current_user AS user, current_setting('role') AS role`;
    console.log(`Connected as: ${who?.user ?? "?"}`);

    for (const table of TABLES_TO_PUBLISH) {
      try {
        await sql`ALTER PUBLICATION supabase_realtime ADD TABLE public.${sql(table)}`;
        console.log(`✅ Added ${table} to supabase_realtime publication`);
      } catch (error: any) {
        if (/already a member of publication/i.test(error.message)) {
          console.log(`ℹ️  ${table} is already in supabase_realtime publication`);
        } else {
          throw error;
        }
      }
    }

    for (const table of FULL_REPLICA_IDENTITY) {
      try {
        await sql`ALTER TABLE public.${sql(table)} REPLICA IDENTITY FULL`;
        console.log(`✅ Set REPLICA IDENTITY FULL on ${table}`);
      } catch (error: any) {
        console.warn(`⚠️  Could not set REPLICA IDENTITY FULL on ${table}: ${error.message}`);
      }
    }

    const published = await sql`SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' ORDER BY tablename`;
    console.log("\nRealtime tables now published:");
    for (const row of published) {
      console.log(`  - ${row.tablename}`);
    }
  } catch (error) {
    console.error("\nFailed. Supabase may require this to be run from the SQL Editor");
    console.error("(Dashboard → Database → Realtime → Publications) instead:", error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});