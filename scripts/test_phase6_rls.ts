import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== PHASE 6 RLS POLICY VERIFICATION ===\n");

  try {
    // Test 1: Check RLS is enabled on all tables
    console.log("[Test 1] RLS Status on Tutoring Tables");
    const tables = ["tutor_profiles", "tutor_availability", "tutor_sessions", "session_notes", "session_requests"];
    
    for (const table of tables) {
      const [result] = await sql`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = ${table}
      `;
      console.log(`${table}: RLS enabled = ${result?.relrowsecurity || false}`);
    }

    // Test 2: Check policies exist for each table
    console.log("\n[Test 2] Policy Existence Check");
    
    const policyChecks = [
      { table: "tutor_profiles", expected: ["tutors_own_profile", "admins_read_all_profiles", "public_read_active_tutors"] },
      { table: "tutor_availability", expected: ["tutors_own_availability", "admins_read_all_availability"] },
      { table: "tutor_sessions", expected: ["tutors_own_sessions", "learners_own_sessions", "admins_read_all_sessions"] },
      { table: "session_notes", expected: ["tutors_own_notes", "learners_read_shared_notes", "admins_read_all_notes"] },
      { table: "session_requests", expected: ["tutors_own_requests", "learners_own_requests", "admins_read_all_requests"] },
    ];

    for (const check of policyChecks) {
      const policies = await sql`
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = ${check.table}
      `;
      const policyNames = policies.map((p: any) => p.policyname);
      console.log(`${check.table}: ${policyNames.length} policies found`);
      console.log(`  Expected: ${check.expected.join(", ")}`);
      console.log(`  Found: ${policyNames.join(", ")}`);
    }

    // Test 3: Verify table structure
    console.log("\n[Test 3] Table Structure Verification");
    
    const tutorProfiles = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tutor_profiles'
      ORDER BY ordinal_position
    `;
    console.log("tutor_profiles columns:", tutorProfiles.map((c: any) => c.column_name));

    const sessionNotes = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session_notes'
      ORDER BY ordinal_position
    `;
    console.log("session_notes columns:", sessionNotes.map((c: any) => c.column_name));

    const sessionRequests = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'session_requests'
      ORDER BY ordinal_position
    `;
    console.log("session_requests columns:", sessionRequests.map((c: any) => c.column_name));

    // Test 4: Check enum types
    console.log("\n[Test 4] Enum Types Verification");
    
    const sessionNotesEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'session_notes_visibility'
      )
      ORDER BY enumsortorder
    `;
    console.log("session_notes_visibility values:", sessionNotesEnum.map((e: any) => e.enumlabel));

    const sessionRequestEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'session_request_status'
      )
      ORDER BY enumsortorder
    `;
    console.log("session_request_status values:", sessionRequestEnum.map((e: any) => e.enumlabel));

    console.log("\n✅ PHASE 6 RLS POLICY VERIFICATION COMPLETE");
    console.log("\nNote: Full access control testing requires actual user sessions");
    console.log("to verify that users can only access their own data.");

  } catch (error) {
    console.error("Verification failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
