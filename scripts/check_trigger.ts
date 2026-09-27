import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Check Profile Creation Trigger ===\n");

  try {
    // Check if trigger exists
    const [trigger] = await sql`
      SELECT 
        tgname as trigger_name,
        tgrelid::regclass as table_name,
        tgenabled as is_enabled
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
    `;

    if (trigger) {
      console.log("✓ Trigger exists:", trigger.trigger_name);
      console.log("  Table:", trigger.table_name);
      console.log("  Enabled:", trigger.is_enabled === 't' ? 'Yes' : 'No');
    } else {
      console.log("✗ Trigger does not exist");
    }

    // Check function
    const [func] = await sql`
      SELECT 
        proname as function_name,
        prosrc as source
      FROM pg_proc
      WHERE proname = 'handle_new_user'
    `;

    if (func) {
      console.log("\n✓ Function exists:", func.function_name);
      console.log("\nFunction source:");
      console.log(func.source);
    } else {
      console.log("\n✗ Function does not exist");
    }

    // Test trigger by checking if it would work
    console.log("\n=== Testing Trigger Logic ===");
    const testEmail = "test_trigger_check@example.com";
    console.log(`Would create profile for: ${testEmail}`);
    console.log("Display name would be: test_trigger_check");

  } catch (error) {
    console.error("Error checking trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
