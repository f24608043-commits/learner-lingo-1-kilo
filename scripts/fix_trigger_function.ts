import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Fix Trigger Function to Include All Required Columns ===\n");

  try {
    // Drop the existing function
    await sql`
      DROP FUNCTION IF EXISTS handle_new_user() CASCADE
    `;

    console.log("✓ Dropped existing function");

    // Create updated function with all required columns
    await sql`
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done, daily_goal_minutes)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          'learner',
          0,
          0,
          false,
          15
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `;

    console.log("✓ Created updated handle_new_user() function with daily_goal_minutes");

    // Recreate the trigger
    await sql`
      CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user()
    `;

    console.log("✓ Recreated trigger on auth.users");

    // Verify the function
    const [func] = await sql`
      SELECT prosrc as source FROM pg_proc WHERE proname = 'handle_new_user'
    `;

    console.log("\n✓ Function source:");
    console.log(func.source);

  } catch (error) {
    console.error("Failed to fix trigger function:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
