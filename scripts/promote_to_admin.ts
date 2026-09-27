import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Promote User to Admin ===\n");

  const userId = "8e8a2d1b-f615-43a0-b81b-491e4c78c2ac";
  const email = "alexabraham587@gmail.com";

  try {
    // Check current role
    const [profile] = await sql`
      SELECT id, display_name, role
      FROM profiles
      WHERE id = ${userId}
    `;

    if (!profile) {
      console.log("✗ Profile not found for user:", email);
      console.log("   Creating profile first...");
      
      await sql`
        INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done)
        VALUES (${userId}, 'M Abubakar', 'learner', 0, 0, true)
      `;
      console.log("✓ Profile created");
    } else {
      console.log(`Current role for ${profile.display_name}: ${profile.role}`);
    }

    // Update role to admin
    await sql`
      UPDATE profiles
      SET role = 'admin', onboarding_done = true
      WHERE id = ${userId}
    `;

    console.log(`✓ Promoted ${email} to admin`);

    // Verify
    const [updated] = await sql`
      SELECT id, display_name, role
      FROM profiles
      WHERE id = ${userId}
    `;

    console.log("\n" + "=".repeat(60));
    console.log("User Updated:");
    console.log("=".repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`   Name: ${updated.display_name}`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   ID: ${updated.id}`);
    console.log("=".repeat(60));

  } catch (error) {
    console.error("Failed to promote user:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
