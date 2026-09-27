"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface NotificationBellProps {
  count: number;
}

export default function NotificationBell({ count }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full bg-surface hover:bg-surface-container transition-colors ${
          count > 0 ? "text-primary" : "text-text-muted"
        }`}
        aria-label={`Notifications ${count > 0 ? `(${count})` : ""}`}
      >
        <span className="material-symbols-outlined text-[24px]">{count > 0 ? "notifications_active" : "notifications_none"}</span>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border-4 border-surface-border overflow-hidden z-50 animate-pop-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-t-2xl">
            <h3 className="font-label-lg font-bold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-xs font-bold bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            <nav>
              <a href="/notifications" className="block px-4 py-3 border-b border-surface-border hover:bg-surface hover:bg-primary/5 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">notifications</span>
                  <span className="font-label-md font-bold text-text-primary">View All Notifications</span>
                </div>
              </a>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-text-muted">
                  <span className="material-symbols-outlined text-4xl mb-2 block">notifications_none</span>
                  <p className="font-body-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notif: any) => (
                  <a
                    key={notif.id}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      markAsRead(notif.id);
                    }}
                    className={`block px-4 py-3 border-b border-surface-border hover:bg-surface hover:bg-primary/5 transition-colors ${!notif.isRead ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notif.isRead ? "bg-primary text-white" : "bg-gray-100 text-gray-500"}`}>
                        <span className="material-symbols-outlined text-[20px]">{notif.type === "badge_earned" ? "military_tech" : notif.type === "friend_request" ? "person_add" : notif.type === "lesson_completed" ? "check_circle" : "notifications"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-label-sm ${!notif.isRead ? "font-bold text-text-primary" : "text-text-muted"}`}>{notif.title}</p>
                        <p className="font-body-sm text-text-muted truncate">{notif.message}</p>
                        <p className="font-body-xs text-text-muted mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                      </div>
                      {!notif.isRead && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />}
                    </div>
                  </a>
                )))}
              <a href="/notifications" className="block px-4 py-3 text-center text-primary font-label-md font-bold hover:bg-surface hover:bg-primary/5 transition-colors border-t border-surface-border">
                View All Notifications
              </a>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}