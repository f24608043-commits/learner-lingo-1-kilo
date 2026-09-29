"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;
  const remember = formData.get("remember") === "on"; // Checkbox value is "on" when checked

  if (!email || !password) {
    redirect("/sign-up?error=Email and password are required");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || email.split("@")[0],
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("Sign-up error:", error);
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  // Fallback: Manually create profile if trigger didn't work
  if (data.user) {
    try {
      const [existingProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, data.user!.id))
        .limit(1);

      if (!existingProfile) {
        await db.insert(profiles).values({
          id: data.user.id,
          displayName: displayName || email.split("@")[0],
          role: "learner",
          xp: 0,
          streakCount: 0,
          onboardingDone: false,
        });
      }
    } catch (dbError) {
      console.error("Profile creation error:", dbError);
      // Continue anyway - the trigger might have worked
    }
  }

  // If email confirmation is required, don't auto sign in
  if (!data.session) {
    redirect("/sign-in?error=Please check your email to confirm your account");
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    redirect(`/sign-in?error=${encodeURIComponent(signInError.message)}`);
  }

  redirect("/onboarding");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const remember = formData.get("remember") === "on"; // Checkbox value is "on" when checked

  if (!email || !password) {
    redirect("/sign-in?error=Email and password are required");
  }

  const supabase = await createClient();
  
  // Prepare options for sign-in
  const options = {
    // If we wanted to extend session, we might do it here, but Supabase
    // session duration is typically configured at project level
    // For remember me, we rely on default persistence which should work
    // across browser sessions when using localStorage (which @supabase/ssr uses)
  };

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    // Note: The options parameter here is for the signInWithPassword method
    // We're not adding remember-specific options here as session persistence
    // is handled by the Supabase client configuration
  });

  if (error) {
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  // Get user profile to determine redirect based on role
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_done")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile) {
      // Redirect based on role
      if (profile.role === "admin") {
        redirect("/admin");
      } else if (profile.role === "tutor") {
        redirect("/tutoring/dashboard");
      } else if (profile.role === "learner") {
        // Learners go to onboarding if not done, otherwise path
        if (profile.onboarding_done) {
          redirect("/path");
        } else {
          redirect("/onboarding");
        }
      }
    }
  }

  // Default fallback
  redirect("/path");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
