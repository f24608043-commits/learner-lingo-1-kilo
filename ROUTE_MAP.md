# LEGO App - Complete Route Map

## Overview
This document maps all routes in the LEGO Learn And Go application, organized by role and functionality.

---

## Public Routes (No Authentication Required)

| Route | Page | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Landing page / Home |
| `/sign-in` | `app/sign-in/page.tsx` | Sign in page |
| `/sign-up` | `app/sign-up/page.tsx` | Sign up page |

---

## Learner Routes

### Main Navigation (UnifiedShell - Learner Role)

| Route | Page | Description | Navigation Label |
|-------|------|-------------|------------------|
| `/path` | `app/path/page.tsx` | Learning path / Course progress | Path |
| `/library` | `app/library/page.tsx` | Content library | Library |
| `/tutoring` | `app/tutoring/page.tsx` | Tutor directory and booking | Class |
| `/friends` | `app/friends/page.tsx` | Friends and social features | Friends |

### Additional Learner Pages

| Route | Page | Description |
|-------|------|-------------|
| `/lesson/[lessonId]` | `app/lesson/[lessonId]/page.tsx` | Individual lesson view |
| `/lesson/[lessonId]/practice` | `app/lesson/[lessonId]/practice/page.tsx` | Lesson practice mode |
| `/profile/[userId]` | `app/profile/[userId]/page.tsx` | User profile view |
| `/leaderboard` | `app/leaderboard/page.tsx` | Leaderboard / Rankings |
| `/notifications` | `app/notifications/page.tsx` | Notifications center |
| `/settings` | `app/settings/page.tsx` | User settings |

---

## Tutor Routes

### Main Navigation (UnifiedShell - Tutor Role)

| Route | Page | Description | Navigation Label |
|-------|------|-------------|------------------|
| `/tutoring/dashboard` | `app/tutoring/dashboard/page.tsx` | Tutor dashboard (main hub) | Dashboard |
| `/tutoring/history` | `app/tutoring/history/page.tsx` | Session history | History |
| `/tutoring` | `app/tutoring/page.tsx` | Tutor directory and booking | My Classes |

### Additional Tutor Pages

| Route | Page | Description |
|-------|------|-------------|
| `/tutoring/session/[sessionId]` | `app/tutoring/session/[sessionId]/page.tsx` | Individual session view |
| `/profile/[userId]` | `app/profile/[userId]/page.tsx` | User profile view |
| `/settings` | `app/settings/page.tsx` | User settings |

---

## Admin Routes

### Main Navigation (UnifiedShell - Admin Role)
**CURRENT ISSUE**: Admin currently uses Tutor navigation. Should have dedicated admin navigation.

| Route | Page | Description | Navigation Label |
|-------|------|-------------|------------------|
| `/admin` | `app/admin/page.tsx` | Admin dashboard (main hub) | Dashboard |
| `/admin/users` | `app/admin/users/page.tsx` | User management | Users |
| `/admin/courses` | `app/admin/courses/page.tsx` | Course management | Courses |
| `/admin/badges` | `app/admin/badges/page.tsx` | Badge management | Badges |
| `/admin/tutoring` | `app/admin/tutoring/page.tsx` | Tutoring oversight | Tutoring |

### Admin Sub-routes

| Route | Page | Description |
|-------|------|-------------|
| `/admin/courses/new` | `app/admin/courses/new/page.tsx` | Create new course |
| `/admin/courses/[courseId]` | `app/admin/courses/[courseId]/page.tsx` | Course detail view |
| `/admin/units/[unitId]` | `app/admin/units/[unitId]/page.tsx` | Unit management |
| `/admin/lessons/[lessonId]` | `app/admin/lessons/[lessonId]/page.tsx` | Lesson management |

---

## Onboarding

| Route | Page | Description |
|-------|------|-------------|
| `/onboarding` | `app/onboarding/page.tsx` | New user onboarding flow |

---

## Shell Component Behavior

### Shell.tsx (Server Component)
- Routes to appropriate shell based on authentication and role
- Non-authenticated users → `AppShell.tsx`
- Authenticated users with profile → `UnifiedShell.tsx` (role-aware)

### UnifiedShell.tsx (Client Component)
- **Learner Navigation**: Path, Library, Class, Friends
- **Tutor Navigation**: Dashboard, History, My Classes
- **Admin Navigation**: **CURRENTLY BROKEN** - Uses Tutor navigation instead of Admin navigation

---

## Issues Identified

### 1. Admin Navigation Missing
**Problem**: Admin users see Tutor navigation instead of dedicated Admin navigation in UnifiedShell.

**Current Code** (UnifiedShell.tsx lines 61-80):
```typescript
const isLearner = role === "learner";
const isTutor = role === "tutor" || role === "admin"; // Admin grouped with Tutor

const navItems = isLearner 
  ? [ /* Learner nav */ ]
  : [ /* Tutor nav - used for both Tutor and Admin */ ];
```

**Expected**: Admin should have its own navigation pointing to `/admin/*` routes.

### 2. Cross-Role Link
**Current**: Tutors see "Learner View" link to `/path`
**Expected**: Admins should also see "Learner View" link to test learner experience

---

## Recommended Fix

Update `UnifiedShell.tsx` to add dedicated admin navigation:

```typescript
const navItems = isLearner 
  ? [
      { path: "/path", label: "Path", icon: "home" },
      { path: "/library", label: "Library", icon: "menu_book" },
      { path: "/tutoring", label: "Class", icon: "groups" },
      { path: "/friends", label: "Friends", icon: "diversity_3" },
    ]
  : role === "admin"
  ? [
      { path: "/admin", label: "Dashboard", icon: "dashboard" },
      { path: "/admin/users", label: "Users", icon: "people" },
      { path: "/admin/courses", label: "Courses", icon: "school" },
      { path: "/admin/badges", label: "Badges", icon: "military_tech" },
      { path: "/admin/tutoring", label: "Tutoring", icon: "groups" },
    ]
  : [
      { path: "/tutoring/dashboard", label: "Dashboard", icon: "dashboard" },
      { path: "/tutoring/history", label: "History", icon: "history" },
      { path: "/tutoring", label: "My Classes", icon: "groups" },
    ];
```
