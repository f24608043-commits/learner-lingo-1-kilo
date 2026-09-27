import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function run() {
  const email = "orphix.itsolutions@gmail.com";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
    process.exit(1);
  }

  console.log(`=== Promoting ${email} to Tutor ===\n`);

  try {
    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user by email from auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError);
      process.exit(1);
    }

    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
      console.error(`User ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user ID: ${targetUser.id}`);

    // Update role in profiles table using raw SQL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'tutor' })
      .eq('id', targetUser.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      process.exit(1);
    }

    console.log(`✓ Updated profile role to 'tutor'`);

    // Check if tutor_profile exists
    const { data: existingTutorProfile } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('id', targetUser.id)
      .single();

    if (!existingTutorProfile) {
      console.log(`\nCreating tutor_profile entry...`);
      const { error: insertError } = await supabase
        .from('tutor_profiles')
        .insert({
          id: targetUser.id,
          bio: 'Experienced tutor ready to help!',
          subjects: ['Math', 'Science', 'English'],
          hourly_rate: 25,
          rating: 5.0,
          total_sessions: 0,
        });

      if (insertError) {
        console.error("Error creating tutor_profile:", insertError);
        process.exit(1);
      }
      console.log(`✓ Created tutor_profile`);
    } else {
      console.log(`\n✓ tutor_profile already exists`);
    }

    console.log(`\n=== Success ===`);
    console.log(`${email} is now a tutor!`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
