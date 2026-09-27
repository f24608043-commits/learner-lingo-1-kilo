import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== OPENROUTER ERROR MESSAGES ===\n");

  const openRouterErrors = await sql`
    SELECT error_msg, created_at, success 
    FROM public.ai_interactions 
    WHERE provider = 'openrouter' 
    ORDER BY created_at DESC
  `;

  console.log(`Total OpenRouter entries: ${openRouterErrors.length}`);
  console.log("\nError messages:");
  openRouterErrors.forEach((row: any, idx: number) => {
    console.log(`${idx + 1}. ${row.created_at} | Success: ${row.success} | Error: ${row.error_msg || 'NULL'}`);
  });

  await sql.end();
}

run().catch((e) => {
  console.error("Query failed:", e);
  process.exit(1);
});
