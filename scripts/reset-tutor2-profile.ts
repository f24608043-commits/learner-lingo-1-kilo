import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const TUTOR_ID = process.env.TEST_TUTOR_ID || "e7882451-c1a0-4ede-ac5a-33ed6c707485";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    onnotice: () => {},
  });

  await sql`DELETE FROM tutor_profiles WHERE tutor_id = ${TUTOR_ID}`;
  console.log(`cleared tutor_profiles for ${TUTOR_ID}`);
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
