import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import postgres from "postgres";

const DEMO_EMAILS = [
  "learner.demo.1790456781371@test.com",
  "tutor.demo.1790456787070@test.com",
  "admin.demo.1790456793000@test.com",
];

const sql = postgres(process.env.DATABASE_URL || "", { prepare: false, ssl: { rejectUnauthorized: false } });

async function assignRoles() {
  const targets = [
    { displayName: "Demo Learner", role: "learner" as const },
    { displayName: "Demo Tutor", role: "tutor" as const },
    { displayName: "Demo Admin", role: "admin" as const },
  ];

  for (const target of targets) {
    const profileRows = await sql`
      SELECT id, role FROM profiles WHERE display_name = ${target.displayName} ORDER BY created_at DESC LIMIT 1
    `;

    if (profileRows.length === 0) {
      console.log(`Profile not found for ${target.displayName}`);
      continue;
    }

    const userId = profileRows[0].id;

    await sql`
      UPDATE profiles 
      SET role = ${target.role}, onboarding_done = true, updated_at = NOW()
      WHERE id = ${userId}
    `;

    if (target.role === "tutor" || target.role === "admin") {
      const existingTutor = await sql`SELECT id FROM tutor_profiles WHERE tutor_id = ${userId}`;
      if (existingTutor.length === 0) {
        await sql`
          INSERT INTO tutor_profiles (tutor_id, bio, subjects, hourly_rate, timezone, is_active, rating, total_sessions)
          VALUES (${userId}, 'Demo tutor ready to help!', '${sql`ARRAY['Math','Science','Programming']`}', 25, 'UTC', true, 4, 0)
        `;
      }
    }

    console.log(`Assigned ${target.role} to ${target.displayName} (${userId})`);
  }

  await sql.end();
  console.log("\nDemo role assignment complete.");
}

assignRoles().catch((err) => {
  console.error("Role assignment failed:", err);
  process.exit(1);
});
