import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const dbUrl = process.env.DATABASE_URL!;
const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AI INTERACTIONS QUERY ===\n");

  // Query 1: Distinct providers
  const distinctProviders = await sql`
    SELECT DISTINCT provider FROM public.ai_interactions
  `;
  console.log("DISTINCT PROVIDERS:");
  console.log(distinctProviders);

  // Query 2: Recent 5 entries with full details
  const recentEntries = await sql`
    SELECT provider, success, error_msg, created_at 
    FROM public.ai_interactions 
    ORDER BY created_at DESC LIMIT 5
  `;
  console.log("\nRECENT 5 ENTRIES:");
  console.log(recentEntries);

  // Query 3: Count by provider
  const providerCounts = await sql`
    SELECT provider, success, COUNT(*) as count 
    FROM public.ai_interactions 
    GROUP BY provider, success
  `;
  console.log("\nCOUNT BY PROVIDER AND SUCCESS:");
  console.log(providerCounts);

  await sql.end();
}

run().catch((e) => {
  console.error("Query failed:", e);
  process.exit(1);
});
