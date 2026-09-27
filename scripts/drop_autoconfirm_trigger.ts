import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Drop Auto-Confirm Trigger ===\n");

  try {
    // Drop the auto-confirm trigger
    await sql`
      DROP TRIGGER IF EXISTS on_auth_user_created_autoconfirm ON auth.users
    `;

    console.log("✓ Dropped on_auth_user_created_autoconfirm trigger");

    // Drop the function if it exists
    await sql`
      DROP FUNCTION IF EXISTS auto_confirm_user()
    `;

    console.log("✓ Dropped auto_confirm_user() function (if existed)");

    console.log("\n=== All Custom Triggers Removed ===");
    console.log("- Sign-up should now work without any custom triggers");

  } catch (error) {
    console.error("Failed to drop trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
