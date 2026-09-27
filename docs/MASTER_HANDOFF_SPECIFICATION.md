# MASTER HANDOFF & ARCHITECTURAL SPECIFICATION
## LEGO Digital Learning Platform (Duolingo-Style Gamified LMS)
**Date:** September 2026  
**Stack:** Next.js 16 (Turbopack, App Router, React 19 Server Actions), Drizzle ORM, PostgreSQL (Supabase Transaction Pooler), Tailwind CSS (Claymorphism UI), Playwright E2E.

---

## 1. Project Overview & Vision
This codebase is a production-grade, fast, gamified digital learning management system (LMS) styled with the tactile, playful aesthetic of **Duolingo** (Claymorphism: rounded-3xl shapes, thick bottom borders, drop shadows, inset bevel highlights, bouncing micro-interactions) themed for **LEGO robotics and Python coding skills**.

It supports three distinct user roles with full role-based access control (RBAC):
1. **Learner**: Accesses the winding serpentine learning path, interactive quiz challenges, XP progression, streak maintenance, friends squad, and leaderboard leagues.
2. **Tutor**: Manages availability slots, accepts 1-on-1 tutoring session requests, reviews student notes, and hosts sessions.
3. **Admin**: Manages courses, units, lessons, badges, tutoring hubs, and user roles.

---

## 2. Infrastructure & Supabase Configuration

### Production Supabase Project
- **Project Ref**: `dbusfzzwtpsmcaypmykj`
- **Region**: `ap-south-1` (AWS Mumbai)
- **Status**: `ACTIVE_HEALTHY`
- **MCP Connection**: Fully integrated via Antigravity Supabase MCP tool (`execute_sql`, `get_project`, `get_publishable_keys`, etc.).

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL="https://dbusfzzwtpsmcaypmykj.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidXNmenp3dHBzbWNheXBteWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxODM0MzgsImV4cCI6MjEwNTc1OTQzOH0.JsdeGfVsd8W1NuFUotoG2ZC7WVRmFQwimiMZwuFQNaI"
DATABASE_URL="postgresql://postgres.dbusfzzwtpsmcaypmykj:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```
> **CRITICAL ARCHITECTURAL RULE FOR DB CONNECTION:**
> - Direct connections to port `5432` (`db.<ref>.supabase.co:5432`) will fail with `ECONNREFUSED` on IPv4 networks.
> - **Always connect via port 6543** using the Supabase Transaction Pooler (`aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`).
> - In `db/index.ts`, `prepare: false` is **strictly mandatory** because PgBouncer transaction mode rejects prepared statements.
> - Connection pooling uses `globalThis.conn` singleton to prevent serverless connection exhaustion.

---

## 3. Database Schema & Security State

All **27 tables** are deployed in project `dbusfzzwtpsmcaypmykj`:
1. `profiles`: User accounts, XP, streak counts, onboarding flags, roles (`learner`, `tutor`, `admin`).
2. `courses`: Learning tracks (e.g. Python Fundamentals, Web Development).
3. `units`: Grouped modules within a course.
4. `lessons`: Individual lessons with XP rewards and ordering.
5. `challenges`: Quiz questions and challenges within lessons.
6. `challenge_options`: Multiple-choice selections.
7. `enrollments`: Course registration state.
8. `user_progress`: Lesson completion status (`completed`, `in_progress`, `locked`).
9. `badges`: Achievement definitions with criteria.
10. `user_badges`: Badges unlocked by users.
11. `daily_activity_log`: Daily study time and lesson counts.
12. `friendships`: Social graph with statuses (`pending`, `accepted`, `rejected`, `blocked`).
13. `friend_streaks`: Shared collaborative streaks.
14. `tutor_profiles`: Tutor bio, hourly rates, subjects.
15. `tutor_availability`: Day of week and time blocks.
16. `tutor_sessions`: Scheduled 1-on-1 sessions.
17. `session_notes`: Session logs and feedback.
18. `session_requests`: Pending booking requests.
19. `library_views`: Course catalog impressions.
20. `ai_interactions`: Mascot interaction history.
21. `notifications`: In-app notification feed.
22. `conversations`: Messaging channels.
23. `conversation_members`: Participants in conversations.
24. `messages`: Direct and group messages.
25. `blocks`: Blocked user records.
26. `message_reports`: Safety reporting.
27. `message_rate_limits`: Anti-spam tracking.

### Row Level Security (RLS)
- **100% of tables have RLS enabled** (verified via `pg_tables` audit).
- Cross-user data isolation is verified: unauthorized users receive `0 rows` when attempting to access private messages or tutoring logs.

---

## 4. Test Accounts & Role-Based Access Control

The database has 3 pre-configured, verified test accounts:

| Email | Password | Role | Redirect Target | Status |
|---|---|---|---|---|
| `admin@gmail.com` | `admin@1221` | `admin` | `/admin` | ✅ Verified |
| `tutor@gmail.com` | `tutor@1221` | `tutor` | `/tutoring/dashboard` | ✅ Verified |
| `learner@gmail.com` | `learner@1221` | `learner` | `/path` | ✅ Verified |

### RBAC Guards Implementation
- **Admin Guard** (`app/admin/layout.tsx`): Checks `profile.role === 'admin'`. If non-admin, redirects immediately to `/path?error=admin_only`.
- **Tutor Guard** (`app/tutoring/dashboard/page.tsx`): Checks `userProfile.role === 'tutor'` and verifies `tutor_profiles` row. If non-tutor, redirects to `/tutoring?error=tutor_only`.
- **Learner Flow** (`app/auth/actions.ts`): Redirects to `/path` if `onboarding_done` is true, otherwise `/onboarding`.

---

## 5. UI Architecture & Duolingo Claymorphism Design System

### Design Tokens
- **Colors**:
  - `primary`: `#58CC02` (Duolingo lime green)
  - `secondary`: `#FF9600` (Energetic flame orange)
  - `tertiary`: `#8B5CF6` (Playful purple)
  - `background`: `#FFF8F0` (Warm tactile cream)
  - `surface`: `#FFFFFF`
  - `surface-border`: `#F5EFE6`
- **Leagues**: Bronze (`#CD7F32`), Silver (`#A8A9AD`), Gold (`#FFD700`), Diamond (`#60CBFF`).
- **Tactile Shadows**: `shadow-clay-primary`, `shadow-clay-secondary`, `shadow-clay-surface` (equipped with inset highlight bevels).

### Core Components & Pages
1. **`app/globals.css`**: Complete keyframe animation library:
   - `animate-fire`: Continuous flickering flame for streaks.
   - `animate-pop-in`: Spring entrance for cards and lesson nodes.
   - `animate-bounce`: Cheerful bounce for mascot and trophies.
   - `animate-float`: Gentle floating idle animation.
   - `.clay-btn`: 3D button with `border-b-4 border-black/20` and physics active press `active:translate-y-[2px]`.
   - `.clay-card`: 3D card with rounded-3xl borders and soft depth shadows.
2. **`lib/xp.ts`**:
   - Quadratic level curve: $\text{Level} = \lfloor\sqrt{\text{XP} / 100}\rfloor + 1$.
   - Returns level title, current league, XP in current level, and percentage progress to next level.
3. **`app/path/page.tsx`**:
   - Fully dynamic serpentine winding path with SVG bezier connectors.
   - Nodes transition through: `completed` (green with 3 stars) $\to$ `current` (pulsing purple with encouragement mascot) $\to$ `locked` (gray tactile lock).
4. **`app/leaderboard/page.tsx`**:
   - Current league banner with dynamic glow matching the user's tier.
   - Olympic Top-3 Podium: Rank 1 (Gold with crown), Rank 2 (Silver), Rank 3 (Bronze) in 2nd | 1st | 3rd formation.
   - Full standings list with streak flame indicators.
5. **`app/friends/page.tsx`**:
   - Search learners by name with instant request action.
   - Pending requests shelf with tactile Accept/Decline buttons.
   - Friends grid with direct chat links.
6. **`app/profile/[userId]/page.tsx`**:
   - Level progress bar, stats grid, and unlocked vs. locked badges showcase.
7. **`components/UnifiedShell.tsx`**:
   - Sticky header with animated streak fire, XP counter, and responsive tablet rail + mobile bottom bar.

---

## 6. Automated Test Suite & Verification Results

All tests have been run and verified with evidence:

1. **Production Build (`npm run build`)**:
   - **Exit Code 0**
   - 32 routes compiled cleanly with 0 TypeScript errors in 2.3 seconds.
2. **Playwright Responsive Layout (`tests/responsive-shell.spec.ts`)**:
   - **7/7 Passed** across Mobile (`390×844`), Tablet (`768×1024`), and Desktop (`1440×900`) with zero horizontal overflow.
3. **Playwright Role Verification (`tests/role-verification.spec.ts`)**:
   - **3/3 Passed** (`admin`, `tutor`, `learner` RBAC access guards and redirects verified).
4. **Direct Auth Probe (`scripts/test_auth_logins.ts`)**:
   - **3/3 Passed** via GoTrue HTTP token issuance and profile role matching.

---

## 7. Immediate Next Steps for Next Developer / Agent

1. **Rotate OpenRouter API Key**:
   - A previous test session flagged an exposed key. The user should rotate the key on OpenRouter and place it into `OPENROUTER_API_KEY` in `.env.local`.
   - The mascot chatbox endpoint is located at `app/api/mascot-chat/route.ts`.
2. **Enable Supabase Realtime for Messaging**:
   - In Supabase Dashboard -> Database -> Replication, ensure the `messages` table is toggled ON for realtime broadcast.
3. **Weekly League Promotion/Demotion Cron**:
   - Scaffold a pg_cron or Edge Function to promote top 3 learners to the next league and demote bottom 3 each Sunday midnight UTC.
4. **Deploy to Vercel**:
   - Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`) on Vercel project settings.
   - Ensure `DATABASE_URL` uses port `6543` with `?pgbouncer=true`.
