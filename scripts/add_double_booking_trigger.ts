import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Database-Level Double-Booking Prevention ===\n");

  try {
    // Drop existing trigger if it exists
    await sql`
      DROP TRIGGER IF EXISTS prevent_double_booking_trigger ON tutor_sessions
    `;

    console.log("✓ Dropped existing trigger (if any)");

    // Create function to check for overlapping sessions
    await sql`
      CREATE OR REPLACE FUNCTION prevent_double_booking()
      RETURNS TRIGGER AS $$
      DECLARE
        existing_session RECORD;
      BEGIN
        -- Check for overlapping confirmed sessions for the same tutor
        SELECT * INTO existing_session
        FROM tutor_sessions
        WHERE tutor_id = NEW.tutor_id
          AND status = 'confirmed'
          AND scheduled_at = NEW.scheduled_at
        LIMIT 1;

        IF existing_session IS NOT NULL THEN
          RAISE EXCEPTION 'Double-booking prevented: Tutor already has a confirmed session at this time';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    console.log("✓ Created double-booking prevention function");

    // Create trigger
    await sql`
      CREATE TRIGGER prevent_double_booking_trigger
      BEFORE INSERT ON tutor_sessions
      FOR EACH ROW
      EXECUTE FUNCTION prevent_double_booking()
    `;

    console.log("✓ Created trigger on tutor_sessions table");

    console.log("\n=== Double-Booking Prevention Now Enforced at Database Level ===");
    console.log("- Prevents overlapping confirmed sessions for same tutor");
    console.log("- Applies to all INSERT operations, including direct DB access");

  } catch (error) {
    console.error("Failed to add double-booking trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
