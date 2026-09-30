import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const email = "learner2@gmail.com";
  const password = "learner2@1221";

  const { data, error } = await admin.auth.signUp({
    email,
    password,
    options: { data: { display_name: "Second Learner" } },
  });

  if (error) {
    console.log("signup error:", error.message);
  } else {
    console.log("created:", data.user?.id);
  }

  const { error: loginErr } = await admin.auth.signInWithPassword({ email, password });
  console.log("login:", loginErr ? loginErr.message : "ok");
}

main();
