import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AUDIT: RLS Policies for New Tables ===\n");

  try {
    const newTables = ["session_notes", "session_requests", "tutor_profiles"];

    for (const table of newTables) {
      console.log(`--- ${table} ---`);
      
      // Check RLS status
      const [rlsStatus] = await sql`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = ${table}
      `;
      
      console.log(`RLS enabled: ${rlsStatus?.relrowsecurity || false}`);

      // Get policies
      const policies = await sql`
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = ${table}
      `;
      
      console.log(`Policies found: ${policies.length}`);
      policies.forEach((policy: any) => {
        console.log(`- ${policy.policyname} (${policy.cmd})`);
      });

      if (policies.length === 0) {
        console.log("⚠️ WARNING: No RLS policies found for this table");
      }

      console.log("");
    }

  } catch (error) {
    console.error("RLS audit failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
