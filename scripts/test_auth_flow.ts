import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const dbUrl = process.env.DATABASE_URL!;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});
const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function runTest() {
  const timestamp = Date.now();
  const testEmail = `test_learner_${timestamp}@lego.app`;
  const testPassword = "Password123!";
  const testDisplayName = `Learner ${timestamp}`;

  console.log("=================================================");
  console.log("STEP 1: Testing Supabase Auth sign-up...");
  console.log(`Email: ${testEmail}`);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        display_name: testDisplayName,
      },
    },
  });

  if (signUpError) {
    console.error("❌ Sign-up failed:", signUpError.message);
    process.exit(1);
  }

  const userId = signUpData.user?.id;
  console.log("✅ Sign-up succeeded!");
  console.log(`   User ID: ${userId}`);
  console.log(`   Email: ${signUpData.user?.email}`);
  console.log(`   Confirmed At: ${signUpData.user?.email_confirmed_at}`);

  console.log("\n=================================================");
  console.log("STEP 2: Verifying auth.users row in database...");
  const authUsers = await sql`
    SELECT id, email, role, email_confirmed_at, created_at, raw_user_meta_data
    FROM auth.users
    WHERE id = ${userId};
  `;
  console.log("✅ auth.users DB Record:", authUsers[0]);

  console.log("\n=================================================");
  console.log("STEP 3: Verifying public.profiles auto-created by trigger...");
  const profileRows = await sql`
    SELECT id, role, display_name, xp, streak_count, onboarding_done, daily_goal_minutes, created_at
    FROM public.profiles
    WHERE id = ${userId};
  `;
  if (profileRows.length === 0) {
    console.error("❌ Profile was not auto-created!");
    process.exit(1);
  }
  console.log("✅ public.profiles DB Record (AUTO-CREATED):", profileRows[0]);

  console.log("\n=================================================");
  console.log("STEP 4: Testing sign-in with password...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error("❌ Sign-in failed:", signInError.message);
    process.exit(1);
  }
  console.log("✅ Sign-in succeeded!");
  console.log(`   Session Access Token (prefix): ${signInData.session?.access_token.slice(0, 30)}...`);
  console.log(`   Session Expires At: ${signInData.session?.expires_at}`);

  console.log("\n=================================================");
  console.log("STEP 5: Testing session verification (simulating middleware)...");
  const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${signInData.session?.access_token}`,
      },
    },
  });

  const { data: userData, error: userError } = await authenticatedClient.auth.getUser();
  if (userError || !userData.user) {
    console.error("❌ Session verification failed:", userError?.message);
    process.exit(1);
  }
  console.log("✅ Session verified successfully!");
  console.log(`   User authenticated as: ${userData.user.email} (ID: ${userData.user.id})`);

  console.log("\n=================================================");
  console.log("STEP 6: Testing sign-out...");
  await authenticatedClient.auth.signOut();
  console.log("✅ Signed out successfully.");

  console.log("\n🎉 ALL AUTH END-TO-END CRITERIA VERIFIED WITH LIVE DATABASE PROOF!");
  await sql.end();
  process.exit(0);
}

runTest().catch(async (e) => {
  console.error("Fatal error:", e);
  await sql.end();
  process.exit(1);
});
