import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is not set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function promoteToTutor(email: string) {
  console.log(`Looking up user with email: ${email}`);

  // Get user from auth.users
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error listing users:", error);
    return;
  }

  const targetUser = users.find(u => u.email === email);
  
  if (!targetUser) {
    console.error(`User with email ${email} not found`);
    return;
  }

  console.log(`Found user: ${targetUser.id} (${targetUser.email})`);

  // Connect to database directly
  const connectionString = process.env.DATABASE_URL!;
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Update profile role
    await db.update(schema.profiles)
      .set({ role: "tutor" })
      .where(eq(schema.profiles.id, targetUser.id));
    
    console.log(`Updated profile role to 'tutor' for user ${targetUser.id}`);

    // Check if tutor profile exists
    const [existingTutorProfile] = await db
      .select()
      .from(schema.tutorProfiles)
      .where(eq(schema.tutorProfiles.tutorId, targetUser.id))
      .limit(1);

    if (!existingTutorProfile) {
      // Create tutor profile
      await db.insert(schema.tutorProfiles).values({
        tutorId: targetUser.id,
        bio: "Tutor profile",
        subjects: ["Python", "JavaScript"],
        hourlyRate: 25,
        rating: 5.0,
        totalSessions: 0,
      });
      console.log(`Created tutor profile for user ${targetUser.id}`);
    } else {
      console.log(`Tutor profile already exists for user ${targetUser.id}`);
    }

    console.log("✅ Successfully promoted user to tutor role");
  } catch (error) {
    console.error("Error promoting user:", error);
  } finally {
    await client.end();
  }
}

// Run the script
const email = process.argv[2] || "orphix.itsolutions@gmail.com";
promoteToTutor(email);
