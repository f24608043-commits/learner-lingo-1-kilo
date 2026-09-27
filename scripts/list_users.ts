import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== List All Users ===\n");

  try {
    const users = await sql`
      SELECT 
        p.id,
        p.display_name,
        p.role,
        a.email
      FROM profiles p
      JOIN auth.users a ON p.id = a.id
      ORDER BY p.role, p.display_name
    `;

    console.log("Available test accounts:");
    console.log("=".repeat(60));
    
    for (const user of users) {
      console.log(`\n📧 Email: ${user.email}`);
      console.log(`   Name: ${user.display_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\nNote: Passwords are stored in Supabase Auth and cannot be retrieved.");
    console.log("If you don't remember the password, you can:");
    console.log("1. Use the Supabase dashboard to reset the password");
    console.log("2. Or sign up a new account at http://localhost:3000/sign-up");

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
