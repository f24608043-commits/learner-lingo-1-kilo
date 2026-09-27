import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from "./actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Mascot from "@/components/Mascot";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadCount()
  ]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6 min-h-screen">
      {/* ── Header with Mascot ─────────────────────────────────── */}
      <div className="relative w-full rounded-3xl bg-white p-6 md:p-8 shadow-clay-surface border border-surface-border overflow-hidden mb-6 animate-slide-up">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary-dark font-label-sm text-xs font-black uppercase tracking-wider border border-primary/20">
                🔔 Activity Center
              </span>
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-label-sm text-xs font-black uppercase tracking-wider border border-red-200 animate-pulse">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <h1 className="font-headline-xl text-text-primary tracking-tight font-black text-2xl md:text-3xl">
              Notifications & Feed 📬
            </h1>
            <p className="font-body-sm text-text-muted">
              Track your friend activity, badge awards, streak milestones, and system alerts.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-24 h-24 hidden sm:flex items-center justify-center animate-float">
              <Mascot pose="idle" size={96} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Header Actions ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">notifications_active</span>
          <h2 className="font-headline-md text-text-primary font-black text-lg">Recent Alerts</h2>
        </div>

        {unreadCount > 0 && (
          <form action={async () => {
            "use server";
            await markAllAsRead();
          }}>
            <button
              type="submit"
              className="font-label-sm text-primary hover:text-primary-dark font-bold text-xs hover:underline cursor-pointer"
            >
              Mark all as read ✓
            </button>
          </form>
        )}
      </div>

      {/* ── Notifications List ───────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center shadow-clay-surface border border-surface-border animate-pop-in">
          <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center overflow-hidden border-4 border-white shadow-inner">
            <Mascot pose="empty" size={80} />
          </div>
          <h3 className="font-headline-md text-text-primary font-black mb-1">You&apos;re all caught up!</h3>
          <p className="font-body-sm text-text-muted max-w-sm mx-auto">
            Check back later for streak milestones, friend updates, and course progress.
          </p>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up delay-75">
          {notifications.map((notification: any, idx: number) => (
            <div
              key={notification.id}
              className={`rounded-3xl bg-white p-4 sm:p-5 shadow-clay-surface border transition-all ${
                !notification.isRead
                  ? "border-l-4 border-l-primary border-primary/20 bg-green-50/20"
                  : "border-surface-border opacity-90"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl shrink-0 shadow-sm border border-gray-200">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`font-label-md font-black text-sm sm:text-base ${!notification.isRead ? "text-primary-dark" : "text-text-primary"}`}>
                      {notification.title}
                    </h3>
                    <p className="font-body-sm text-text-muted text-xs sm:text-sm mt-0.5">{notification.message}</p>
                    <p className="font-body-sm text-gray-400 text-xs mt-1">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!notification.isRead && (
                    <form action={async () => {
                      "use server";
                      await markAsRead(notification.id);
                    }}>
                      <button
                        type="submit"
                        className="rounded-xl bg-primary/10 text-primary-dark px-3 py-1.5 font-label-sm font-bold text-xs hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        Read
                      </button>
                    </form>
                  )}
                  <form action={async () => {
                    "use server";
                    await deleteNotification(notification.id);
                  }}>
                    <button
                      type="submit"
                      className="text-gray-400 hover:text-red-500 font-bold p-1 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case "friend_request":
      return "👋";
    case "friend_accepted":
      return "🤝";
    case "badge_earned":
      return "🏆";
    case "streak_milestone":
      return "🔥";
    case "lesson_completed":
      return "✅";
    case "leaderboard_rank":
      return "📊";
    default:
      return "🔔";
  }
}
