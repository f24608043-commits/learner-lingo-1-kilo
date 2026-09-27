import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== MIGRATING NOTIFICATIONS TABLE ===\n");

  try {
    // Create the notification_type enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."notification_type" AS ENUM (
          'friend_request',
          'friend_accepted',
          'badge_earned',
          'streak_milestone',
          'lesson_completed',
          'leaderboard_rank'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ notification_type enum created (or already exists)");

    // Create the notifications table
    await sql`
      DO $$ BEGIN
        CREATE TABLE "notifications" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL,
          "type" "notification_type" NOT NULL,
          "title" text NOT NULL,
          "message" text NOT NULL,
          "data" jsonb,
          "is_read" boolean DEFAULT false NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `;
    console.log("✓ notifications table created (or already exists)");

    // Add foreign key constraint
    await sql`
      DO $$ BEGIN
        ALTER TABLE "notifications" 
        ADD CONSTRAINT "notifications_user_id_profiles_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ foreign key constraint added (or already exists)");

    console.log("\n✅ NOTIFICATIONS TABLE MIGRATION COMPLETE");

    // Verify the table exists
    const [check] = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
      ) as exists
    `;
    console.log(`\nVerification: notifications table exists = ${check.exists}`);

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
