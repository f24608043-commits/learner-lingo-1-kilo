import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== List All Users with Roles ===\n");

  try {
    const users = await sql`
      SELECT 
        p.id,
        p.display_name,
        p.role,
        a.email,
        p.onboarding_done
      FROM profiles p
      JOIN auth.users a ON p.id = a.id
      ORDER BY p.role, p.display_name
    `;

    console.log(`Total users: ${users.length}\n`);

    const byRole: Record<string, any[]> = {
      admin: [],
      tutor: [],
      learner: [],
    };

    for (const user of users) {
      if (byRole[user.role]) {
        byRole[user.role].push(user);
      }
    }

    for (const [role, roleUsers] of Object.entries(byRole)) {
      console.log(`=== ${role.toUpperCase()} (${roleUsers.length}) ===`);
      for (const user of roleUsers) {
        console.log(`  📧 ${user.email}`);
        console.log(`     Name: ${user.display_name}`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Onboarding: ${user.onboarding_done ? '✓' : '✗'}`);
      }
      console.log();
    }

  } catch (error) {
    console.error("Failed to list users:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
