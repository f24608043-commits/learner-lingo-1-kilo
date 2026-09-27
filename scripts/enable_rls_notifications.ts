import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Enable RLS on notifications table ===\n");

  try {
    // Enable RLS
    await sql`
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY
    `;

    console.log("✓ RLS enabled on public.notifications");

    // Create policy: Users can see their own notifications
    await sql`
      DROP POLICY IF EXISTS users_can_view_own_notifications ON public.notifications
    `;

    await sql`
      CREATE POLICY users_can_view_own_notifications ON public.notifications
      FOR SELECT USING (user_id = auth.uid())
    `;

    console.log("✓ Created policy: users_can_view_own_notifications");

    // Create policy: Users can insert their own notifications (for system use)
    await sql`
      DROP POLICY IF EXISTS system_can_insert_notifications ON public.notifications
    `;

    await sql`
      CREATE POLICY system_can_insert_notifications ON public.notifications
      FOR INSERT WITH CHECK (true)
    `;

    console.log("✓ Created policy: system_can_insert_notifications");

    console.log("\n=== RLS Policies Applied ===");
    console.log("- Users can only view their own notifications");
    console.log("- System can insert notifications (for triggers/background jobs)");

  } catch (error) {
    console.error("Failed to enable RLS:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
