import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== AUDIT: Library Views Table ===\n");

  try {
    // Check if library_views table exists
    const [tableExists] = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'library_views'
      )
    `;

    if (tableExists.exists) {
      console.log("✓ library_views table exists");
      
      // Show table structure
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'library_views'
        ORDER BY ordinal_position
      `;
      
      console.log("\nTable structure:");
      columns.forEach((col: any) => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Show sample data
      const sampleData = await sql`
        SELECT * FROM library_views LIMIT 5
      `;
      
      console.log(`\nSample data (${sampleData.length} rows):`);
      console.log(sampleData);
    } else {
      console.log("✗ library_views table does NOT exist");
      console.log("This table needs to be created for the Library feature.");
    }

  } catch (error) {
    console.error("Audit failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
