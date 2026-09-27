import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function migrate() {
  await sql`
    ALTER TABLE public.enrollments 
    ADD COLUMN IF NOT EXISTS placement_answer text;
  `;
  console.log("✅ Column placement_answer added to public.enrollments!");
  await sql.end();
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
