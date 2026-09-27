import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    redirect("/path?error=admin_only");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-outline-variant bg-surface-container-lowest shadow-subtle">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold text-primary">🎓 LEGO Admin</span>
            <nav className="hidden items-center gap-4 sm:flex">
              <Link href="/admin/users" className="font-label-sm font-medium text-on-surface-variant hover:text-primary">
                Users
              </Link>
              <Link href="/admin/badges" className="font-label-sm font-medium text-on-surface-variant hover:text-primary">
                Badges
              </Link>
              <Link href="/admin/courses" className="font-label-sm font-medium text-on-surface-variant hover:text-primary">
                Courses
              </Link>
              <Link href="/admin/tutoring" className="font-label-sm font-medium text-on-surface-variant hover:text-primary">
                Tutoring
              </Link>
              <Link href="/" className="font-label-sm font-medium text-on-surface-variant hover:text-primary">
                ← Back to App
              </Link>
            </nav>
          </div>
          <span className="rounded-full bg-primary-container/20 px-3 py-1 font-label-sm font-bold text-primary">
            {profile.role === "admin" ? "Admin Mode" : "Tutor Mode"}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
