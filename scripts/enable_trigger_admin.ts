import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

// Try using service role key for admin access
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY not found in .env.local");
  console.error("Please add it to enable admin operations");
  process.exit(1);
}

// Connect with service role
const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { 
  ssl: { rejectUnauthorized: false },
  prepare: false
});

async function run() {
  console.log("=== Enable Triggers with Admin Access ===\n");

  try {
    console.log("Attempting to enable on_auth_user_created trigger...");

    // Enable our custom trigger
    await sql`
      ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created
    `;

    console.log("✓ on_auth_user_created trigger enabled");

    // Enable auto-confirm trigger
    try {
      await sql`
        ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created_autoconfirm
      `;
      console.log("✓ on_auth_user_created_autoconfirm trigger enabled");
    } catch (e) {
      console.log("  (auto-confirm trigger may not exist, skipping)");
    }

    // Enable all triggers
    await sql`
      ALTER TABLE auth.users ENABLE TRIGGER ALL
    `;

    console.log("✓ All triggers on auth.users enabled");

    // Verify
    const [trigger] = await sql`
      SELECT 
        tgname as trigger_name,
        tgenabled as is_enabled
      FROM pg_trigger
      WHERE tgname = 'on_auth_user_created'
    `;

    if (trigger) {
      console.log("\n✓ Verification:");
      console.log(`  Trigger: ${trigger.trigger_name}`);
      console.log(`  Enabled: ${trigger.is_enabled === 't' ? 'Yes' : 'No'}`);
    }

  } catch (error) {
    console.error("Failed to enable triggers:", error);
    console.error("\nIf this still fails, you need to:");
    console.error("1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/vufotbwruytqvjrpyjqv");
    console.error("2. Navigate to Settings → Database");
    console.error("3. Find the triggers section and enable them via UI");
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
