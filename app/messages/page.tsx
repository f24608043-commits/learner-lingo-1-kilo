import { getConversations, getUnreadCount } from "../messaging/actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Mascot from "@/components/Mascot";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const [conversations, unreadCount] = await Promise.all([
    getConversations(),
    getUnreadCount(),
  ]);

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
      {conversations.length === 0 ? (
        <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
          <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
            <Mascot pose="empty" size={64} />
          </div>
          <h3 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-2">No conversations yet</h3>
          <p className="font-body-md text-text-muted">
            Start messaging tutors or friends to begin chatting!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((item: any) => (
            <Link
              key={item.conversation.id}
              href={`/messages/${item.conversation.id}`}
              className="block"
            >
              <div className="rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 transform hover:scale-[1.02] transition-all active:scale-[0.98]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-label-md text-on-surface font-semibold truncate">
                        {item.conversation.type === "group" ? item.conversation.title : "Direct Message"}
                      </h3>
                      {item.unreadCount > 0 && (
                        <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    {item.lastMessage && (
                      <p className="font-body-sm text-on-surface-variant truncate">
                        {item.lastMessage.body}
                      </p>
                    )}
                    <p className="font-body-xs text-on-surface-variant mt-1">
                      {item.conversation.lastMessageAt
                        ? new Date(item.conversation.lastMessageAt).toLocaleDateString()
                        : "No messages yet"}
                    </p>
                  </div>
                  {item.conversation.type === "group" && item.conversation.jitsiRoomId && (
                    <a
                      href={`https://meet.jit.si/${item.conversation.jitsiRoomId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-2 font-label-sm font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">videocam</span>
                      Join Class
                    </a>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
