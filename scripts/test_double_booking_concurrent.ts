import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { randomUUID } from "crypto";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== LIVE TEST: Double-Booking Concurrency ===\n");

  try {
    // Get a user to make a tutor
    const [user] = await sql`
      SELECT id, display_name
      FROM profiles
      LIMIT 1
    `;

    if (!user) {
      console.log("No users found. Cannot create tutor profile.");
      return;
    }

    console.log("Creating tutor profile for:", user.display_name);

    // Create tutor profile
    const tutorProfileId = randomUUID();
    await sql`
      INSERT INTO tutor_profiles (id, tutor_id, bio, hourly_rate, timezone, is_active)
      VALUES (
        ${tutorProfileId},
        ${user.id},
        'Test tutor for concurrency testing',
        50,
        'America/New_York',
        true
      )
    `;

    console.log("✓ Created tutor profile");

    // Create availability slot
    const tomorrow = new Date(Date.now() + 86400000);
    const slotDate = tomorrow.toISOString().split("T")[0];
    const startTime = "14:00";
    const endTime = "15:00";

    await sql`
      INSERT INTO tutor_availability (tutor_id, day_of_week, start_time, end_time)
      VALUES (${user.id}, ${tomorrow.getDay()}, ${startTime}, ${endTime})
    `;

    console.log(`✓ Created availability slot: ${slotDate} ${startTime}-${endTime}`);

    // Get a learner
    const [learner] = await sql`
      SELECT id, display_name
      FROM profiles
      WHERE id != ${user.id}
      LIMIT 1
    `;

    if (!learner) {
      console.log("No learner found. Cannot test booking.");
      return;
    }

    console.log("Learner:", learner.display_name);

    // Test concurrent booking requests
    console.log("\n=== Testing Concurrent Booking Requests ===");
    console.log("Firing 2 concurrent requests for the same slot...");

    const scheduledTime = `${slotDate}T${startTime}:00`;

    const bookingPromises = [
      sql`
        INSERT INTO tutor_sessions (id, tutor_id, learner_id, scheduled_at, status, jitsi_room_id)
        VALUES (
          ${randomUUID()},
          ${user.id},
          ${learner.id},
          ${scheduledTime}::timestamp with time zone,
          'confirmed',
          ${randomUUID()}
        )
        RETURNING id
      `,
      sql`
        INSERT INTO tutor_sessions (id, tutor_id, learner_id, scheduled_at, status, jitsi_room_id)
        VALUES (
          ${randomUUID()},
          ${user.id},
          ${learner.id},
          ${scheduledTime}::timestamp with time zone,
          'confirmed',
          ${randomUUID()}
        )
        RETURNING id
      `
    ];

    const results = await Promise.allSettled(bookingPromises);

    console.log("\n=== Results ===");
    let successCount = 0;
    let failCount = 0;

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successCount++;
        console.log(`✓ Request ${index + 1} succeeded - Session ID: ${result.value[0]?.id}`);
      } else {
        failCount++;
        console.log(`✗ Request ${index + 1} failed - ${result.reason.message}`);
      }
    });

    console.log(`\nSuccess: ${successCount}, Failed: ${failCount}`);

    if (successCount === 1 && failCount === 1) {
      console.log("✓ PASS: Exactly one booking succeeded, one failed (double-booking prevented)");
    } else if (successCount === 2) {
      console.log("✗ FAIL: Both bookings succeeded (double-booking NOT prevented)");
    } else if (failCount === 2) {
      console.log("✗ FAIL: Both bookings failed (unexpected)");
    }

    // Check actual sessions created
    const [sessionCount] = await sql`
      SELECT COUNT(*) as count
      FROM tutor_sessions
      WHERE tutor_id = ${user.id} AND scheduled_at = ${scheduledTime}::timestamp with time zone
    `;

    console.log(`Actual sessions in DB for this slot: ${sessionCount.count}`);

    // Cleanup
    await sql`
      DELETE FROM tutor_sessions
      WHERE tutor_id = ${user.id}
    `;

    await sql`
      DELETE FROM tutor_availability
      WHERE tutor_id = ${user.id}
    `;

    await sql`
      DELETE FROM tutor_profiles
      WHERE tutor_id = ${user.id}
    `;

    console.log("\n✓ Cleaned up test data");

  } catch (error) {
    console.error("Double-booking concurrency test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
