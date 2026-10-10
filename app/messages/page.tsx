"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Mascot from "@/components/Mascot";
import { ConversationsList } from "./ConversationsList";
import { Skeleton, CardSkeleton } from "@/components/Skeleton";

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/sign-in");
          return;
        }

        const [convs, unread] = await Promise.all([
          fetch("/api/messaging/conversations").then(r => r.json()),
          fetch("/api/messaging/unread-count").then(r => r.json()),
        ]);
        
        setConversations(convs);
        setUnreadCount(unread);
      } catch (err: any) {
        setError(err.message || "Failed to load conversations");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (loading) {
    return (
      <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
        {/* Header */}
        <div className="relative w-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
          <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-secondary-container text-[28px]" style={{ fontVariationSettings: 'FILL 1' }}>chat</span>
                <div>
                  <h1 className="font-headline-xl text-headline-xl text-on-secondary-container font-extrabold">Messages</h1>
                  <p className="font-body-sm text-on-surface-variant">Loading...</p>
                </div>
              </div>
              <div className="w-16 h-16 shrink-0">
                <Mascot pose="idle" size={64} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 animate-pulse">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-5 w-32 bg-gray-200 rounded" />
                  </div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded mb-1" />
                  <div className="h-3 w-1/4 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
        <div className="rounded-2xl bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
      {/* Header */}
      <div className="relative w-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
        <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-secondary-container text-[28px]" style={{ fontVariationSettings: 'FILL 1' }}>chat</span>
              <div>
                <h1 className="font-headline-xl text-headline-xl text-on-secondary-container font-extrabold">Messages</h1>
                <p className="font-body-sm text-on-surface-variant">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : "All caught up!"}
                </p>
              </div>
            </div>
            <div className="w-16 h-16 shrink-0">
              <Mascot pose="idle" size={64} />
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <ConversationsList conversations={conversations} />
    </div>
  );
}