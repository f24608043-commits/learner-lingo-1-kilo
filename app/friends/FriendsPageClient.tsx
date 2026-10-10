"use client";

import { useState, useEffect, useRef } from "react";
import { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, getFriendList, getPendingRequests, searchLearners, getFriendSuggestions } from "@/app/friends/actions";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RealtimeChannel } from "@supabase/supabase-js";
import { LoadingButton } from "@/components/LoadingButton";

export default function FriendsPageClient() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "friends" | "search">("friends");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // Fetch initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [pending, friendList, sugg] = await Promise.all([
          getPendingRequests(),
          getFriendList(),
          getFriendSuggestions(8),
        ]);
        setPendingRequests(pending);
        setFriends(friendList);
        setSuggestions(sugg);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time subscription for friendship changes
    const channel = supabase
      .channel('friendship-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        (payload) => {
          handleFriendshipChange(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle friendship changes from real-time subscription
  const handleFriendshipChange = async (payload: any) => {
    const { eventType, table, old_record, new_record } = payload;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) return;

    // We only care about changes involving the current user
    const isInvolved =
      (new_record && (new_record.requesterId === userId || new_record.addresseeId === userId)) ||
      (old_record && (old_record.requesterId === userId || old_record.addresseeId === userId));

    if (!isInvolved) return;

    // Refresh the relevant data
    switch (eventType) {
      case "INSERT":
        // New friend request or friendship
        if (new_record.status === "pending" && new_record.addresseeId === userId) {
          // New pending request for the current user
          setPendingRequests((prev) => {
            // Avoid duplicates
            const exists = prev.some((req) => req.id === new_record.id);
            if (exists) return prev;
            return [...prev, new_record];
          });
        } else if (new_record.status === "accepted") {
          // New accepted friendship
          setFriends((prev) => {
            // Avoid duplicates
            const exists = prev.some((friend) => friend.id === new_record.id);
            if (exists) return prev;
            return [...prev, new_record];
          });
          // Remove from pending if it was there
          setPendingRequests((prev) => prev.filter((req) => req.id !== new_record.id));
        }
        break;
      case "UPDATE":
        if (new_record.status === "accepted" && old_record.status === "pending") {
          // Request accepted
          setFriends((prev) => {
            const exists = prev.some((friend) => friend.id === new_record.id);
            if (exists) return prev;
            return [...prev, new_record];
          });
          setPendingRequests((prev) => prev.filter((req) => req.id !== new_record.id));
        } else if (new_record.status === "rejected") {
          // Request rejected
          setPendingRequests((prev) => prev.filter((req) => req.id !== new_record.id));
          setFriends((prev) => prev.filter((friend) => friend.id !== new_record.id));
        } else if (new_record.status === "blocked") {
          // Request blocked
          setPendingRequests((prev) => prev.filter((req) => req.id !== new_record.id));
          setFriends((prev) => prev.filter((friend) => friend.id !== new_record.id));
        }
        break;
      case "DELETE":
        // Friendship deleted (removed or blocked)
        setPendingRequests((prev) => prev.filter((req) => req.id !== old_record.id));
        setFriends((prev) => prev.filter((friend) => friend.id !== old_record.id));
        break;
      default:
        break;
    }
  };

  // Handle sending a friend request
  const handleSendRequest = async (addresseeId: string) => {
    setProcessingId(`send-${addresseeId}`);
    try {
      // Optimistic update: add to pending requests immediately
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error("User not authenticated");
      
      const optimisticRequest = {
        id: `optimistic-${Date.now()}`,
        requesterId: userId,
        addresseeId,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      setPendingRequests((prev) => [...prev, optimisticRequest]);

      await sendFriendRequest(addresseeId);

      // Replace optimistic request with real one after success
      // We'll refetch pending requests to get the real data
      const updatedPending = await getPendingRequests();
      setPendingRequests(updatedPending.filter((req) => req.id !== optimisticRequest.id));
    } catch (err: any) {
      // Rollback optimistic update on error
      setPendingRequests((prev) => prev.filter((req) => req.id !== `optimistic-${Date.now()}`));
      setError(err.message || "Failed to send friend request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle accepting a friend request
  const handleAcceptRequest = async (friendshipId: string) => {
    setProcessingId(`accept-${friendshipId}`);
    const request = pendingRequests.find((req) => req.id === friendshipId);
    try {
      // Optimistic update: move from pending to friends
      if (request) {
        setPendingRequests((prev) => prev.filter((req) => req.id !== friendshipId));
        setFriends((prev) => [...prev, request]);
      }

      await acceptFriendRequest(friendshipId);

      // Refetch to ensure consistency
      const [updatedPending, updatedFriends] = await Promise.all([
        getPendingRequests(),
        getFriendList(),
      ]);
      setPendingRequests(updatedPending);
      setFriends(updatedFriends);
    } catch (err: any) {
      // Rollback optimistic update
      setPendingRequests((prev) => [request, ...prev]);
      setFriends((prev) => prev.filter((friend) => friend.id !== request?.id));
      setError(err.message || "Failed to accept friend request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle rejecting a friend request
  const handleRejectRequest = async (friendshipId: string) => {
    setProcessingId(`reject-${friendshipId}`);
    const request = pendingRequests.find((req) => req.id === friendshipId);
    try {
      // Optimistic update: remove from pending
      setPendingRequests((prev) => prev.filter((req) => req.id !== friendshipId));

      await rejectFriendRequest(friendshipId);

      // Refetch to ensure consistency
      const updatedPending = await getPendingRequests();
      setPendingRequests(updatedPending);
    } catch (err: any) {
      // Rollback optimistic update
      setPendingRequests((prev) => [request, ...prev]);
      setError(err.message || "Failed to reject friend request");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle removing a friend
  const handleRemoveFriend = async (friendshipId: string) => {
    setProcessingId(`remove-${friendshipId}`);
    const friend = friends.find((f) => f.id === friendshipId);
    try {
      // Optimistic update: remove from friends
      if (friend) {
        setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
      }

      await removeFriend(friendshipId);

      // Refetch to ensure consistency
      const updatedFriends = await getFriendList();
      setFriends(updatedFriends);
    } catch (err: any) {
      // Rollback optimistic update
      setFriends((prev) => [friend, ...prev]);
      setError(err.message || "Failed to remove friend");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle search
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setProcessingId("search");
    try {
      const results = await searchLearners(query);
      setSearchResults(results);
    } catch (err: any) {
      setError(err.message || "Search failed");
    } finally {
      setProcessingId(null);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: "pending" | "friends" | "search") => {
    setActiveTab(tab);
    if (tab === "search" && searchQuery) {
      handleSearch(searchQuery);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading friends...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-2">
          <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-label-sm text-xs font-black uppercase tracking-wider border border-pink-200">
            👥 Social Learning
          </span>
          <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 font-label-sm text-xs font-black uppercase tracking-wider border border-green-200">
            {friends.length} Friends
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleSearch(searchQuery)}
            placeholder="Search learners..."
            className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:outline-none max-w-xs sm:max-w-md"
          />
          <LoadingButton
            onClick={() => handleSearch(searchQuery)}
            disabled={!searchQuery.trim()}
            isLoading={processingId === "search"}
            loadingText="Searching..."
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </LoadingButton>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="flex border-b border-surface-border mb-6">
        <button
          onClick={() => handleTabChange("pending")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-md font-semibold transition-all relative ${
            activeTab === "pending"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-primary hover:bg-gray-50"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span>Pending Requests ({pendingRequests.length})</span>
        </button>
        <button
          onClick={() => handleTabChange("friends")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-md font-semibold transition-all relative ${
            activeTab === "friends"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-primary hover:bg-gray-50"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">group</span>
          <span>Friends ({friends.length})</span>
        </button>
        <button
          onClick={() => handleTabChange("search")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label-md font-semibold transition-all relative ${
            activeTab === "search"
              ? "text-primary border-b-2 border-primary"
              : "text-text-muted hover:text-text-primary hover:bg-gray-50"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Find Friends</span>
        </button>
      </div>

      {/* ── Pending Requests Tab ────────────────────────────────────── */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-[48px] mb-3 block">notifications_none</span>
              <p>No pending friend requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={request.requester.avatarUrl || "/default-avatar.png"}
                        alt={`${request.requester.displayName}'s avatar`}
                        className="w-10 h-10 rounded-full border-2 border-gray-200"
                      />
                      <div>
                        <p className="font-body-sm text-on-surface">{request.requester.displayName}</p>
                        <p className="font-body-xs text-on-surface-variant">
                          {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <LoadingButton
                        onClick={() => handleAcceptRequest(request.id)}
                        isLoading={processingId === `accept-${request.id}`}
                        loadingText="Accepting..."
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-xs font-bold text-white hover:opacity-90 transition-colors"
                      >
                        Accept
                      </LoadingButton>
                      <LoadingButton
                        onClick={() => handleRejectRequest(request.id)}
                        isLoading={processingId === `reject-${request.id}`}
                        loadingText="Rejecting..."
                        className="px-3 py-1.5 rounded-full bg-gradient-to-r from-red-400 to-rose-500 text-xs font-bold text-white hover:opacity-90 transition-colors"
                      >
                        Reject
                      </LoadingButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Friends Tab ─────────────────────────────────────────────── */}
      {activeTab === "friends" && (
        <div className="space-y-4">
          {friends.length === 0 ? (
             <div className="text-center py-12 text-gray-500">
               <span className="material-symbols-outlined text-[48px] mb-3 block">groups</span>
               <p>You don't have any friends yet</p>
               <p className="text-sm text-gray-400 mt-2">Send friend requests to connect with other learners</p>
             </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <div key={friend.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={friend.avatarUrl || "/default-avatar.png"}
                      alt={`${friend.displayName}'s avatar`}
                      className="w-16 h-16 rounded-full border-2 border-gray-200 mb-2"
                    />
                    <p className="font-body-md text-on-surface">{friend.displayName}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs">
                        {friend.xp} XP
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-xs">
                        {friend.streakCount} Day Streak
                      </span>
                    </div>
                    <LoadingButton
                      onClick={() => handleRemoveFriend(friend.id)}
                      isLoading={processingId === `remove-${friend.id}`}
                      loadingText="Removing..."
                      className="mt-3 w-full px-4 py-2 rounded-full bg-gradient-to-r from-red-400 to-rose-500 text-white font-bold text-xs hover:opacity-90 transition-colors"
                    >
                      Remove Friend
                    </LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Search Tab ──────────────────────────────────────────────── */}
      {activeTab === "search" && (
        <div className="space-y-4">
          {searchResults.length === 0 ? (
             <div className="text-center py-12 text-gray-500">
               <span className="material-symbols-outlined text-[48px] mb-3 block">person_add</span>
               <p>{searchQuery ? `No users found for "${searchQuery}"` : "Start searching to find friends"}</p>
             </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => (
                <div key={user.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl || "/default-avatar.png"}
                        alt={`${user.displayName}'s avatar`}
                        className="w-10 h-10 rounded-full border-2 border-gray-200"
                      />
                      <div>
                        <p className="font-body-sm text-on-surface">{user.displayName}</p>
                        <p className="font-body-xs text-on-surface-variant">
                          {user.xp} XP • {user.streakCount} Day Streak
                        </p>
                      </div>
                    </div>
                    <LoadingButton
                      onClick={() => handleSendRequest(user.id)}
                      isLoading={processingId === `send-${user.id}`}
                      loadingText="Adding..."
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold hover:opacity-90 transition-colors"
                    >
                      Add Friend
                    </LoadingButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Suggestions Section (always visible at bottom) ──────────── */}
      <div className="mt-8 pt-6 border-t border-surface-border">
        <h2 className="font-label-md text-on-surface mb-4">Suggested Friends</h2>
        {suggestions.length === 0 ? (
          <p className="text-center text-gray-500">No suggestions available</p>
        ) : (
          <div className="flex flex-wrap gap-4 justify-center">
            {suggestions.map((user) => (
              <div key={user.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                <img
                  src={user.avatarUrl || "/default-avatar.png"}
                  alt={`${user.displayName}'s avatar`}
                  className="w-12 h-12 rounded-full border-2 border-gray-200 mb-2"
                />
                <p className="font-body-sm text-on-surface">{user.displayName}</p>
                <LoadingButton
                  onClick={() => handleSendRequest(user.id)}
                  isLoading={processingId === `send-${user.id}`}
                  loadingText="Adding..."
                  className="mt-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-xs hover:opacity-90 transition-colors"
                >
                  Add Friend
                </LoadingButton>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}