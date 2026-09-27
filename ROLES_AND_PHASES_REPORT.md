# LEGO App - Roles and Phases Report

## Role-Based Access Control Implementation

### 1. User Roles
The application has three user roles defined in `db/schema.ts`:
- **learner** (default) - Regular students taking courses
- **tutor** - Instructors who provide tutoring services
- **admin** - Administrative users with full system access

### 2. Role-Specific Pages and Features

#### ADMIN ROLE (`/admin/*`)
**Location:** `app/admin/`

**Pages:**
- `/admin` - Admin dashboard with navigation
- `/admin/users` - User management (view all users, manage roles)
- `/admin/badges` - Badge management (create, edit, delete badges)
- `/admin/courses` - Course management (create, edit, delete courses)
- `/admin/tutoring` - Tutoring oversight (view tutor profiles, sessions)

**Security:**
- Server-side gating in `app/admin/layout.tsx` checks user role
- Redirects non-admin users to sign-in
- Server actions in `app/admin/*/actions.ts` use `verifyAdmin()` helper
- Multiple layers: layout check + action verification

**Features:**
- View all users with role badges
- Manage user roles (promote/demote)
- Create and manage gamification badges
- Create and manage courses
- Monitor tutoring activity

#### TUTOR ROLE (`/tutoring/*`)
**Location:** `app/tutoring/`

**Pages:**
- `/tutoring` - Tutor dashboard
- `/tutoring/profile` - Create/edit tutor profile
- `/tutoring/availability` - Set availability schedule
- `/tutoring/sessions` - Manage tutoring sessions
- `/tutoring/earnings` - View earnings and statistics

**Features:**
- Create tutor profile with bio, hourly rate, timezone
- Set availability slots for booking
- Receive and respond to session requests
- Conduct sessions via Jitsi integration
- Track earnings and session history
- View learner feedback

**Database Tables:**
- `tutor_profiles` - Tutor profile information
- `tutor_availability` - Available time slots
- `tutor_sessions` - Session bookings and status
- `tutor_session_notes` - Session notes and feedback

#### LEARNER ROLE (Default)
**Location:** `app/path/`, `app/lesson/`, `app/library/`

**Pages:**
- `/path` - Learning path with course progression
- `/lesson/[id]` - Individual lesson view with video and practice
- `/library` - Course library for enrolled courses
- `/friends` - Friend system (send requests, view friends)
- `/leaderboard` - XP-based leaderboard
- `/profile` - User profile with stats and badges

**Features:**
- View learning path with locked/unlocked lessons
- Complete lessons to earn XP
- Track streaks and daily goals
- Send and accept friend requests
- View leaderboard rankings
- Earn and display badges
- Book tutoring sessions with tutors

**Gamification:**
- XP system for lesson completion
- Streak tracking for consecutive daily activity
- Badge awards for achievements
- Daily goal setting (10/15/30/60 minutes)

### 3. Role Assignment

**Default Role:** All new users default to `learner` role

**Role Assignment Methods:**
1. **Manual via Database:** Direct update to `profiles.role` column
2. **Admin Dashboard:** Admins can promote users via `/admin/users`
3. **Script:** `scripts/set_test_roles.ts` for test account setup

**Role Checking:**
```typescript
// Server-side role check
const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
if (profile?.role !== 'admin') {
  redirect('/sign-in');
}
```

### 4. Database Schema for Roles

**Table:** `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'learner',
  display_name TEXT,
  xp INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  onboarding_done BOOLEAN DEFAULT false,
  -- ... other fields
);
```

**Enum:** `user_role`
```sql
CREATE TYPE user_role AS ENUM ('learner', 'tutor', 'admin');
```

---

## Current Phase Status

### COMPLETED PHASES

**Phase 1: Project Setup**
- ✅ Next.js 16.3.5 with React 19.2.8
- ✅ Supabase Auth integration
- ✅ Drizzle ORM setup
- ✅ Database schema design

**Phase 2: Authentication System**
- ✅ Sign-up / Sign-in pages
- ✅ Server actions for auth
- ✅ Session management
- ✅ Profile auto-creation trigger
- ✅ Onboarding flow

**Phase 3: Course Structure**
- ✅ Courses, Units, Lessons tables
- ✅ Lesson progression state machine
- ✅ Locked/in_progress/completed states
- ✅ Course enrollment system

**Phase 4: Lesson Content & AI**
- ✅ Lesson video integration
- ✅ AI-generated practice questions (OpenRouter)
- ✅ Fallback to static questions
- ✅ Practice mode gating
- ✅ Badge awarding integration

**Phase 5: Gamification**
- ✅ XP system
- ✅ Streak tracking
- ✅ Badge system with criteria
- ✅ Leaderboard
- ✅ Daily goals

**Phase 6: Friend System**
- ✅ Friend request sending/accepting
- ✅ Friend list display
- ✅ Rate limiting (10 pending, 5/hour)
- ✅ Blocking functionality

**Phase 7: Analytics**
- ⏸️ DEFERRED - Not implemented

**Phase 8: Tutoring System**
- ✅ Tutor profiles
- ✅ Availability scheduling
- ✅ Session booking
- ✅ Double-booking prevention
- ✅ Timezone handling
- ✅ Jitsi integration
- ✅ Session notes

**Phase 9: Design Pass**
- ⏸️ DEFERRED - UI/UX improvements

### IN PROGRESS

**Phase 8 Verification (Current Focus)**
- ⚠️ PART A: Streak test - Need to run and paste raw DB rows
- ⚠️ PART A: Timezone test - Need to run and paste formatted strings
- ⚠️ PART A: Friend spam test - Need to create test users via Supabase Auth, test 10 pending limit
- ⚠️ PART B: Admin gating - Need live test of learner/tutor against /admin routes

### PENDING

**Phase 10: Deployment Hardening**
- ⏸️ Not started
- Environment variable validation
- Error handling improvements
- Performance optimization
- Security hardening

---

## Recent Fixes Applied

### 1. Sign-Up Error Fix
**Issue:** "Database error saving new user" during sign-up
**Cause:** PostgreSQL trigger for profile creation may fail due to connection issues
**Fix:** Added fallback profile creation in `app/auth/actions.ts` - manually creates profile if trigger doesn't work

### 2. RLS on Notifications
**Issue:** Table `public.notifications` had RLS disabled
**Fix:** Enabled RLS and created policies:
- `users_can_view_own_notifications` - Users can only see their own
- `system_can_insert_notifications` - System can insert (for triggers)

### 3. Server Actions Origin Issues
**Issue:** Browser preview caused "Invalid Server Actions request" errors
**Fix:** Added `allowedDevOrigins` and `allowedOrigins` to `next.config.ts`

### 4. Profile Creation Trigger
**Issue:** New users didn't have profiles created automatically
**Fix:** Created PostgreSQL trigger `handle_new_user()` on `auth.users` INSERT
**Fallback:** Manual profile creation in sign-up action if trigger fails

---

## Test Accounts

**Current Test Accounts (from database):**
- `test_admin@lego.app` - Role: admin
- `test_tutor@lego.app` - Role: tutor
- `test_learner@lego.app` - Role: learner
- Plus 6 other learner accounts

**Note:** Passwords cannot be retrieved from Supabase Auth. For testing with known passwords, users should create new accounts via sign-up.

---

## Next Steps

1. **Complete Phase 8 Verification:**
   - Run streak test API and paste raw DB rows
   - Run timezone test API and paste formatted strings
   - Create test users via Supabase Auth for friend spam test
   - Live test admin gating with learner/tutor accounts

2. **Phase 10: Deployment Hardening**
   - Environment variable validation
   - Error boundary improvements
   - Performance optimization
   - Security audit

3. **Phase 9: Design Pass** (Optional)
   - UI/UX improvements
   - Better responsive design
   - Accessibility enhancements
