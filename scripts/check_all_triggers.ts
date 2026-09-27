import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Check All Triggers on auth.users ===\n");

  try {
    // Query all triggers on auth.users
    const triggers = await sql`
      SELECT 
        t.tgname as trigger_name,
        t.tgrelid::regclass as table_name,
        t.tgenabled as is_enabled,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_proc p ON t.tgfoid = p.oid
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users'
    `;

    console.log(`Found ${triggers.length} trigger(s) on auth.users:\n`);

    for (const trigger of triggers) {
      console.log(`Trigger: ${trigger.trigger_name}`);
      console.log(`  Function: ${trigger.function_name}`);
      console.log(`  Enabled: ${trigger.is_enabled === 't' ? 'Yes' : 'No'}`);
      console.log();
    }

    // Also check for any constraints on profiles that might cause issues
    console.log("=== Checking profiles table constraints ===\n");
    const constraints = await sql`
      SELECT 
        conname as constraint_name,
        contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'public.profiles'::regclass
    `;

    console.log(`Found ${constraints.length} constraint(s) on profiles:\n`);
    for (const constraint of constraints) {
      console.log(`  ${constraint.constraint_name} (${constraint.constraint_type})`);
    }

  } catch (error) {
    console.error("Error checking triggers:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
