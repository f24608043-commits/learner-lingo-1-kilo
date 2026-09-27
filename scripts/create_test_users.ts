import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";
import { randomUUID } from "crypto";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Create Test Users for Pending Limit Test ===\n");

  try {
    // Check current user count
    const [userCount] = await sql`
      SELECT COUNT(*) as count FROM profiles
    `;

    console.log("Current users:", userCount.count);

    // Create additional test users if needed
    const neededUsers = 12 - Number(userCount.count);
    
    if (neededUsers <= 0) {
      console.log("Already have enough users. No action needed.");
      return;
    }

    console.log(`Creating ${neededUsers} test users...`);

    for (let i = 0; i < neededUsers; i++) {
      const userId = randomUUID();
      await sql`
        INSERT INTO profiles (id, display_name, role, xp, streak_count)
        VALUES (
          ${userId},
          ${`Test User ${Date.now()}-${i}`},
          'learner',
          0,
          0
        )
      `;
      console.log(`✓ Created test user ${i+1}`);
    }

    // Verify new count
    const [newCount] = await sql`
      SELECT COUNT(*) as count FROM profiles
    `;

    console.log("\nTotal users after creation:", newCount.count);

  } catch (error) {
    console.error("Failed to create test users:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
