import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Enable RLS on messages table ===\n");

  try {
    // Enable RLS
    await sql`
      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY
    `;

    console.log("✓ RLS enabled on public.messages");

    // Create policy: Users can view messages in conversations they are members of
    await sql`
      DROP POLICY IF EXISTS users_can_view_messages_in_conversation ON public.messages
    `;

    await sql`
      CREATE POLICY users_can_view_messages_in_conversation ON public.messages
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM conversation_members
          WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
      )
    `;

    console.log("✓ Created policy: users_can_view_messages_in_conversation");

    // Create policy: Users can insert messages into conversations they are members of
    await sql`
      DROP POLICY IF EXISTS users_can_insert_messages_in_conversation ON public.messages
    `;

    await sql`
      CREATE POLICY users_can_insert_messages_in_conversation ON public.messages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM conversation_members
          WHERE conversation_id = messages.conversation_id
            AND user_id = auth.uid()
        )
      )
    `;

    console.log("✓ Created policy: users_can_insert_messages_in_conversation");

    console.log("\n=== RLS Policies Applied ===");
    console.log("- Users can only view messages in conversations they are members of");
    console.log("- Users can only insert messages into conversations they are members of");

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