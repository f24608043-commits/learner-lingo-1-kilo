import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: { rejectUnauthorized: false } });

async function run() {
  console.log("=== MIGRATING PHASE 6 TUTORING TABLES ===\n");

  try {
    // Create session_notes_visibility enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."session_notes_visibility" AS ENUM ('private_tutor', 'shared');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_notes_visibility enum created (or already exists)");

    // Create session_request_status enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."session_request_status" AS ENUM ('pending', 'accepted', 'declined');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_request_status enum created (or already exists)");

    // Create tutor_profiles table
    await sql`
      DO $$ BEGIN
        CREATE TABLE "tutor_profiles" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tutor_id" uuid NOT NULL UNIQUE,
          "bio" text,
          "subjects" text[],
          "hourly_rate" integer,
          "timezone" text DEFAULT 'UTC' NOT NULL,
          "is_active" boolean DEFAULT true NOT NULL,
          "rating" integer DEFAULT 0,
          "total_sessions" integer DEFAULT 0,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `;
    console.log("✓ tutor_profiles table created (or already exists)");

    // Add foreign key for tutor_profiles
    await sql`
      DO $$ BEGIN
        ALTER TABLE "tutor_profiles" 
        ADD CONSTRAINT "tutor_profiles_tutor_id_profiles_id_fk" 
        FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ tutor_profiles foreign key added (or already exists)");

    // Create session_notes table
    await sql`
      DO $$ BEGIN
        CREATE TABLE "session_notes" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "session_id" uuid NOT NULL,
          "author_id" uuid NOT NULL,
          "note_text" text NOT NULL,
          "visibility" "session_notes_visibility" DEFAULT 'shared' NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `;
    console.log("✓ session_notes table created (or already exists)");

    // Add foreign keys for session_notes
    await sql`
      DO $$ BEGIN
        ALTER TABLE "session_notes" 
        ADD CONSTRAINT "session_notes_session_id_tutor_sessions_id_fk" 
        FOREIGN KEY ("session_id") REFERENCES "public"."tutor_sessions"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_notes session_id foreign key added (or already exists)");

    await sql`
      DO $$ BEGIN
        ALTER TABLE "session_notes" 
        ADD CONSTRAINT "session_notes_author_id_profiles_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_notes author_id foreign key added (or already exists)");

    // Create session_requests table
    await sql`
      DO $$ BEGIN
        CREATE TABLE "session_requests" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "learner_id" uuid NOT NULL,
          "tutor_id" uuid NOT NULL,
          "requested_slots" jsonb NOT NULL,
          "status" "session_request_status" DEFAULT 'pending' NOT NULL,
          "message" text,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `;
    console.log("✓ session_requests table created (or already exists)");

    // Add foreign keys for session_requests
    await sql`
      DO $$ BEGIN
        ALTER TABLE "session_requests" 
        ADD CONSTRAINT "session_requests_learner_id_profiles_id_fk" 
        FOREIGN KEY ("learner_id") REFERENCES "public"."profiles"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_requests learner_id foreign key added (or already exists)");

    await sql`
      DO $$ BEGIN
        ALTER TABLE "session_requests" 
        ADD CONSTRAINT "session_requests_tutor_id_profiles_id_fk" 
        FOREIGN KEY ("tutor_id") REFERENCES "public"."profiles"("id") 
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✓ session_requests tutor_id foreign key added (or already exists)");

    console.log("\n✅ PHASE 6 TUTORING TABLES MIGRATION COMPLETE");

    // Verify the tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('tutor_profiles', 'session_notes', 'session_requests')
    `;
    console.log(`\nVerification: Created/verified ${tables.length} tutoring tables`);
    console.log("Tables:", tables.map((t: any) => t.table_name));

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
