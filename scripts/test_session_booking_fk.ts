import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Test Session Booking FK ===\n");

  try {
    // 1. Get a real tutor profile
    const tutorProfile = await sql`
      SELECT tp.id, tp.tutor_id, p.display_name
      FROM tutor_profiles tp
      JOIN profiles p ON tp.tutor_id = p.id
      WHERE tp.is_active = true
      LIMIT 1
    `;

    if (tutorProfile.length === 0) {
      console.log("❌ No active tutor profiles found");
      return;
    }

    const tutor = tutorProfile[0];
    console.log("✅ Found tutor:");
    console.log(`   tutor_profiles.id: ${tutor.id}`);
    console.log(`   tutor_profiles.tutor_id (profiles.id): ${tutor.tutor_id}`);
    console.log(`   profiles.display_name: ${tutor.display_name}\n`);

    // 2. Get a real learner
    const learner = await sql`
      SELECT id, display_name
      FROM profiles
      WHERE role = 'learner'
      LIMIT 1
    `;

    if (learner.length === 0) {
      console.log("❌ No learner profiles found");
      return;
    }

    const learnerProfile = learner[0];
    console.log("✅ Found learner:");
    console.log(`   profiles.id: ${learnerProfile.id}`);
    console.log(`   profiles.display_name: ${learnerProfile.display_name}\n`);

    // 3. Verify the tutor_id exists in profiles table
    const tutorExists = await sql`
      SELECT id FROM profiles WHERE id = ${tutor.tutor_id}
    `;

    if (tutorExists.length === 0) {
      console.log(`❌ FK ISSUE: tutor_id ${tutor.tutor_id} does NOT exist in profiles table`);
    } else {
      console.log(`✅ FK OK: tutor_id ${tutor.tutor_id} exists in profiles table`);
    }

    // 4. Check what getTutors() would return
    const getTutorsResult = await sql`
      SELECT 
        tp.id as tutor_profile_id,
        tp.tutor_id,
        p.id as profile_id,
        p.display_name
      FROM tutor_profiles tp
      JOIN profiles p ON tp.tutor_id = p.id
      WHERE tp.is_active = true
      LIMIT 1
    `;

    console.log("\n✅ getTutors() query result:");
    console.log(`   tutor_profiles.id: ${getTutorsResult[0].tutor_profile_id}`);
    console.log(`   tutor_profiles.tutor_id: ${getTutorsResult[0].tutor_id}`);
    console.log(`   profiles.id: ${getTutorsResult[0].profile_id}`);
    console.log(`   These should match: ${getTutorsResult[0].tutor_id === getTutorsResult[0].profile_id ? '✅ YES' : '❌ NO'}\n`);

    // 5. Try to insert a session request using the tutor_id from getTutors()
    console.log("Attempting to insert session request...");
    try {
      const [inserted] = await sql`
        INSERT INTO session_requests (learner_id, tutor_id, requested_slots, status, message)
        VALUES (
          ${learnerProfile.id},
          ${tutor.tutor_id},
          ${JSON.stringify([{ date: new Date().toISOString().split('T')[0], startTime: "10:00", endTime: "11:00" }])},
          'pending',
          'Test booking'
        )
        RETURNING *
      `;

      console.log("✅ Session request inserted successfully:");
      console.log(`   ID: ${inserted.id}`);
      console.log(`   learner_id: ${inserted.learner_id}`);
      console.log(`   tutor_id: ${inserted.tutor_id}`);
      console.log(`   status: ${inserted.status}\n`);

      // Clean up
      await sql`DELETE FROM session_requests WHERE id = ${inserted.id}`;
      console.log("✅ Cleaned up test session request");

    } catch (error: any) {
      console.log(`❌ FK VIOLATION: ${error.message}`);
      console.log(`   This means tutor_id ${tutor.tutor_id} is not a valid profiles.id`);
    }

  } catch (error) {
    console.error("Failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
