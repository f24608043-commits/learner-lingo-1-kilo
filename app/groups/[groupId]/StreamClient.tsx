"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  createAnnouncement,
  createComment,
  deleteAnnouncement,
  deleteComment,
} from "@/app/groups/actions";
import { formatDateTime } from "@/utils/formatDate";

export type Announcement = {
  id: string;
  title: string;
  content: string | null;
  pinned: boolean;
  createdAt: Date;
  authorName: string | null;
  commentCount: number;
};

export type StreamComment = {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: Date;
  userId: string;
  authorName: string | null;
  authorRole: string | null;
};

export type ChatMessage = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export default function StreamClient({
  groupId,
  announcements: initialAnnouncements,
  comments: initialComments,
  isTutor,
  currentUserId,
  currentUserName,
}: {
  groupId: string;
  announcements: Announcement[];
  comments: StreamComment[];
  isTutor: boolean;
  currentUserId: string;
  currentUserName: string;
}) {
  const router = useRouter();
  // Announcements and comments are server data: read them straight from props.
  // Copying them into useState would freeze the first render, so a
  // router.refresh() after posting would never show the new item.
  const announcements = initialAnnouncements;
  const comments = initialComments;
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string | null } | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  const reload = useCallback(() => router.refresh(), [router]);

  // Realtime: live announcements, comments and group chat.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`group:${groupId}`, { config: { presence: { key: currentUserId } } })
      .on(
        "broadcast",
        { event: "chat" },
        ({ payload }) => {
          setChat((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]));
        }
      )
      .on("broadcast", { event: "comment" }, () => reload())
      .on("broadcast", { event: "announcement" }, () => reload())
      .on("presence", { event: "sync" }, () => {
        /* presence kept for future member indicators */
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [groupId, currentUserId, reload]);

  function broadcast(event: string, payload: unknown) {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }

  function handleSendChat(event: React.FormEvent) {
    event.preventDefault();
    const content = chatDraft.trim();
    if (!content) return;

    const message: ChatMessage = {
      id: `${currentUserId}-${Date.now()}`,
      authorId: currentUserId,
      authorName: currentUserName,
      content,
      createdAt: new Date().toISOString(),
    };

    setChat((prev) => [...prev, message]);
    broadcast("chat", message);
    setChatDraft("");
  }

  function handlePostComment(event: React.FormEvent) {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content) return;

    startTransition(async () => {
      try {
        await createComment({
          groupId,
          content,
          targetType: "group",
          parentId: replyTo?.id ?? null,
        });
        setCommentDraft("");
        setReplyTo(null);
        broadcast("comment", { at: Date.now() });
        reload();
        toast.success("Comment posted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not post comment");
      }
    });
  }

  function handleCreateAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    const title = announcementTitle.trim();
    if (!title) {
      toast.error("Give the announcement a title");
      return;
    }

    startTransition(async () => {
      try {
        await createAnnouncement({ groupId, title, content: announcementBody });
        setAnnouncementTitle("");
        setAnnouncementBody("");
        setShowAnnouncementForm(false);
        broadcast("announcement", { at: Date.now() });
        reload();
        toast.success("Announcement posted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not post announcement");
      }
    });
  }

  function handleDeleteAnnouncement(id: string) {
    startTransition(async () => {
      try {
        await deleteAnnouncement(id);
        reload();
        toast.success("Announcement deleted");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete");
      }
    });
  }

  function handleDeleteComment(id: string) {
    startTransition(async () => {
      try {
        await deleteComment(id);
        reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete");
      }
    });
  }

  const rootComments = comments.filter((c) => !c.parentId);
  const repliesFor = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem] items-start">
      <div className="flex flex-col gap-5 min-w-0">
        <section className="clay-card p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg font-extrabold">Announcements</h2>
            {isTutor && (
              <button
                type="button"
                onClick={() => setShowAnnouncementForm((v) => !v)}
                className="clay-btn bg-primary text-white px-4 py-2 text-xs"
                data-testid="toggle-announcement-form"
              >
                {showAnnouncementForm ? "Cancel" : "New announcement"}
              </button>
            )}
          </div>

          {showAnnouncementForm && (
            <form onSubmit={handleCreateAnnouncement} className="flex flex-col gap-3 mb-5" data-testid="announcement-form">
              <input
                value={announcementTitle}
                onChange={(e) => setAnnouncementTitle(e.target.value)}
                placeholder="Title"
                aria-label="Announcement title"
                className="rounded-2xl border-2 border-black/5 bg-white px-4 py-3 font-bold focus:outline-none focus:border-primary/40"
                data-testid="announcement-title-input"
              />
              <textarea
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                placeholder="What do your learners need to know?"
                aria-label="Announcement body"
                rows={4}
                className="rounded-2xl border-2 border-black/5 bg-white px-4 py-3 focus:outline-none focus:border-primary/40"
                data-testid="announcement-body-input"
              />
              <button
                type="submit"
                disabled={isPending}
                className="clay-btn bg-primary text-white px-5 py-2.5 self-start disabled:opacity-60"
                data-testid="announcement-submit"
              >
                Post announcement
              </button>
            </form>
          )}

          {announcements.length === 0 ? (
            <p className="text-sm text-on-surface/60" data-testid="announcements-empty">
              No announcements yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3" data-testid="announcement-list">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-2xl bg-background/60 p-4" data-testid="announcement-item">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold">
                        {a.pinned && <span className="text-secondary mr-1" title="Pinned">📌</span>}
                        {a.title}
                      </h3>
                      <p className="text-xs font-semibold text-on-surface/50 mt-0.5">
                        {a.authorName ?? "Tutor"} · {new Date(a.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
                      </p>
                    </div>
                    {isTutor && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(a.id)}
                        className="text-xs font-bold text-error shrink-0"
                        data-testid="delete-announcement"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {a.content && <p className="text-sm mt-2 whitespace-pre-wrap">{a.content}</p>}
                  <p className="text-xs text-on-surface/50 mt-2">{a.commentCount} comment(s)</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="clay-card p-5">
          <h2 className="font-display text-lg font-extrabold mb-4">Discussion</h2>

          <form onSubmit={handlePostComment} className="flex flex-col gap-2 mb-5">
            {replyTo && (
              <div className="flex items-center justify-between rounded-xl bg-tertiary/10 px-3 py-2 text-xs font-bold">
                <span>Replying to {replyTo.name ?? "comment"}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="underline">
                  Cancel
                </button>
              </div>
            )}
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={replyTo ? "Write a reply" : "Start a discussion"}
              aria-label="Comment text"
              rows={3}
              className="rounded-2xl border-2 border-black/5 bg-white px-4 py-3 focus:outline-none focus:border-primary/40"
              data-testid="comment-input"
            />
            <button
              type="submit"
              disabled={isPending}
              className="clay-btn bg-primary text-white px-5 py-2.5 self-start disabled:opacity-60"
              data-testid="comment-submit"
            >
              Post comment
            </button>
          </form>

          {rootComments.length === 0 ? (
            <p className="text-sm text-on-surface/60" data-testid="comments-empty">
              No comments yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-4" data-testid="comment-list">
              {rootComments.map((comment) => (
                <li key={comment.id} data-testid="comment-item">
                  <div className="rounded-2xl bg-background/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{comment.authorName ?? "Member"}</p>
                        <p className="text-xs text-on-surface/50">
                          {new Date(comment.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setReplyTo({ id: comment.id, name: comment.authorName })}
                          className="text-xs font-bold text-primary"
                          data-testid="reply-comment"
                        >
                          Reply
                        </button>
                        {(isTutor || comment.userId === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs font-bold text-error"
                            data-testid="delete-comment"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm mt-2 whitespace-pre-wrap">{comment.content}</p>
                  </div>

                  {repliesFor(comment.id).length > 0 && (
                    <ul className="mt-2 ml-6 flex flex-col gap-2">
                      {repliesFor(comment.id).map((reply) => (
                        <li key={reply.id} className="rounded-2xl bg-background/40 p-3" data-testid="comment-reply">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-bold">{reply.authorName ?? "Member"}</p>
                            {(isTutor || reply.userId === currentUserId) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(reply.id)}
                                className="text-xs font-bold text-error shrink-0"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <aside className="clay-card p-5 flex flex-col gap-3 lg:sticky lg:top-4">
        <h2 className="font-display text-lg font-extrabold">Group chat</h2>
        <p className="text-xs text-on-surface/60">Live messages for everyone in this group.</p>

        <ul
          className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1"
          data-testid="chat-messages"
        >
          {chat.length === 0 && <li className="text-xs text-on-surface/50">No messages yet.</li>}
          {chat.map((m) => (
            <li
              key={m.id}
              className={`rounded-2xl px-3 py-2 text-sm ${
                m.authorId === currentUserId ? "bg-primary/15 self-end" : "bg-background/60"
              }`}
            >
              <p className="text-xs font-bold text-on-surface/60">{m.authorName}</p>
              <p>{m.content}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            placeholder="Message the group"
            aria-label="Chat message"
            className="flex-1 rounded-2xl border-2 border-black/5 bg-white px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
            data-testid="chat-input"
          />
          <button
            type="submit"
            className="clay-btn bg-primary text-white px-4 py-2 text-xs"
            data-testid="chat-send"
          >
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}