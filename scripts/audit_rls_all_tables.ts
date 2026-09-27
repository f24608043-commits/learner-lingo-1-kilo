import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Full RLS Audit - All Tables ===\n");

  try {
    // Get all public tables
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log(`Found ${tables.length} public tables\n`);

    const results: any[] = [];

    for (const table of tables) {
      const tableName = table.tablename;
      
      // Check if RLS is enabled
      const [rlsStatus] = await sql`
        SELECT relrowsecurity as rls_enabled
        FROM pg_class
        WHERE relname = ${tableName}
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      `;

      const rlsEnabled = rlsStatus?.rls_enabled || false;
      
      // Get RLS policies
      const policies = await sql`
        SELECT policyname, permissive, roles, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = ${tableName}
        AND schemaname = 'public'
      `;

      results.push({
        table: tableName,
        rls_enabled: rlsEnabled,
        policy_count: policies.length,
        policies: policies.map((p: any) => p.policyname),
      });

      console.log(`${rlsEnabled ? '✓' : '✗'} ${tableName}`);
      console.log(`   RLS: ${rlsEnabled ? 'ENABLED' : 'DISABLED'}`);
      console.log(`   Policies: ${policies.length}`);
      if (policies.length > 0) {
        for (const policy of policies) {
          console.log(`     - ${policy.policyname} (${policy.cmd})`);
        }
      }
      console.log();
    }

    // Summary
    const rlsEnabledCount = results.filter((r) => r.rls_enabled).length;
    const rlsDisabledCount = results.filter((r) => !r.rls_enabled).length;

    console.log("=== Summary ===");
    console.log(`Total tables: ${results.length}`);
    console.log(`RLS enabled: ${rlsEnabledCount}`);
    console.log(`RLS disabled: ${rlsDisabledCount}`);

    if (rlsDisabledCount > 0) {
      console.log("\n⚠ Tables with RLS disabled:");
      for (const result of results) {
        if (!result.rls_enabled) {
          console.log(`  - ${result.table}`);
        }
      }
    }

  } catch (error) {
    console.error("RLS audit failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
