import { createClient } from "@/utils/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Mascot from "@/components/Mascot";
import { getLevelInfo } from "@/lib/xp";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) {
    redirect("/onboarding");
  }

  const levelInfo = getLevelInfo(profile.xp ?? 0);

  return (
    <div className="w-full px-4 md:px-6 py-6 bg-gradient-to-br from-background via-primary/5 to-secondary/5 min-h-screen">
      {/* ── Header with Mascot ─────────────────────────────────── */}
      <section className="w-full mb-6 animate-slide-up">
        <div className="relative bg-gradient-to-br from-primary via-primary/95 to-secondary rounded-3xl p-1 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-3xl border-4 border-dashed border-white/30 pointer-events-none" />
          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex flex-col gap-2 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-lg bg-surface-container-high text-text-muted font-label-sm text-label-sm tracking-wider uppercase">Settings</span>
              </div>
              <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight leading-none">
                Account Settings
              </h1>
              <p className="font-body-lg text-body-lg text-text-muted leading-relaxed">
                Manage your account preferences and profile information
              </p>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center lg:items-end justify-center gap-4 shrink-0 self-center lg:self-auto">
              <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0">
                <Mascot pose="idle" size={128} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Settings Sections ─────────────────────────────────── */}
      <div className="space-y-6">
        {/* Profile Information */}
        <section className="animate-slide-up">
          <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-surface-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: 'FILL 1' }}>person</span>
                <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">Profile Information</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block font-label-sm text-text-muted mb-1">Display Name</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-clay-primary border-4 border-white">
                      {profile.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1">
                      <p className="font-body-lg text-text-primary">{profile.displayName || "Not set"}</p>
                      <p className="font-body-sm text-text-muted">This is how others will see you</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block font-label-sm text-text-muted mb-1">Email</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl text-text-primary font-medium">{user.email ?? "Not set"}</div>
                </div>
                <div>
                  <label className="block font-label-sm text-text-muted mb-1">Role</label>
                  <div className="px-4 py-3 bg-gray-50 rounded-xl text-text-primary font-medium capitalize">{profile.role}</div>
                </div>
                <div>
                  <label className="block font-label-sm text-text-muted mb-1">Account Status</label>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-body-sm text-text-primary font-medium">Active</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-surface-border">
                <button className="w-full rounded-xl bg-primary text-white py-2.5 font-label-md font-bold shadow-clay-primary hover:bg-primary-dark transition-all active:translate-y-[2px]">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Learning Preferences */}
        <section className="animate-slide-up delay-75">
          <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-surface-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: 'FILL 1' }}>tune</span>
                <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">Learning Preferences</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block font-label-sm text-text-muted mb-2">Daily Goal</label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      defaultValue={profile.dailyGoalMinutes}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="w-20 text-right font-body-lg text-primary font-bold">{profile.dailyGoalMinutes} min</div>
                </div>
                <p className="font-body-xs text-text-muted mt-1">Recommended: 15-30 minutes daily</p>
              </div>

              <div>
                <label className="block font-label-sm text-text-muted mb-2">Reminder Time</label>
                <select className="w-full px-4 py-3 bg-gray-50 rounded-xl border-2 border-surface-border text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00" selected>10:00 AM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="18:00">6:00 PM</option>
                  <option value="20:00">8:00 PM</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-label-sm text-text-primary font-semibold mb-1">Email Notifications</label>
                  <p className="font-body-xs text-text-muted">Receive updates about your progress and sessions</p>
                </div>
                <button className="relative w-12 h-6 bg-primary rounded-full p-1 shadow-inner transition-all">
                  <span className="w-5 h-5 bg-white rounded-full shadow-md transition-transform" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block font-label-sm text-text-primary font-semibold mb-1">Push Notifications</label>
                  <p className="font-body-xs text-text-muted">Get notified about sessions and messages</p>
                </div>
                <button className="relative w-12 h-6 bg-gray-300 rounded-full p-1 shadow-inner transition-all">
                  <span className="w-5 h-5 bg-white rounded-full shadow-md transition-transform" style={{ transform: "translateX(0)" }} />
                </button>
              </div>

              <div className="pt-4 border-t border-surface-border">
                <button className="w-full rounded-xl bg-primary text-white py-2.5 font-label-md font-bold shadow-clay-primary hover:bg-primary-dark transition-all active:translate-y-[2px]">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="animate-slide-up delay-150">
          <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-surface-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: 'FILL 1' }}>analytics</span>
                <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">Your Stats</h2>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-5 text-center border-2 border-primary/20">
                <div className="text-4xl mb-2">⚡</div>
                <p className="font-headline-2xl text-primary font-extrabold">{profile.xp.toLocaleString()}</p>
                <p className="font-label-sm text-text-muted">Total XP</p>
                <div className="mt-2 text-xs text-primary/70 font-medium">Level {levelInfo.level} • {levelInfo.title}</div>
              </div>
              <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl p-5 text-center border-2 border-secondary/20">
                <div className="text-4xl mb-2 animate-fire">🔥</div>
                <p className="font-headline-2xl text-secondary font-extrabold">{profile.streakCount}</p>
                <p className="font-label-sm text-text-muted">Day Streak</p>
                <div className="mt-2 text-xs text-secondary/70 font-medium">
                  {profile.streakCount >= 7 ? "🔥 Week streak!" : profile.streakCount >= 30 ? "💎 Month streak!" : "Keep going!"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-tertiary/10 to-tertiary/5 rounded-xl p-5 text-center border-2 border-tertiary/20">
                <div className="text-4xl mb-2">📚</div>
                <p className="font-headline-2xl text-tertiary font-extrabold">0</p>
                <p className="font-label-sm text-text-muted">Lessons Completed</p>
                <div className="mt-2 text-xs text-tertiary/70 font-medium">{levelInfo.xpNeededForNext} XP to next level</div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Security */}
        <section className="animate-slide-up delay-225">
          <div className="rounded-2xl bg-white shadow-clay-surface border border-surface-border overflow-hidden">
            <div className="p-4 border-b border-surface-border bg-gradient-to-r from-primary/5 to-secondary/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: 'FILL 1' }}>shield</span>
                <h2 className="font-headline-md text-headline-md text-text-primary font-extrabold">Security</h2>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block font-label-md text-text-primary font-semibold mb-1">Two-Factor Authentication</label>
                  <p className="font-body-sm text-text-muted">Add an extra layer of security to your account</p>
                </div>
                <button className="px-4 py-2 rounded-xl border-2 border-primary text-primary font-label-md font-semibold hover:bg-primary/5 transition-all">
                  Enable
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block font-label-md text-text-primary font-semibold mb-1">Password</label>
                  <p className="font-body-sm text-text-muted">Last changed: Recently</p>
                </div>
                <button className="px-4 py-2 rounded-xl bg-primary text-white font-label-md font-bold shadow-clay-primary hover:bg-primary-dark transition-all active:translate-y-[2px]">
                  Change Password
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block font-label-md text-text-primary font-semibold mb-1">Active Sessions</label>
                  <p className="font-body-sm text-text-muted">Manage devices logged into your account</p>
                </div>
                <button className="px-4 py-2 rounded-xl border-2 border-primary text-primary font-label-md font-semibold hover:bg-primary/5 transition-all">
                  View Sessions
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="animate-slide-up delay-300">
          <div className="rounded-2xl bg-error/5 border border-error/20 shadow-clay-error overflow-hidden">
            <div className="p-4 border-b border-error/20 bg-error/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[22px]">warning</span>
                <h2 className="font-headline-md text-headline-md text-error font-extrabold">Danger Zone</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-white rounded-xl border-2 border-error/20">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block font-label-md text-error font-semibold mb-1">Delete Account</label>
                    <p className="font-body-sm text-text-muted">Permanently delete your account and all data. This action cannot be undone.</p>
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-error text-white font-label-md font-bold shadow-clay-error hover:bg-error-dark transition-all active:translate-y-[2px]">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}