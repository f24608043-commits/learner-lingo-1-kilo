import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Check and Create Missing Profiles ===\n");

  try {
    // Get all auth users
    const authUsers = await sql`
      SELECT id, email, raw_user_meta_data
      FROM auth.users
    `;

    console.log(`Found ${authUsers.length} auth users`);

    // Get all profiles
    const profiles = await sql`
      SELECT id
      FROM profiles
    `;

    const profileIds = new Set(profiles.map((p: any) => p.id));
    const missingProfiles = authUsers.filter((u: any) => !profileIds.has(u.id));

    console.log(`Users without profiles: ${missingProfiles.length}`);

    if (missingProfiles.length > 0) {
      console.log("\nCreating missing profiles...");
      for (const user of missingProfiles) {
        const displayName = user.raw_user_meta_data?.display_name || user.email.split("@")[0];
        await sql`
          INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done)
          VALUES (${user.id}, ${displayName}, 'learner', 0, 0, false)
        `;
        console.log(`✓ Created profile for: ${user.email}`);
      }
    } else {
      console.log("✓ All users have profiles");
    }

  } catch (error) {
    console.error("Failed to check/create profiles:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
