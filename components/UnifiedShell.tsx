"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import SessionReminders from "./SessionReminders";

interface UnifiedShellProps {
  children: React.ReactNode;
  role: "learner" | "tutor" | "admin";
  initialXp?: number;
  initialStreak?: number;
  initialDisplayName?: string;
}

export default function UnifiedShell({ 
  children, 
  role, 
  initialXp = 0, 
  initialStreak = 0, 
  initialDisplayName = "" 
}: UnifiedShellProps) {
  const pathname = usePathname();
  const [xp, setXp] = useState(initialXp);
  const [streak, setStreak] = useState(initialStreak);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [level, setLevel] = useState(Math.floor(Math.sqrt((initialXp || 0) / 100)) + 1);
  const [userId, setUserId] = useState<string | null>(null);

  // Only fetch if we don't have initial data (fallback for pages not using server-side data)
  useEffect(() => {
    if (initialXp > 0 || initialDisplayName) {
      return;
    }

    let mounted = true;
    async function loadUserData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && mounted) {
        setUserId(user.id);
        try {
          const response = await fetch(`/api/profile/${user.id}`, { 
            cache: 'no-store' // Ensure fresh data but don't block
          });
          if (response.ok && mounted) {
            const profile = await response.json();
            setXp(profile.xp || 0);
            setStreak(profile.streak_count || 0);
            setDisplayName(profile.display_name || "");
            setLevel(Math.floor(Math.sqrt((profile.xp || 0) / 100)) + 1);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      }
    }
    loadUserData();
    return () => { mounted = false; };
  }, [initialXp, initialDisplayName]);

  // Role-specific configuration
  const isLearner = role === "learner";
  const isTutor = role === "tutor";
  const isAdmin = role === "admin";
  
  const logoIcon = isLearner ? "terminal" : isAdmin ? "admin_panel_settings" : "school";
  const roleLabel = isLearner ? "Learner Desk" : isAdmin ? "Admin Panel" : "Tutor Portal";
  const headerLabel = isLearner ? "Python Fundamentals" : isAdmin ? "Admin Dashboard" : "Tutoring Hub";
  const userRoleLabel = role.toUpperCase();

  // Nav config per role - used for both sidebar and bottom bar
  const navConfig = {
    learner: {
      sidebar: [
        { path: "/path", label: "Path", icon: "home" },
        { path: "/library", label: "Library", icon: "menu_book" },
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/tutoring", label: "Class", icon: "groups" },
        { path: "/friends", label: "Friends", icon: "diversity_3" },
        { path: "/messages", label: "Messages", icon: "chat" },
      ],
      bottom: [
        { path: "/path", label: "Path", icon: "home" },
        { path: "/library", label: "Library", icon: "menu_book" },
        { path: "/tutoring", label: "Class", icon: "groups" },
        { path: "/friends", label: "Friends", icon: "diversity_3" },
        { path: "/messages", label: "Messages", icon: "chat" },
        { path: "/profile", label: "Profile", icon: "person" },
      ],
      more: [
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/notifications", label: "Notifications", icon: "notifications" },
        { path: "/settings", label: "Settings", icon: "settings" },
      ],
    },
    tutor: {
      sidebar: [
        { path: "/tutoring/dashboard", label: "Dashboard", icon: "dashboard" },
        { path: "/tutoring/history", label: "History", icon: "history" },
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/tutoring", label: "My Classes", icon: "groups" },
        { path: "/messages", label: "Messages", icon: "chat" },
      ],
      bottom: [
        { path: "/tutoring/dashboard", label: "Dashboard", icon: "dashboard" },
        { path: "/tutoring", label: "Sessions", icon: "groups" },
        { path: "/messages", label: "Messages", icon: "chat" },
        { path: "/tutoring/history", label: "History", icon: "history" },
        { path: "/profile", label: "Profile", icon: "person" },
      ],
      more: [
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/notifications", label: "Notifications", icon: "notifications" },
        { path: "/settings", label: "Settings", icon: "settings" },
      ],
    },
    admin: {
      sidebar: [
        { path: "/admin", label: "Dashboard", icon: "dashboard" },
        { path: "/admin/users", label: "Users", icon: "people" },
        { path: "/admin/courses", label: "Courses", icon: "school" },
        { path: "/admin/badges", label: "Badges", icon: "military_tech" },
        { path: "/admin/tutoring", label: "Tutoring", icon: "groups" },
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/messages", label: "Messages", icon: "chat" },
      ],
      bottom: [
        { path: "/admin", label: "Dashboard", icon: "dashboard" },
        { path: "/admin/users", label: "Users", icon: "people" },
        { path: "/admin/courses", label: "Courses", icon: "school" },
        { path: "/admin/badges", label: "Badges", icon: "military_tech" },
        { path: "/admin/tutoring", label: "Tutoring", icon: "groups" },
      ],
      more: [
        { path: "/groups", label: "Groups", icon: "groups_2" },
        { path: "/admin/tutoring", label: "Tutoring", icon: "groups" },
        { path: "/settings", label: "Settings", icon: "settings" },
      ],
    },
  };

  const currentConfig = navConfig[role];
  const navItems = currentConfig.sidebar;
  const bottomNavItems = currentConfig.bottom;
  const moreItems = currentConfig.more;

  const crossRoleLink = isLearner
    ? null // Learners don't see tutor/admin portal link
    : { path: "/path", label: "Learner View", icon: "home" };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Desktop: full, Tablet: icon-only, Mobile: hidden */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface z-50 flex-col justify-between shadow-clay-surface border-r border-surface-border">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 flex items-center gap-2">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-clay-primary ${isLearner ? 'bg-primary text-white' : isAdmin ? 'bg-error text-white' : 'bg-secondary text-white'}`}>
              <span className="material-symbols-outlined text-[22px]">{logoIcon}</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className={`font-label-lg tracking-tight font-extrabold uppercase ${isLearner ? 'text-primary' : isAdmin ? 'text-error' : 'text-secondary'}`}>LEGO</span>
              <span className="font-label-sm text-text-muted font-bold tracking-wide">Learn And Go</span>
            </div>
          </div>

          {/* Role Badge */}
          <div className="px-4 py-2">
            <div className={`px-4 py-1 rounded-full flex items-center gap-2 shadow-clay-surface ${isLearner ? 'bg-primary/10' : isAdmin ? 'bg-error/10' : 'bg-secondary/10'}`}>
              <span className={`w-2 h-2 rounded-full ${isLearner ? 'bg-primary' : isAdmin ? 'bg-error' : 'bg-secondary'}`}></span>
              <span className="font-label-sm uppercase tracking-wider text-text-primary font-bold">{roleLabel}</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1 px-4 py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-4 px-4 py-2 rounded-2xl transition-all ${
                  pathname === item.path
                    ? `bg-primary text-on-primary font-bold shadow-clay-primary`
                    : "text-text-muted hover:bg-surface-border hover:text-text-primary font-label-md"
                }`}
                aria-current={pathname === item.path ? "page" : undefined}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            {crossRoleLink && (
              <>
                <div className="my-2 border-t border-surface-border"></div>
                <Link
                  href={crossRoleLink.path}
                  className={`flex items-center gap-4 px-4 py-2 rounded-2xl font-label-md hover:bg-surface-border hover:text-text-primary transition-all text-text-muted`}
                >
                  <span className="material-symbols-outlined text-[20px]">{crossRoleLink.icon}</span>
                  <span>{crossRoleLink.label}</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-1 px-4 pb-6">
          <Link
            href="/settings"
            className="flex items-center gap-4 px-4 py-2 rounded-2xl text-text-muted hover:bg-surface-border hover:text-text-primary transition-all font-label-md"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Tablet Icon-Only Sidebar Rail */}
      <aside className="hidden md:flex lg:hidden fixed left-0 top-0 h-full w-16 bg-surface z-50 flex flex-col items-center py-4 shadow-clay-surface border-r border-surface-border">
        {/* Logo Icon */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-clay-primary mb-4 ${isLearner ? 'bg-primary text-white' : isAdmin ? 'bg-error text-white' : 'bg-secondary text-white'}`}>
          <span className="material-symbols-outlined text-[20px]">{logoIcon}</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1 w-full px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all ${
                pathname === item.path
                  ? `bg-primary text-on-primary shadow-clay-primary`
                  : "text-text-muted hover:bg-surface-border hover:text-text-primary"
              }`}
              aria-label={item.label}
              aria-current={pathname === item.path ? "page" : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </Link>
          ))}
        </nav>

        {/* Settings */}
        <div className="px-2">
          <Link
            href="/settings"
            className="flex items-center justify-center w-12 h-12 rounded-2xl text-text-muted hover:bg-surface-border hover:text-text-primary transition-all"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content - Responsive padding.
          min-w-0 is required: as a flex child the default `min-width: auto`
          stops it shrinking below its content's intrinsic width, which pushed
          wide page content past the viewport on small screens. */}
      <div className="flex-1 min-w-0 lg:pl-64 md:pl-16 pl-0">
        {/* Top Header - Mobile: slim, Desktop: full */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 md:left-16 h-16 bg-surface/90 backdrop-blur-xl shadow-clay-surface z-40 flex items-center justify-between px-4 lg:px-6">
          {/* Mobile Logo & Stats */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-clay-primary ${isLearner ? 'bg-primary text-white' : isAdmin ? 'bg-error text-white' : 'bg-secondary text-white'}`}>
              <span className="material-symbols-outlined text-[18px]">{logoIcon}</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className={`font-label-sm tracking-tight font-extrabold uppercase ${isLearner ? 'text-primary' : isAdmin ? 'text-error' : 'text-secondary'}`}>LEGO</span>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-surface-border hover:bg-surface transition-colors shadow-clay-surface" type="button">
              <span className={`w-2.5 h-2.5 rounded-full ${isLearner ? 'bg-primary' : isAdmin ? 'bg-error' : 'bg-secondary'}`}></span>
              <span className="font-label-md text-text-primary">{headerLabel}</span>
              <span className="material-symbols-outlined text-text-muted text-[18px]">arrow_drop_down</span>
            </button>
          </div>

          <div className="flex items-center gap-4 lg:gap-6">
            {/* Session Reminders */}
            <SessionReminders isTutor={isTutor} />
            
            {/* Stats - Mobile: compact, Desktop: full */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-clay-secondary font-label-sm lg:font-label-md border-b-2 border-orange-600/30 ${isLearner ? 'bg-secondary text-white' : isAdmin ? 'bg-tertiary text-white' : 'bg-surface text-text-primary'}`}>
                <span className="text-[14px] lg:text-[16px] animate-fire">🔥</span>
                <span className="font-extrabold">{streak}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-clay-primary font-label-sm lg:font-label-md border-b-2 border-green-700/30 ${isLearner ? 'bg-primary text-white' : isAdmin ? 'bg-tertiary text-white' : 'bg-surface text-text-primary'}`}>
                <span className="material-symbols-outlined text-[14px] lg:text-[16px]" style={{ fontVariationSettings: 'FILL 1' }}>bolt</span>
                <span className="font-extrabold">{xp.toLocaleString()}</span>
              </div>
            </div>
            {/* User Info - Mobile: avatar only, Desktop: full */}
            <Link href={userId ? `/profile/${userId}` : "#"} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-clay-primary ${isLearner ? 'bg-primary text-white' : isAdmin ? 'bg-error text-white' : 'bg-secondary text-white'}`}>
                <span className="material-symbols-outlined text-[18px]">{isLearner ? "person" : isAdmin ? "shield" : "supervised_user_circle"}</span>
              </div>
              <div className="hidden lg:flex flex-col text-right">
                <span className="font-label-md text-text-primary leading-tight">{displayName || (isLearner ? "Learner" : isAdmin ? "Admin" : "Tutor")}</span>
                <div className="flex items-center justify-end gap-1">
                  <span className={`font-label-sm font-extrabold ${isLearner ? 'text-primary' : isAdmin ? 'text-error' : 'text-secondary'}`}>LVL {level}</span>
                  <span className="font-label-sm text-text-muted">•</span>
                  <span className="font-label-sm text-text-muted uppercase tracking-wider font-bold">{userRoleLabel}</span>
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content - Add bottom padding for mobile bottom bar */}
        <main className="relative pt-16 min-h-screen w-full px-4 py-6 lg:px-6 lg:py-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <nav className="lg:hidden md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl shadow-clay-surface z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] border-t border-surface-border">
        {bottomNavItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center min-w-[44px] min-h-[44px] rounded-2xl transition-all ${
              pathname === item.path
                ? `text-primary`
                : "text-text-muted"
            }`}
            aria-label={item.label}
            aria-current={pathname === item.path ? "page" : undefined}
          >
            <span className={`material-symbols-outlined text-[24px] ${pathname === item.path ? 'fill' : ''}`}>{item.icon}</span>
            <span className="font-label-xs mt-0.5">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
