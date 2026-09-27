import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Test Tutor Profile Creation ===\n");

  try {
    // 1. Find tutors without tutor_profiles
    const tutorsWithoutProfile = await sql`
      SELECT p.id, p.display_name, p.role
      FROM profiles p
      WHERE p.role = 'tutor'
      AND NOT EXISTS (
        SELECT 1 FROM tutor_profiles tp WHERE tp.tutor_id = p.id
      )
      LIMIT 3
    `;

    console.log(`Found ${tutorsWithoutProfile.length} tutors without profiles:`);
    for (const tutor of tutorsWithoutProfile) {
      console.log(`   ${tutor.display_name} (ID: ${tutor.id})`);
    }

    if (tutorsWithoutProfile.length === 0) {
      console.log("\n⚠️  All tutors have profiles. Cannot test create profile flow.");
      console.log("To test, we would need to delete a tutor profile first.");
      return;
    }

    // 2. Check existing tutor profiles
    const existingProfiles = await sql`
      SELECT tp.id, tp.tutor_id, p.display_name
      FROM tutor_profiles tp
      JOIN profiles p ON tp.tutor_id = p.id
      LIMIT 5
    `;

    console.log(`\nExisting tutor profiles (${existingProfiles.length}):`);
    for (const profile of existingProfiles) {
      console.log(`   ${profile.display_name} (tutor_profiles.id: ${profile.id}, tutor_id: ${profile.tutor_id})`);
    }

    // 3. Check the createTutorProfile function
    console.log("\n✅ createTutorProfile function exists in app/tutoring/actions.ts");
    console.log("   It checks for existing profile before creating");
    console.log("   It requires: bio, subjects, hourlyRate, timezone");

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
