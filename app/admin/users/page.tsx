import { getAllUsers, changeUserRole } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin role first
  const [userProfile] = await db
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!userProfile || userProfile.role !== 'admin') {
    redirect("/path");
  }

  const searchQuery = params.q || "";
  const users = await getAllUsers(searchQuery);

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-indigo-50 min-h-screen">
      <div className="mb-6">
        <h1 className="font-headline-xl text-headline-xl text-text-primary font-extrabold mb-2">User Management 👥</h1>
        <p className="font-body-md text-text-muted">View and manage user roles</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form>
          <input
            type="text"
            name="q"
            placeholder="Search users by name or role..."
            defaultValue={searchQuery}
            className="w-full max-w-md px-4 py-2 border-4 border-blue-200 rounded-xl bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-lg"
            suppressHydrationWarning={true}
          />
          <button
            type="submit"
            className="ml-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-label-md font-semibold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50 shadow-xl border-4 border-blue-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-indigo-500 border-b-4 border-blue-200">
            <tr>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Name</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Role</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">XP</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Streak</th>
              <th className="px-6 py-3 text-left font-label-md font-semibold text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-text-muted">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id} className="border-b-4 border-blue-100 hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-label-md font-semibold text-text-primary">{user.displayName || "Anonymous"}</div>
                    <div className="font-body-sm text-text-muted">{user.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full font-body-sm font-semibold border-2 ${
                        user.role === "admin"
                          ? "bg-gradient-to-r from-red-500 to-orange-500 text-white border-white/30"
                          : user.role === "tutor"
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-white/30"
                          : "bg-gradient-to-r from-blue-400 to-cyan-500 text-white border-white/30"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-body-sm text-text-primary">{user.xp || 0}</td>
                  <td className="px-6 py-4 font-body-sm text-text-primary">{user.streakCount || 0} days</td>
                  <td className="px-6 py-4">
                    <form action={async (formData) => {
                      "use server";
                      const newRole = formData.get("role") as "learner" | "tutor" | "admin";
                      await changeUserRole(user.id, newRole);
                    }} suppressHydrationWarning={true}>
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="px-3 py-1 border border-surface-border rounded-lg bg-surface text-text-primary font-body-sm mr-2"
                        suppressHydrationWarning={true}
                      >
                        <option value="learner">Learner</option>
                        <option value="tutor">Tutor</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-primary text-white rounded-lg font-body-sm font-semibold hover:bg-primary-dark transition-all"
                      >
                        Change
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 font-body-sm text-text-primary">
        Total users: {users.length}
      </div>
    </div>
  );
}
