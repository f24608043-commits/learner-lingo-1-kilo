import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL || "", { prepare: false, ssl: { rejectUnauthorized: false } });

async function inspect() {
  const profiles = await sql`SELECT id, display_name, role, created_at FROM profiles ORDER BY created_at DESC LIMIT 10`;
  console.log("Recent profiles:", JSON.stringify(profiles, null, 2));
  await sql.end();
}

inspect().catch((err) => {
  console.error("Inspect failed:", err);
  process.exit(1);
});
