import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function migrate() {
  await sql`
    ALTER TABLE public.units
    ADD COLUMN IF NOT EXISTS badge_id uuid REFERENCES public.badges(id) ON DELETE SET NULL;
  `;
  console.log("✅ Added badge_id column to public.units!");
  await sql.end();
  process.exit(0);
}

migrate().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
