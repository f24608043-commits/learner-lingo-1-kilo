import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Instructions to Create Test Accounts ===\n");

  console.log("Since we cannot programmatically create users with proper password hashing");
  console.log("without the SUPABASE_SERVICE_ROLE_KEY, please create accounts manually:\n");

  console.log("1. Go to: http://localhost:3000/sign-up");
  console.log("2. Create these 3 accounts with password: test123456\n");

  const accounts = [
    { email: "admin@lego.test", displayName: "Admin User", role: "admin" },
    { email: "tutor@lego.test", displayName: "Tutor User", role: "tutor" },
    { email: "learner@lego.test", displayName: "Learner User", role: "learner" },
  ];

  console.log("=".repeat(60));
  for (const account of accounts) {
    console.log(`\n📧 Email: ${account.email}`);
    console.log(`   Display Name: ${account.displayName}`);
    console.log(`   Password: test123456`);
    console.log(`   Role: ${account.role} (will be set after signup)`);
  }
  console.log("\n" + "=".repeat(60));

  console.log("\n3. After creating all accounts, run this script to set roles:");
  console.log("   npx tsx scripts/set_test_roles.ts");

  await sql.end();
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
