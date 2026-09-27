import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

// Use service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function run() {
  console.log("=== Create Test Accounts with Known Passwords ===\n");

  const password = "test123456"; // Simple password for testing
  const { randomUUID } = await import("crypto");

  const accounts = [
    { email: "admin@lego.test", displayName: "Admin User", role: "admin" },
    { email: "tutor@lego.test", displayName: "Tutor User", role: "tutor" },
    { email: "learner@lego.test", displayName: "Learner User", role: "learner" },
  ];

  for (const account of accounts) {
    try {
      // Check if user exists in auth
      const [existingUser] = await sql`
        SELECT id, email
        FROM auth.users
        WHERE email = ${account.email}
      `;

      if (existingUser) {
        console.log(`⚠ User already exists: ${account.email}`);
        console.log(`  Deleting from auth.users and profiles...`);
        
        await sql`DELETE FROM profiles WHERE id = ${existingUser.id}`;
        await sql`DELETE FROM auth.users WHERE id = ${existingUser.id}`;
        console.log(`  ✓ Deleted`);
      }

      // Create user using Supabase Admin API (proper password hashing)
      const { data, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: account.displayName,
        },
      });

      if (error) {
        console.log(`✗ Failed to create ${account.email}: ${error.message}`);
        continue;
      }

      if (!data.user) {
        console.log(`✗ No user returned for ${account.email}`);
        continue;
      }

      // Update role in profiles table
      await sql`
        INSERT INTO profiles (id, display_name, role, xp, streak_count, onboarding_done)
        VALUES (${data.user.id}, ${account.displayName}, ${account.role}, 0, 0, true)
        ON CONFLICT (id) DO UPDATE SET
          display_name = ${account.displayName},
          role = ${account.role},
          onboarding_done = true
      `;

      console.log(`✓ Created: ${account.email}`);
      console.log(`  Password: ${password}`);
      console.log(`  Role: ${account.role}`);

    } catch (error) {
      console.log(`✗ Error with ${account.email}:`, error);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("Test Accounts Created:");
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
