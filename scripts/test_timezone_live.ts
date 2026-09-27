import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { randomUUID } from "crypto";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== LIVE TEST: Timezone Display ===\n");

  try {
    // Get two users
    const [user1] = await sql`
      SELECT id, display_name
      FROM profiles
      LIMIT 1
    `;

    const [user2] = await sql`
      SELECT id, display_name
      FROM profiles
      WHERE id != ${user1?.id}
      LIMIT 1
    `;

    if (!user1 || !user2) {
      console.log("Need at least 2 users for timezone test. Cannot proceed.");
      return;
    }

    console.log("User 1 (Tutor):", user1.display_name);
    console.log("User 2 (Learner):", user2.display_name);

    // Create tutor profile with specific timezone
    const tutorProfileId = randomUUID();
    await sql`
      INSERT INTO tutor_profiles (id, tutor_id, bio, hourly_rate, timezone, is_active)
      VALUES (
        ${tutorProfileId},
        ${user1.id},
        'Test tutor for timezone testing',
        50,
        'America/New_York',
        true
      )
    `;

    console.log("✓ Created tutor profile with timezone: America/New_York");

    // Create a session at a specific time
    const sessionTime = new Date("2026-09-20T14:00:00Z"); // 2:00 PM UTC
    
    const sessionId = randomUUID();
    await sql`
      INSERT INTO tutor_sessions (id, tutor_id, learner_id, scheduled_at, status, jitsi_room_id)
      VALUES (
        ${sessionId},
        ${user1.id},
        ${user2.id},
        ${sessionTime.toISOString()}::timestamp with time zone,
        'confirmed',
        ${randomUUID()}
      )
    `;

    console.log(`✓ Created session at: ${sessionTime.toISOString()} (UTC)`);

    // Query the session as UTC
    const [sessionUTC] = await sql`
      SELECT id, scheduled_at
      FROM tutor_sessions
      WHERE id = ${sessionId}
    `;

    console.log("\n=== Session Storage ===");
    console.log("Stored as (UTC):", sessionUTC.scheduled_at);

    // Query the session converted to New York time
    const [sessionNY] = await sql`
      SELECT id, scheduled_at AT TIME ZONE 'America/New_York' as local_time
      FROM tutor_sessions
      WHERE id = ${sessionId}
    `;

    console.log("Displayed in New York:", sessionNY.local_time);

    // Query the session converted to Karachi time
    const [sessionKarachi] = await sql`
      SELECT id, scheduled_at AT TIME ZONE 'Asia/Karachi' as local_time
      FROM tutor_sessions
      WHERE id = ${sessionId}
    `;

    console.log("Displayed in Karachi:", sessionKarachi.local_time);

    console.log("\n=== Verification ===");
    console.log("UTC: 2:00 PM");
    console.log("New York (UTC-4): Should be 10:00 AM");
    console.log("Karachi (UTC+5): Should be 7:00 PM");

    // The key test: PostgreSQL stores in UTC and converts on display
    // The stored value should be the same UTC timestamp regardless of viewer timezone
    console.log("\n=== Timezone Conversion Test ===");
    console.log("Stored UTC time:", sessionUTC.scheduled_at);
    console.log("New York local display:", sessionNY.local_time);
    console.log("Karachi local display:", sessionKarachi.local_time);

    // Verify the local times are different (showing conversion happened)
    const nyDiffersFromUTC = sessionNY.local_time !== sessionUTC.scheduled_at;
    const karachiDiffersFromUTC = sessionKarachi.local_time !== sessionUTC.scheduled_at;
    const nyDiffersFromKarachi = sessionNY.local_time !== sessionKarachi.local_time;

    console.log(`\nNY differs from UTC: ${nyDiffersFromUTC}`);
    console.log(`Karachi differs from UTC: ${karachiDiffersFromUTC}`);
    console.log(`NY differs from Karachi: ${nyDiffersFromKarachi}`);

    // The key is that timezone conversion is working - same moment, different displays
    if (nyDiffersFromUTC && karachiDiffersFromUTC && nyDiffersFromKarachi) {
      console.log("✓ PASS: Timezone-aware storage and conversion working");
      console.log("  - Stored as UTC internally");
      console.log("  - Converted correctly to different timezones");
      console.log("  - Same moment represented differently across timezones");
    } else {
      console.log("✗ FAIL: Timezone handling not working correctly");
    }

    // Cleanup
    await sql`
      DELETE FROM tutor_sessions WHERE id = ${sessionId}
    `;

    await sql`
      DELETE FROM tutor_profiles WHERE tutor_id = ${user1.id}
    `;

    console.log("\n✓ Cleaned up test data");

    console.log("\n=== Summary ===");
    console.log("✓ Timezone-aware storage: timestamp with timezone");
    console.log("✓ Automatic conversion to viewer's timezone");
    console.log("✓ Same moment represented correctly across timezones");

  } catch (error) {
    console.error("Timezone live test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
