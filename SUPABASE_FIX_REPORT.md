# Supabase Sign-Up Fix Report

**Project:** dbusfzzwtpsmcaypmykj  
**Date:** September 29, 2026  
**Issue:** "Database error saving new user" during sign-up

---

## Root Cause Analysis

### 1. Missing RLS Policies on `profiles` Table
- **Problem:** The `profiles` table has NO Row Level Security (RLS) policies defined
- **Impact:** The fallback profile creation in `app/auth/actions.ts` (lines 37-60) fails because authenticated users cannot INSERT into the profiles table
- **Evidence:** No RLS policies found in any migration files for the `profiles` table

### 2. Email Confirmation May Be Required
- **Problem:** If email confirmation is enabled in Supabase Auth, sign-up won't auto-sign in
- **Impact:** User gets stuck on sign-in page instead of being redirected to `/onboarding`
- **Evidence:** Code at lines 62-65 in `app/auth/actions.ts` handles this case

### 3. Schema Verification
- ✅ `conversations.direct_key` is TEXT (confirmed in migration 0009)
- ✅ `profiles` table has correct columns for fallback insert

---

## Required Actions

### Step 1: Run SQL Script in Supabase SQL Editor

**File:** `fix_supabase_signup.sql`

**Steps:**
1. Open Supabase Dashboard: https://supabase.com/dashboard/project/dbusfzzwtpsmcaypmykj
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_supabase_signup.sql`
4. Run the script

**What the script does:**
- Enables RLS on `profiles` table
- Drops any existing policies (to avoid conflicts)
- Creates INSERT policy allowing users to create their own profile
- Creates SELECT policy allowing users to view their own profile
- Creates UPDATE policy allowing users to update their own profile
- Verifies the policies were created correctly

### Step 2: Disable Email Confirmations (Manual in Dashboard)

**Steps:**
1. Go to **Authentication** → **Settings**
2. Find **Email confirmations** section
3. Turn **OFF** "Enable email confirmations"
4. Click **Save**

**Why:** For testing, we want immediate sign-in without email verification.

---

## Code Analysis

### Sign-Up Flow (`app/auth/actions.ts`)

```typescript
// Lines 21-30: Supabase auth sign-up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      display_name: displayName || email.split("@")[0],
    },
    emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
  },
});

// Lines 37-60: Fallback profile creation
if (data.user) {
  try {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, data.user!.id))
      .limit(1);

    if (!existingProfile) {
      await db.insert(profiles).values({
        id: data.user.id,
        displayName: displayName || email.split("@")[0],
        role: "learner",
        xp: 0,
        streakCount: 0,
        onboardingDone: false,
      });
    }
  } catch (dbError) {
    console.error("Profile creation error:", dbError);
  }
}
```

**Issue:** The INSERT at line 47 fails if RLS policy doesn't allow authenticated users to insert their own profile.

---

## SQL Commands Summary

### Enable RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Create Policies
```sql
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (for sign-up fallback)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### Verification
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## Testing After Fix

### Test Sign-Up
1. Navigate to http://localhost:3001/sign-up
2. Enter email and password
3. Click "Sign Up"
4. Expected: Redirect to `/onboarding`

### Verify Profile Creation
Run in Supabase SQL Editor:
```sql
SELECT id, display_name, role, xp, streak_count, onboarding_done 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## Files Modified

1. **Created:** `fix_supabase_signup.sql` - SQL script to fix RLS policies
2. **Created:** `SUPABASE_FIX_REPORT.md` - This report
3. **No code changes needed** - The issue is database-side only

---

## Expected Outcome

After applying the fix:
- ✅ Sign-up will succeed without "Database error saving new user"
- ✅ User profile will be created in `profiles` table
- ✅ User will be redirected to `/onboarding` after sign-up
- ✅ Fallback profile creation in `app/auth/actions.ts` will work with RLS enabled

---

## Troubleshooting

### If sign-up still fails after fix:

1. **Check RLS is enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';
```

2. **Check policies exist:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

3. **Check for triggers blocking insert:**
```sql
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
```

4. **Check auth.users triggers (the 20 RI_ConstraintTrigger* triggers):**
These are system triggers for foreign key constraints and should NOT be dropped. They are normal and expected.

---

## Summary

**Root Cause:** Missing RLS INSERT policy on `profiles` table  
**Fix:** Add RLS policies to allow authenticated users to insert their own profile  
**Action Required:** Run `fix_supabase_signup.sql` in Supabase SQL Editor  
**Additional Step:** Disable email confirmations in Supabase Auth Settings  
**Code Changes:** None required (database-side fix only)

---

**Report Generated By:** Cascade AI Assistant  
**Date:** September 29, 2026
