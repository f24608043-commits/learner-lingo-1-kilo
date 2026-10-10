"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { ConversationsList } from "./ConversationsList";
import { Skeleton, ListSkeleton } from "@/components/Skeleton";
import Mascot from "@/components/Mascot";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Conversation {
  conversation: {
    id: string;
    type: "direct" | "group";
    title: string | null;
    jitsiRoomId: string | null;
    lastMessageAt: string | null;
  };
  lastMessage: { body: string } | null;
  unreadCount: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showThread, setShowThread] = useState(false);

  // Extract conversation ID from URL
  useEffect(() => {
    const match = pathname.match(/\/messages\/([^/]+)/);
    if (match) {
      setSelectedConversationId(match[1]);
      if (isMobile) setShowThread(true);
    } else {
      setSelectedConversationId(null);
      setShowThread(false);
    }
  }, [pathname, isMobile]);

  // Handle conversation selection
  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    if (isMobile) {
      setShowThread(true);
      router.push(`/messages/${id}`);
    } else {
      router.push(`/messages/${id}`);
    }
  }, [router, isMobile]);

  // Handle back button on mobile
  const handleBack = useCallback(() => {
    setShowThread(false);
    setSelectedConversationId(null);
    router.push("/messages");
  }, [router]);

  // Fetch conversations
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

  // Show selected conversation thread
  const selectedConversation = conversations.find(c => c.conversation.id === selectedConversationId);

  if (loading) {
    return (
      <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
        <MessagesHeaderSkeleton />
        <div className="flex gap-4">
          <aside className="w-full lg:w-96 flex-shrink-0">
            <ListSkeleton count={5} />
          </aside>
          {(!isMobile || showThread) && (
            <main className="flex-1 min-w-0">
              <MessageThreadSkeleton />
            </main>
          )}
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

  // Mobile: show either list or thread
  if (isMobile) {
    return showThread && selectedConversation ? (
      <MessageThreadMobile 
        conversation={selectedConversation} 
        onBack={handleBack}
      />
    ) : (
      <MessagesListView 
        conversations={conversations} 
        unreadCount={unreadCount}
        onSelectConversation={handleSelectConversation}
      />
    );
  }

  // Desktop: split view
  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
      <MessagesHeader conversations={conversations} unreadCount={unreadCount} />
      
      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px]">
        {/* Sidebar - Conversation List */}
        <aside className="w-full lg:w-96 flex-shrink-0 bg-white rounded-3xl shadow-clay-surface border border-surface-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-border">
            <h2 className="font-label-md text-on-surface font-extrabold">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationsList 
              conversations={conversations} 
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversationId}
            />
          </div>
        </aside>

        {/* Main - Message Thread */}
        <main className="flex-1 min-w-0 bg-white rounded-3xl shadow-clay-surface border border-surface-border flex flex-col overflow-hidden">
          {selectedConversation ? (
            <MessageThreadDesktop 
              conversation={selectedConversation} 
              conversationId={selectedConversationId!}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
                <Mascot pose="empty" size={64} />
              </div>
              <h3 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-2">Select a conversation</h3>
              <p className="font-body-md text-text-muted">Choose a conversation from the left to start messaging</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Skeleton components
function MessagesHeaderSkeleton() {
  return (
    <div className="relative w-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-1 shadow-2xl overflow-hidden mb-6">
      <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/40 pointer-events-none"></div>
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}

function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <Skeleton className="h-16 w-full px-6" />
      <div className="flex-1 overflow-y-auto p-6">
        <ListSkeleton count={5} />
      </div>
      <Skeleton className="h-20 w-full px-6 border-t border-surface-border" />
    </div>
  );
}

// Desktop split view components
function MessagesHeader({ conversations, unreadCount }: { conversations: Conversation[], unreadCount: number }) {
  return (
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
  );
}

function MessageThreadDesktop({ conversation, conversationId }: { conversation: Conversation, conversationId: string }) {
  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => window.history.back()}>
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold">
              {conversation.conversation.type === "group" ? conversation.conversation.title || "Group Chat" : "Direct Message"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation.conversation.type === "group" && conversation.conversation.jitsiRoomId && (
            <a
              href={`https://meet.jit.si/${conversation.conversation.jitsiRoomId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 font-label-sm font-bold shadow-xl border-4 border-white/30 transform hover:scale-105 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">videocam</span>
              Join Class
            </a>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <MessageThreadContent conversationId={conversationId} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-6 pt-4 pb-4 md:pb-28 shrink-0">
        <MessageInputArea conversationId={conversationId} />
      </div>
    </div>
  );
}

function MessageThreadContent({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        setCurrentUser(user);

        const { data: initialMessages } = await supabase
          .from("messages")
          .select(`
            id,
            body,
            created_at,
            sender_id,
            profiles!inner(id, display_name, avatar_url)
          `)
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true })
          .limit(100);

        if (mounted && initialMessages) {
          setMessages(initialMessages.map((msg: any) => ({
            message: {
              id: msg.id,
              body: msg.body,
              createdAt: new Date(msg.created_at),
            },
            sender: {
              id: msg.sender_id,
              displayName: msg.profiles?.display_name,
              avatarUrl: msg.profiles?.avatar_url,
            },
          })));
        }
        setIsLoading(false);

        // Subscribe to real-time updates
        if (!isSubscribedRef.current) {
          const channel = supabase
            .channel(`messages:${conversationId}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "messages",
                filter: `conversation_id=eq.${conversationId}`,
              },
              async (payload) => {
                if (payload.new.sender_id === currentUser?.id) return;

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id, display_name, avatar_url")
                  .eq("id", payload.new.sender_id)
                  .single();

                const newMessage = {
                  message: {
                    id: payload.new.id,
                    body: payload.new.body,
                    createdAt: new Date(payload.new.created_at),
                  },
                  sender: {
                    id: profile?.id || payload.new.sender_id,
                    displayName: profile?.display_name,
                    avatarUrl: profile?.avatar_url,
                  },
                };

                setMessages((prev) => [...prev, newMessage]);
              }
            )
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                isSubscribedRef.current = true;
              }
            });

          channelRef.current = channel;
        }
      } catch (error) {
        console.error("Error loading messages:", error);
        if (mounted) setIsLoading(false);
      }
    }

    loadInitialData();

    return () => {
      mounted = false;
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current);
        isSubscribedRef.current = false;
      }
    };
  }, [conversationId, currentUser]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <p className="font-body-md">No messages yet. Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <MessageBubble key={msg.message.id} message={msg} currentUserId={currentUser?.id} />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

function MessageBubble({ message, currentUserId }: { message: any, currentUserId: string }) {
  const isOwn = message.sender.id === currentUserId;
  return (
    <div
      data-testid="message-bubble"
      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${isOwn
        ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
        : "bg-white border-2 border-gray-200 shadow-sm"}`}>
        {!isOwn && message.sender.displayName && (
          <p className="font-label-sm font-semibold mb-1">{message.sender.displayName}</p>
        )}
        <p className="font-body-sm">{message.message.body}</p>
        <p className="font-body-xs mt-1 opacity-70">
          {new Date(message.message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function MessageInputArea({ conversationId }: { conversationId: string }) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending || !currentUser) return;

    const tempMessage = newMessage;
    setNewMessage("");
    setIsSending(true);

    // Optimistic update
    const optimisticMessage = {
      message: { id: "temp", body: tempMessage, createdAt: new Date() },
      sender: { id: currentUser.id, displayName: currentUser.user_metadata?.display_name, avatarUrl: currentUser.user_metadata?.avatar_url },
    };
    
    // We'll rely on the real-time subscription to add the actual message
    try {
      const supabase = createClient();
      const { data: insertedMessage, error } = await supabase
        .from("messages")
        .insert({ conversationId, senderId: currentUser.id, body: tempMessage })
        .select()
        .single();

      if (error) throw error;
    } catch (error: any) {
      console.error("Error sending message:", error);
      alert(error.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex gap-3">
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSend()}
        placeholder="Type a message..."
        className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
        disabled={isSending}
        maxLength={2000}
      />
      <button
        onClick={handleSend}
        disabled={!newMessage.trim() || isSending}
        className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">send</span>
      </button>
    </div>
  );
}

// Mobile views
function MessagesListView({ conversations, unreadCount, onSelectConversation }: { conversations: Conversation[], unreadCount: number, onSelectConversation: (id: string) => void }) {
  return (
    <div className="w-full px-6 py-6 bg-gradient-to-br from-background via-blue-50 to-purple-50 min-h-screen">
      <MessagesHeader conversations={conversations} unreadCount={unreadCount} />
      <div className="space-y-3">
        {conversations.length === 0 ? (
          <div className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-8 text-center shadow-xl border-4 border-white/50">
            <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center overflow-hidden shadow-xl mx-auto mb-4 border-4 border-white/30">
              <Mascot pose="empty" size={64} />
            </div>
            <h3 className="font-headline-md text-headline-md text-text-primary font-extrabold mb-2">No conversations yet</h3>
            <p className="font-body-md text-text-muted">Start messaging tutors or friends to begin chatting!</p>
          </div>
        ) : (
          <ConversationsList conversations={conversations} onSelectConversation={onSelectConversation} />
        )}
      </div>
    </div>
  );
}

function MessageThreadMobile({ conversation, onBack }: { conversation: Conversation, onBack: () => void }) {
  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-br from-background via-blue-50 to-purple-50">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 p-2">
          <span className="material-symbols-outlined text-[24px]">arrow_back</span>
        </button>
        <div className="flex-1 text-center">
          <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold truncate">
            {conversation.conversation.type === "group" ? conversation.conversation.title || "Group Chat" : "Direct Message"}
          </h1>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <MessageThreadContent conversationId={conversation.conversation.id} />
      </div>

      <div className="bg-white border-t border-gray-200 px-4 pt-3 pb-3 md:pb-20 shrink-0">
        <MessageInputArea conversationId={conversation.conversation.id} />
      </div>
    </div>
  );
}

// Add missing imports
import { useRef } from "react";
import { LoadingButton } from "@/components/LoadingButton";