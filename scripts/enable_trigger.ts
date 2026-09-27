import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Enable Profile Creation Trigger ===\n");

  try {
    // Enable the trigger
    await sql`
      ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created
    `;

    console.log("✓ Trigger enabled on auth.users");

    // Verify it's enabled
    const [trigger] = await sql`
      SELECT 
        tgname as trigger_name,
        tgrelid::regclass as table_name,
        tgenabled as is_enabled
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
    `;

    if (trigger) {
      console.log("\n✓ Trigger status:");
      console.log("  Name:", trigger.trigger_name);
      console.log("  Table:", trigger.table_name);
      console.log("  Enabled:", trigger.is_enabled === 't' ? 'Yes' : 'No');
    }

  } catch (error) {
    console.error("Failed to enable trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
