import { getFriendList, getPendingRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, searchLearners, sendFriendRequest } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Mascot from "@/components/Mascot";
import Link from "next/link";

const AVATAR_GRADIENTS = [
  "from-pink-500 to-rose-500",
  "from-purple-500 to-indigo-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-blue-500 to-cyan-500",
];

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim() || "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [friends, pendingRequests, searchResults] = await Promise.all([
    getFriendList(),
    getPendingRequests(),
    query ? searchLearners(query) : Promise.resolve([]),
  ]);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* ── Squad Header Card ────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6 animate-slide-up">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none" />
        <div className="relative bg-white/95 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-label-sm text-xs font-black uppercase tracking-wider border border-pink-200">
                👥 Social Learning
              </span>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-label-sm text-xs font-black uppercase tracking-wider border border-green-200">
                {friends.length} Friends
              </span>
              {pendingRequests.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-label-sm text-xs font-black uppercase tracking-wider border border-orange-200 animate-pulse">
                  {pendingRequests.length} Pending
                </span>
              )}
            </div>
            <h1 className="font-headline-xl text-text-primary tracking-tight font-black text-2xl md:text-3xl">
              Your Learning Squad 🤝
            </h1>
            <p className="font-body-sm text-text-muted">
              Learning with friends makes you 5x more likely to finish a course! Practice together, cheer each other, and compare streaks.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-24 h-24 hidden sm:flex items-center justify-center animate-float">
              <Mascot pose="encouraging" size={96} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Search / Add Friends Bar ──────────────────────────────── */}
      <div className="bg-white rounded-3xl p-5 shadow-clay-surface border border-surface-border mb-6 animate-slide-up delay-75">
        <h2 className="font-headline-md text-text-primary font-black mb-2 text-base md:text-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">person_search</span>
          Find & Add Friends
        </h2>
        <form method="GET" action="/friends" className="flex gap-2">
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Search by learner name..."
            className="flex-1 rounded-2xl border-2 border-surface-border bg-gray-50 px-4 py-2.5 text-sm font-medium text-text-primary focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
          />
          <button
            type="submit"
            className="rounded-2xl bg-primary text-white px-6 py-2.5 font-label-md font-black uppercase tracking-wide shadow-md border-b-4 border-primary-dark hover:brightness-105 active:translate-y-[2px] active:border-b-[1px] transition-all cursor-pointer text-sm shrink-0"
          >
            Search
          </button>
        </form>

        {/* Search Results */}
        {query && (
          <div className="mt-4 pt-4 border-t border-surface-border">
            <p className="font-label-sm text-text-muted text-xs font-bold mb-3">
              Search results for &quot;{query}&quot; ({searchResults.length})
            </p>
            {searchResults.length === 0 ? (
              <p className="text-sm text-text-muted">No learners found matching that name.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {searchResults.map((learner: any) => {
                  const isAlreadyFriend = friends.some((f: any) => f.id === learner.id);

                  return (
                    <div key={learner.id} className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-emerald-400 text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                          {learner.displayName?.[0] || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-label-md font-bold text-text-primary truncate text-sm">{learner.displayName}</p>
                          <p className="font-body-sm text-xs text-text-muted">{learner.xp || 0} XP</p>
                        </div>
                      </div>

                      {isAlreadyFriend ? (
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                          Friends ✓
                        </span>
                      ) : (
                        <form action={async () => {
                          "use server";
                          await sendFriendRequest(learner.id);
                        }}>
                          <button
                            type="submit"
                            className="rounded-xl bg-primary text-white px-3 py-1.5 font-label-sm font-bold text-xs shadow-sm border-b-2 border-primary-dark hover:brightness-105 active:translate-y-[1px] transition-all cursor-pointer"
                          >
                            + Add
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pending Requests ─────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="mb-6 animate-slide-up delay-150">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="font-headline-md text-text-primary font-black text-lg">
              Pending Requests ({pendingRequests.length})
            </h2>
          </div>

          <div className="space-y-3">
            {pendingRequests.map((request: any) => (
              <div
                key={request.id}
                className="rounded-3xl bg-white p-4 shadow-clay-surface border-l-4 border-l-orange-500 border border-surface-border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 text-white font-extrabold text-lg flex items-center justify-center shadow-sm shrink-0 border-2 border-white">
                    {request.requester?.displayName?.[0] || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md text-text-primary font-black truncate">
                      {request.requester?.displayName || "Learner"}
                    </p>
                    <p className="font-body-sm text-text-muted text-xs">
                      Requested {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <form action={async () => {
                    "use server";
                    await acceptFriendRequest(request.id);
                  }}>
                    <button
                      type="submit"
                      className="rounded-2xl bg-primary text-white px-4 py-2 font-label-md font-bold text-xs uppercase tracking-wider shadow-sm border-b-2 border-primary-dark hover:brightness-105 active:translate-y-[1px] transition-all cursor-pointer"
                    >
                      Accept
                    </button>
                  </form>

                  <form action={async () => {
                    "use server";
                    await rejectFriendRequest(request.id);
                  }}>
                    <button
                      type="submit"
                      className="rounded-2xl bg-gray-100 text-gray-700 px-4 py-2 font-label-md font-semibold text-xs border border-gray-300 hover:bg-gray-200 transition-all cursor-pointer"
                    >
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Friends Grid ─────────────────────────────────────────── */}
      <div className="animate-slide-up delay-225">
        <h2 className="font-headline-md text-text-primary font-black mb-4 text-lg">
          My Friends ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-clay-surface border border-surface-border">
            <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
              <Mascot pose="empty" size={80} />
            </div>
            <h3 className="font-headline-md text-text-primary font-black mb-1">No friends added yet</h3>
            <p className="font-body-sm text-text-muted max-w-sm mx-auto mb-4">
              Use the search bar above to look up other learners and invite them to your squad!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {friends.map((friend: any, idx: number) => {
              const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];

              return (
                <div
                  key={friend.id}
                  className="rounded-3xl bg-white p-5 shadow-clay-surface border border-surface-border hover:shadow-xl hover:border-pink-200 transition-all animate-pop-in"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-white shrink-0`}>
                      {friend.displayName?.[0] || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/${friend.id}`}
                        className="font-label-md text-text-primary font-black truncate block hover:text-primary transition-colors text-base"
                      >
                        {friend.displayName || "Learner"}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-yellow-700 font-bold bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                          ⚡ {friend.xp || 0} XP
                        </span>
                        {friend.streakCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-700 font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                            🔥 {friend.streakCount}d
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                    <div className="flex gap-2">
                      <form action={async () => {
                        "use server";
                        const { startDirectConversation } = await import("@/app/messaging/actions");
                        await startDirectConversation(friend.id);
                      }}>
                        <button
                          type="submit"
                          className="rounded-xl bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 font-label-sm font-bold text-xs hover:bg-pink-100 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">chat</span>
                          Chat
                        </button>
                      </form>

                      <Link
                        href={`/profile/${friend.id}`}
                        className="rounded-xl bg-gray-100 text-gray-700 px-3 py-1.5 font-label-sm font-bold text-xs hover:bg-gray-200 transition-all flex items-center"
                      >
                        Profile
                      </Link>
                    </div>

                    <form action={async () => {
                      "use server";
                      await removeFriend(friend.id);
                    }}>
                      <button
                        type="submit"
                        className="text-xs text-red-500 hover:text-red-700 font-bold p-1 cursor-pointer transition-colors"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
