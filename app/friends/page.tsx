import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import FriendsPageClient from "./FriendsPageClient";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      <FriendsPageClient />
    </div>
  );
}