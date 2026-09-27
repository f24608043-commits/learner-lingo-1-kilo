import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  console.log("=== Test Profile Creation ===\n");

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Test123456!";
  const testDisplayName = "Test User";

  try {
    console.log(`Attempting to sign up: ${testEmail}`);

    // Sign up via Supabase
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: testDisplayName,
        },
      },
    });

    if (error) {
      console.error("Sign-up error:", error.message);
      throw error;
    }

    console.log("✓ Sign-up successful");
    console.log("  User ID:", data.user?.id);

    // Wait a moment for any trigger
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile exists
    const [profile] = await sql`
      SELECT * FROM profiles WHERE id = ${data.user!.id}
    `;

    if (profile) {
      console.log("\n✓ Profile created by trigger:");
      console.log("  ID:", profile.id);
      console.log("  Display Name:", profile.display_name);
      console.log("  Role:", profile.role);
      console.log("  XP:", profile.xp);
      console.log("  Streak Count:", profile.streak_count);
      console.log("  Onboarding Done:", profile.onboarding_done);
    } else {
      console.log("\n✗ Profile NOT created by trigger (expected since trigger is disabled)");

      // Try manual profile creation
      console.log("\nAttempting manual profile creation...");
      await sql`
        INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done, daily_goal_minutes)
        VALUES (
          ${data.user!.id},
          ${testDisplayName},
          'learner',
          0,
          0,
          false,
          15
        )
      `;
      console.log("✓ Manual profile creation successful");

      // Verify
      const [manualProfile] = await sql`
        SELECT * FROM profiles WHERE id = ${data.user!.id}
      `;
      console.log("\n✓ Profile now exists:");
      console.log("  ID:", manualProfile.id);
      console.log("  Display Name:", manualProfile.display_name);
      console.log("  Role:", manualProfile.role);
    }

    // Clean up
    console.log("\nCleaning up test user...");
    await sql`DELETE FROM profiles WHERE id = ${data.user!.id}`;
    await supabase.auth.admin.deleteUser(data.user!.id);
    console.log("✓ Test user cleaned up");

  } catch (error) {
    console.error("Test failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
