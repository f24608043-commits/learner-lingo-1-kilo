"use client";

import { useRouter } from "next/navigation";
import Mascot from "@/components/Mascot";
import Link from "next/link";

interface ConversationItemProps {
  conversation: {
    id: string;
    type: "direct" | "group";
    title: string | null;
    jitsiRoomId: string | null;
    lastMessageAt: string | null;
  };
  lastMessage: {
    body: string;
  } | null;
  unreadCount: number;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export function ConversationItem({ conversation, lastMessage, unreadCount, onSelect, isSelected }: ConversationItemProps) {
  const router = useRouter();

  const handleRowClick = () => {
    if (onSelect) {
      onSelect(conversation.id);
    } else {
      router.push(`/messages/${conversation.id}`);
    }
  };

  return (
    <div
      data-testid="conversation-item"
      onClick={handleRowClick}
      className={`rounded-2xl bg-gradient-to-br from-white to-blue-50 p-5 shadow-xl border-4 border-blue-100 transform hover:scale-[1.02] transition-all active:scale-[0.98] cursor-pointer ${
        isSelected ? "bg-tertiary/20 border-tertiary/50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-label-md text-on-surface font-semibold truncate">
              {conversation.type === "group" ? conversation.title : "Direct Message"}
            </h3>
            {unreadCount > 0 && (
              <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {lastMessage && (
            <p className="font-body-sm text-on-surface-variant truncate">
              {lastMessage.body}
            </p>
          )}
          <p className="font-body-xs text-on-surface-variant mt-1">
            {conversation.lastMessageAt
              ? new Date(conversation.lastMessageAt).toLocaleDateString()
              : "No messages yet"}
          </p>
        </div>
        {conversation.type === "group" && conversation.jitsiRoomId && (
          <a
            href={`https://meet.jit.si/${conversation.jitsiRoomId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(e.currentTarget.href, "_blank", "noopener,noreferrer");
            }}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white px-3 py-2 font-label-sm font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">videocam</span>
            Join Class
          </a>
        )}
      </div>
    </div>
  );
}

interface ConversationsListProps {
  conversations: Array<{
    conversation: {
      id: string;
      type: "direct" | "group";
      title: string | null;
      jitsiRoomId: string | null;
      lastMessageAt: string | null;
    };
    lastMessage: {
      body: string;
    } | null;
    unreadCount: number;
  }>;
  onSelectConversation?: (id: string) => void;
  selectedConversationId?: string | null;
}

export function ConversationsList({ conversations, onSelectConversation, selectedConversationId }: ConversationsListProps) {
  return (
    <div className="space-y-3">
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
        conversations.map((item) => (
          <ConversationItem
            key={item.conversation.id}
            conversation={item.conversation}
            lastMessage={item.lastMessage}
            unreadCount={item.unreadCount}
            onSelect={onSelectConversation}
            isSelected={item.conversation.id === selectedConversationId}
          />
        ))
      )}
    </div>
  );
}