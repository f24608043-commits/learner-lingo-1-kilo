import Link from "next/link";
import { signUp } from "../auth/actions";
import Mascot from "@/components/Mascot";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      {/* Background decorations */}
      <div className="fixed top-12 right-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-12 left-12 w-72 h-72 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl border-4 border-surface-border animate-slide-up">
        {/* Mascot & Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-rose-400 p-1 shadow-xl border-4 border-white flex items-center justify-center animate-float">
              <Mascot pose="celebrate" size={80} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
            <span className="absolute bottom-1 -left-2 w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" />
          </div>

          <div className="flex flex-col items-center">
            <span className="font-headline-lg text-primary tracking-tight font-black uppercase text-2xl">
              LEGO LEARN
            </span>
            <span className="font-label-sm text-text-muted font-bold tracking-widest text-xs uppercase">
              Start Your Daily Habit
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="font-headline-lg text-text-primary tracking-tight font-black text-2xl">
            Create Account 🎯
          </h1>
          <p className="mt-1 font-body-sm text-text-muted">
            Join thousands of learners building skills day by day.
          </p>
        </div>

        {/* Error Banner */}
        {params.error && (
          <div className="mb-5 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700 font-bold flex items-center gap-2 animate-wiggle">
            <span className="material-symbols-outlined text-[20px] text-red-600">error</span>
            <span>{params.error}</span>
          </div>
        )}

        {/* Form */}
        <form action={signUp} className="space-y-4">
          <div>
            <label className="block font-label-sm text-text-primary font-bold mb-1.5 uppercase tracking-wide text-xs">
              Display Name
            </label>
            <input
              type="text"
              name="displayName"
              required
              placeholder="e.g. Master Builder"
              className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block font-label-sm text-text-primary font-bold mb-1.5 uppercase tracking-wide text-xs">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block font-label-sm text-text-primary font-bold mb-1.5 uppercase tracking-wide text-xs">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-2xl border-2 border-surface-border bg-gray-50/80 px-4 py-3 text-sm font-medium text-text-primary placeholder:text-gray-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 rounded-2xl bg-primary text-white py-3.5 px-6 font-label-lg font-black uppercase tracking-wider shadow-lg border-b-4 border-primary-dark hover:brightness-105 active:translate-y-[2px] active:border-b-[1px] transition-all cursor-pointer"
          >
            Start Learning Free 🎉
          </button>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 text-center font-body-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-label-md font-black text-primary hover:underline">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
}
