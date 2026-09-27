import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL || "", { prepare: false, ssl: { rejectUnauthorized: false } });

async function inspect() {
  const authUsers = await sql`SELECT id, email, email_confirmed_at, confirmed_at, last_sign_in_at FROM auth.users ORDER BY created_at DESC LIMIT 20`;
  console.log("Recent auth users:", JSON.stringify(authUsers, null, 2));
  await sql.end();
}

inspect().catch((err) => {
  console.error("Inspect failed:", err);
  process.exit(1);
});
