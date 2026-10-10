import dotenv from "dotenv";
import path from "path";
import { createRequire } from "module";

dotenv.config({ path: path.resolve(".env.local") });
const require = createRequire(import.meta.url);
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL, { max: 1, timeout: 15, connect_timeout: 15 });

try {
  const rows = await sql`select current_database() as db`;
  console.log("DB OK:", JSON.stringify(rows));
  const pub = await sql`select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by tablename`;
  console.log("realtime tables:", pub.map((r) => r.tablename).join(", "));
} catch (e) {
  console.error("DB ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}