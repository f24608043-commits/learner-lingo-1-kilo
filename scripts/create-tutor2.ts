import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const email = "tutor2@gmail.com";
const password = "tutor2@1221";

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { display_name: "Second Tutor" } },
  });

  let userId = data?.user?.id;
  if (error) {
    console.log("signup:", error.message);
  } else {
    console.log("created:", userId);
  }

  if (!userId) {
    const { data: signin, error: e2 } = await sb.auth.signInWithPassword({ email, password });
    if (e2) {
      console.log("login failed:", e2.message);
      return;
    }
    userId = signin.user.id;
    console.log("existing:", userId);
  }

  const sql = postgres(process.env.DATABASE_URL!, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
    onnotice: () => {},
  });

  // Promote to tutor, ensure no tutor profile exists yet
  await sql`UPDATE profiles SET role = 'tutor', onboarding_done = true WHERE id = ${userId}`;
  await sql`DELETE FROM tutor_profiles WHERE tutor_id = ${userId}`;

  const [row] = await sql`SELECT id, role, display_name FROM profiles WHERE id = ${userId}`;
  console.log("profile:", row);

  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
