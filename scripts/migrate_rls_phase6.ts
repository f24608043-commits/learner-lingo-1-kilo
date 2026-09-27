import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== IMPLEMENTING PHASE 6 RLS POLICIES ===\n");

  try {
    // Enable RLS on all tutoring tables
    const tables = [
      "tutor_profiles",
      "tutor_availability", 
      "tutor_sessions",
      "session_notes",
      "session_requests"
    ];

    for (const table of tables) {
      await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;
      console.log(`✓ RLS enabled on ${table}`);
    }

    // TUTOR_PROFILES RLS
    console.log("\n--- TUTOR_PROFILES RLS ---");
    
    // Tutors can read/write their own profile
    await sql`
      CREATE POLICY "tutors_own_profile" 
      ON tutor_profiles 
      FOR ALL 
      USING (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ tutors_own_profile policy created");

    // Admins can read all profiles
    await sql`
      CREATE POLICY "admins_read_all_profiles" 
      ON tutor_profiles 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ))
    `;
    console.log("✓ admins_read_all_profiles policy created");

    // Everyone can read active tutor profiles (for directory)
    await sql`
      CREATE POLICY "public_read_active_tutors" 
      ON tutor_profiles 
      FOR SELECT 
      USING (is_active = true)
    `;
    console.log("✓ public_read_active_tutors policy created");

    // TUTOR_AVAILABILITY RLS
    console.log("\n--- TUTOR_AVAILABILITY RLS ---");
    
    // Tutors can read/write their own availability
    await sql`
      CREATE POLICY "tutors_own_availability" 
      ON tutor_availability 
      FOR ALL 
      USING (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ tutors_own_availability policy created");

    // Admins can read all availability
    await sql`
      CREATE POLICY "admins_read_all_availability" 
      ON tutor_availability 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ))
    `;
    console.log("✓ admins_read_all_availability policy created");

    // TUTOR_SESSIONS RLS
    console.log("\n--- TUTOR_SESSIONS RLS ---");
    
    // Tutors can read/write sessions where they are the tutor
    await sql`
      CREATE POLICY "tutors_own_sessions" 
      ON tutor_sessions 
      FOR ALL 
      USING (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ tutors_own_sessions policy created");

    // Learners can read sessions where they are the learner
    await sql`
      CREATE POLICY "learners_own_sessions" 
      ON tutor_sessions 
      FOR SELECT 
      USING (learner_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ learners_own_sessions policy created");

    // Admins can read all sessions
    await sql`
      CREATE POLICY "admins_read_all_sessions" 
      ON tutor_sessions 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ))
    `;
    console.log("✓ admins_read_all_sessions policy created");

    // SESSION_NOTES RLS
    console.log("\n--- SESSION_NOTES RLS ---");
    
    // Tutors can read/write their own notes
   await sql`
      CREATE POLICY "tutors_own_notes" 
      ON session_notes 
      FOR ALL 
      USING (author_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (author_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ tutors_own_notes policy created");

    // Learners can read shared notes from their sessions
    await sql`
      CREATE POLICY "learners_read_shared_notes" 
      ON session_notes 
      FOR SELECT 
      USING (
        visibility = 'shared' AND 
        session_id IN (
          SELECT id FROM tutor_sessions 
          WHERE learner_id IN (SELECT id FROM profiles WHERE id = auth.uid())
        )
      )
    `;
    console.log("✓ learners_read_shared_notes policy created");

    // Admins can read all notes
    await sql`
      CREATE POLICY "admins_read_all_notes" 
      ON session_notes 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ))
    `;
    console.log("✓ admins_read_all_notes policy created");

    // SESSION_REQUESTS RLS
    console.log("\n--- SESSION_REQUESTS RLS ---");
    
    // Tutors can read/write requests where they are the tutor
    await sql`
      CREATE POLICY "tutors_own_requests" 
      ON session_requests 
      FOR ALL 
      USING (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (tutor_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ tutors_own_requests policy created");

    // Learners can read/write requests where they are the learner
    await sql`
      CREATE POLICY "learners_own_requests" 
      ON session_requests 
      FOR ALL 
      USING (learner_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
      WITH CHECK (learner_id IN (SELECT id FROM profiles WHERE id = auth.uid()))
    `;
    console.log("✓ learners_own_requests policy created");

    // Admins can read all requests
    await sql`
      CREATE POLICY "admins_read_all_requests" 
      ON session_requests 
      FOR SELECT 
      USING (EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
      ))
    `;
    console.log("✓ admins_read_all_requests policy created");

    console.log("\n✅ PHASE 6 RLS POLICIES IMPLEMENTED SUCCESSFULLY");

  } catch (error) {
    console.error("RLS migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
