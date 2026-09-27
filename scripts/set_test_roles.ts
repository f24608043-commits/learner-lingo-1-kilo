import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Set Roles for Test Accounts ===\n");

  const accounts = [
    { email: "admin@lego.test", role: "admin" },
    { email: "tutor@lego.test", role: "tutor" },
    { email: "learner@lego.test", role: "learner" },
  ];

  for (const account of accounts) {
    try {
      // Get user ID from auth.users
      const [user] = await sql`
        SELECT id
        FROM auth.users
        WHERE email = ${account.email}
      `;

      if (!user) {
        console.log(`⚠ User not found: ${account.email}`);
        console.log(`   Please sign up at http://localhost:3000/sign-up first`);
        continue;
      }

      // Update role in profiles table
      await sql`
        UPDATE profiles
        SET role = ${account.role}, onboarding_done = true
        WHERE id = ${user.id}
      `;

      console.log(`✓ Set role for ${account.email}: ${account.role}`);

    } catch (error) {
      console.log(`✗ Error with ${account.email}:`, error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test Accounts Ready:");
  console.log("=".repeat(60));
  console.log("\n📧 admin@lego.test");
  console.log("   Password: test123456");
  console.log("   Role: admin");
  console.log("\n📧 tutor@lego.test");
  console.log("   Password: test123456");
  console.log("   Role: tutor");
  console.log("\n📧 learner@lego.test");
  console.log("   Password: test123456");
  console.log("   Role: learner");
  console.log("\n" + "=".repeat(60));

  await sql.end();
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
