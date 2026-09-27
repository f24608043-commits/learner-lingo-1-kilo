import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function verify() {
  const result = await sql`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'units' 
      AND column_name = 'badge_id';
  `;
  console.log("SCHEMA_CHECK_RESULT:", JSON.stringify(result));
  await sql.end();
  process.exit(0);
}

verify().catch((e) => {
  console.error("Verification error:", e);
  process.exit(1);
});
