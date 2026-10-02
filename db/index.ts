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
      max: process.env.NODE_ENV === "production" ? 20 : 10,
      // Supabase's pooler frequently refuses or drops idle connections, and a
      // cold pool then has to reconnect on the next query. Keeping connections
      // warm for far longer avoids most of those connect-time ETIMEDOUTs.
      idle_timeout: 600,
      // Kept short on purpose. withDbRetry makes three attempts, so a long
      // connect timeout would let one unlucky action stretch to 90s and look
      // like a hung request to the UI. Normal connects take well under a second.
      connect_timeout: 10,
      max_lifetime: 60 * 30, // Recycle connections every 30 minutes
    });
  }

  return globalForDb.conn;
}

export const client = getClient();
export const db = drizzle(client, { schema });

/**
 * Connection-level failures that are worth retrying. The Supabase transaction
 * pooler intermittently times out when a pooled connection is re-established,
 * which surfaces as ETIMEDOUT/ECONNRESET rather than a SQL error.
 */
const TRANSIENT_CONNECTION_ERROR =
  /ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|57P01|Connection terminated|server closed the connection|Connection closed|terminating connection/i;

export function isTransientDbError(error: unknown): boolean {
  const parts: string[] = [];

  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const err = current as { message?: unknown; code?: unknown; cause?: unknown };
    if (typeof err.message === "string") parts.push(err.message);
    if (typeof err.code === "string") parts.push(err.code);
    current = err.cause;
  }

  return TRANSIENT_CONNECTION_ERROR.test(parts.join(" | "));
}

/**
 * Retries a query when the pooler drops the connection. Use only for queries
 * that are safe to run twice — reads, or writes guarded by an ON CONFLICT
 * clause. Not safe for bare INSERTs.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error;
      }

      lastError = error;
      // Brief, growing pause so the pooler has time to accept a reconnect.
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}

// Export schema tables for convenience
export * from "./schema";
