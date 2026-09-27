import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Unique Constraint for Double-Booking Prevention ===\n");

  try {
    // Drop the trigger (it's not effective for true concurrency)
    await sql`
      DROP TRIGGER IF EXISTS prevent_double_booking_trigger ON tutor_sessions
    `;

    await sql`
      DROP FUNCTION IF EXISTS prevent_double_booking()
    `;

    console.log("✓ Removed ineffective trigger");

    // Add unique constraint on (tutor_id, scheduled_at) for confirmed sessions
    // Using a partial index to only enforce for confirmed status
    await sql`
      CREATE UNIQUE INDEX tutor_sessions_no_double_booking
      ON tutor_sessions (tutor_id, scheduled_at)
      WHERE status = 'confirmed'
    `;

    console.log("✓ Added unique constraint on (tutor_id, scheduled_at) for confirmed sessions");
    console.log("  This prevents double-booking at the database level regardless of concurrency");

    console.log("\n=== Double-Booking Prevention Now Enforced ===");
    console.log("- Unique constraint on tutor_sessions(tutor_id, scheduled_at)");
    console.log("- Only applies to confirmed sessions");
    console.log("- Prevents any duplicate bookings for same tutor at same time");

  } catch (error) {
    console.error("Failed to add unique constraint:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
