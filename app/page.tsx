import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const startTime = Date.now();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const endTime = Date.now();
  console.log(`[PERF] Home page server render time: ${endTime - startTime}ms`);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md w-full rounded-2xl bg-surface p-8 shadow-clay-surface border border-surface-border">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-4xl shadow-clay-primary">
            🧱
          </div>
        </div>

        {/* Title */}
        <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold mb-2">LEGO</h1>
        <p className="font-body-md text-text-muted mb-8">
          Learn And Go — AI-powered, gamified learning with video lessons, quizzes, and live tutoring.
        </p>

        {/* CTA Buttons */}
        <div className="space-y-3">
          {user ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary bg-primary/10 p-4 text-sm text-primary">
                <p className="font-semibold">Welcome back!</p>
                <p className="text-xs mt-1">Signed in as {user.email}</p>
              </div>
              <Link
                href="/path"
                className="block w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary/90 shadow-clay-primary transition-all active:translate-y-[2px]"
              >
                Continue Learning →
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href="/sign-up"
                className="block w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary/90 shadow-clay-primary transition-all active:translate-y-[2px]"
              >
                Get Started Free
              </Link>
              <Link
                href="/sign-in"
                className="block w-full rounded-full border border-surface-border px-6 py-3 text-sm font-medium text-text-primary hover:bg-surface-container transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 pt-8 border-t border-surface-border">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">📚</div>
              <p className="text-xs font-semibold text-text-primary">Video Lessons</p>
            </div>
            <div>
              <div className="text-2xl mb-1">🎯</div>
              <p className="text-xs font-semibold text-text-primary">Interactive Quizzes</p>
            </div>
            <div>
              <div className="text-2xl mb-1">👨‍🏫</div>
              <p className="text-xs font-semibold text-text-primary">Live Tutoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
