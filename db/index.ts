import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getClient(): postgres.Sql {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres.dummy:dummy@localhost:6543/postgres";

  if (!globalForDb.conn) {
    globalForDb.conn = postgres(connectionString, {
      prepare: false, // Required for Supabase Transaction Pooler (port 6543 / pgbouncer)
      ssl: { rejectUnauthorized: false },
      connection: {
        timeout: 30000, // 30 second connection timeout
      },
      max: process.env.NODE_ENV === "production" ? 10 : 5,
      idle_timeout: 10, // Close idle connections faster
      connect_timeout: 30, // 30 second connection attempt timeout
      max_lifetime: 60 * 30, // Recycle connections after 30 minutes
    });
  }

  return globalForDb.conn;
}

export const client = getClient();
export const db = drizzle(client, { schema });

// Export schema tables for convenience
export * from "./schema";
