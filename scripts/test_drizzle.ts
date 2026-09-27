import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Database URL configured:", process.env.DATABASE_URL ? "YES (hidden)" : "NO");
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  const { badges } = await import("../db/schema");

  console.log("Executing Drizzle SELECT 1 against Supabase Session Pooler...");
  const result = await db.execute(sql`SELECT 1 as test, current_database() as db_name, version() as pg_version;`);
  console.log("✅ LIVE DRIZZLE SELECT 1 OUTPUT:", result);

  const allBadges = await db.select().from(badges);
  console.log(`✅ DRIZZLE ORM SELECT FROM BADGES (${allBadges.length} rows):`);
  allBadges.forEach(b => console.log(`   - [${b.name}] ${b.description} (${b.criteriaType} = ${b.criteriaValue})`));

  console.log("\n🎉 PHASE 0 DRIZZLE LIVE CONNECTION PROVEN SUCCESSFULLY!");
  process.exit(0);
}

main().catch(err => {
  console.error("Drizzle connection test failed:", err);
  process.exit(1);
});
