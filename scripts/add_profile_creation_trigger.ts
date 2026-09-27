import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Profile Creation Trigger for New Users ===\n");

  try {
    // Drop existing trigger first
    await sql`
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users
    `;

    console.log("✓ Dropped existing trigger (if any)");

    // Drop existing function
    await sql`
      DROP FUNCTION IF EXISTS handle_new_user()
    `;

    console.log("✓ Dropped existing function (if any)");

    // Create function to handle new user creation
    await sql`
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
          'learner',
          0,
          0,
          false
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER
    `;

    console.log("✓ Created handle_new_user() function");


    // Create trigger
    await sql`
      CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user()
    `;

    console.log("✓ Created trigger on auth.users");

    console.log("\n=== Profile Auto-Creation Now Enabled ===");
    console.log("- When a new user signs up via Supabase Auth");
    console.log("- A profile row is automatically created in profiles table");
    console.log("- display_name is set from metadata or email prefix");
    console.log("- role defaults to 'learner'");
    console.log("- onboarding_done defaults to false");

  } catch (error) {
    console.error("Failed to add profile creation trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
