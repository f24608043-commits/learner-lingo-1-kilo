import "dotenv/config";
import { db } from "../db";
import { sql } from "drizzle-orm";

async function runLoadTest() {
  console.log("==================================================");
  console.log("Starting 50 Concurrent Database Requests Load Test");
  console.log("==================================================");

  const CONCURRENCY = 50;
  const startTime = Date.now();
  let successCount = 0;
  let failureCount = 0;
  const errors: string[] = [];

  const promises = Array.from({ length: CONCURRENCY }).map(async (_, idx) => {
    const queryStart = Date.now();
    try {
      const result = await db.execute(sql`SELECT ${idx} AS req_id, now() AS current_time`);
      const latency = Date.now() - queryStart;
      successCount++;
      return { success: true, reqId: idx, latency };
    } catch (err: any) {
      failureCount++;
      errors.push(`Request ${idx} failed: ${err?.message || err}`);
      return { success: false, reqId: idx, error: err?.message };
    }
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;
  const latencies = results
    .filter((r) => r.success && r.latency !== undefined)
    .map((r) => r.latency as number);

  const avgLatency = latencies.length ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0;
  const maxLatency = latencies.length ? Math.max(...latencies) : 0;
  const minLatency = latencies.length ? Math.min(...latencies) : 0;

  console.log(`\nLoad Test Completed in ${totalDuration}ms`);
  console.log(`Total Requests: ${CONCURRENCY}`);
  console.log(`Successful:     ${successCount}`);
  console.log(`Failed:         ${failureCount}`);
  console.log(`Latency (ms):   Min: ${minLatency}ms | Avg: ${avgLatency}ms | Max: ${maxLatency}ms`);

  if (failureCount > 0) {
    console.error("\nErrors encountered:");
    errors.slice(0, 5).forEach((e) => console.error(" - " + e));
    process.exit(1);
  } else {
    console.log("\nZero connection errors observed. Connection pooler test PASSED.");
    process.exit(0);
  }
}

runLoadTest().catch((err) => {
  console.error("Load test runner crashed:", err);
  process.exit(1);
});
