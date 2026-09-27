import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Drop Disabled Trigger to Allow Sign-up ===\n");

  try {
    // Drop the trigger
    await sql`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
    `;

    console.log("✓ Dropped on_auth_user_created trigger");

    // Drop the function
    await sql`
      DROP FUNCTION IF EXISTS handle_new_user()
    `;

    console.log("✓ Dropped handle_new_user() function");

    console.log("\n=== Trigger Removed ===");
    console.log("- Profile creation will now be handled by app code");
    console.log("- Sign-up should work without database trigger");

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
