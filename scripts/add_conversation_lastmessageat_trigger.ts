import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== Add Trigger to Update Conversation's lastMessageAt on New Message ===\n");

  try {
    // Drop existing trigger if it exists
    await sql`
      DROP TRIGGER IF EXISTS update_conversation_lastmessageat_trigger ON messages
    `;

    console.log("✓ Dropped existing trigger (if any)");

    // Create function to update conversation's lastMessageAt
    await sql`
      CREATE OR REPLACE FUNCTION update_conversation_lastmessageat()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE conversations
        SET lastMessageAt = NEW.createdAt
        WHERE id = NEW.conversationId;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    console.log("✓ Created update_conversation_lastmessageat function");

    // Create trigger
    await sql`
      CREATE TRIGGER update_conversation_lastmessageat_trigger
      AFTER INSERT ON messages
      FOR EACH ROW
      EXECUTE FUNCTION update_conversation_lastmessageat()
    `;

    console.log("✓ Created trigger on messages table");

    console.log("\n=== Conversation lastMessageAt Update Trigger Now Enforced ===");
    console.log("- Updates conversation's lastMessageAt when a new message is inserted");
    console.log("- Applies to all INSERT operations, including direct DB access");

  } catch (error) {
    console.error("Failed to add trigger:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});