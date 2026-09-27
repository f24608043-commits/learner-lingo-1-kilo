import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { profiles } from "../db/schema";
import { eq } from "drizzle-orm";

async function testLogins() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const users = [
    { email: "admin@gmail.com", password: "admin@1221", role: "admin" },
    { email: "tutor@gmail.com", password: "tutor@1221", role: "tutor" },
    { email: "learner@gmail.com", password: "learner@1221", role: "learner" },
  ];

  console.log("==========================================");
  console.log("Testing Supabase Auth Login for 3 Accounts");
  console.log("==========================================");

  for (const user of users) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) {
      console.error(`❌ [${user.role.toUpperCase()}] ${user.email} - Login Failed:`, error.message);
    } else {
      console.log(`✅ [${user.role.toUpperCase()}] ${user.email} - Login Succeeded! User ID: ${data.user?.id}`);

      // Verify profiles table role
      const { db } = await import("../db");
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, data.user!.id))
        .limit(1);

      console.log(`   Profile Role in DB: ${profile?.role} | Display Name: ${profile?.displayName}`);
    }
  }
}

testLogins().catch(console.error);
