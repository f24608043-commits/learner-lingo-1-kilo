-- ============================================================================
-- SUPABASE SIGN-UP FIX SCRIPT
-- Run this in Supabase SQL Editor for project: dbusfzzwtpsmcaypmykj
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current RLS status on profiles table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- ============================================================================
-- STEP 2: Check existing RLS policies on profiles table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: Enable RLS on profiles table (if not already enabled)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop existing policies on profiles (if any)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- ============================================================================
-- STEP 5: Create RLS policies for profiles table
-- ============================================================================

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

-- ============================================================================
-- STEP 6: Verify the policies were created
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- STEP 7: Check if there's a trigger on profiles for auth.users
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- ============================================================================
-- STEP 8: Check conversations.direct_key column type
-- ============================================================================
SELECT 
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'conversations'
  AND column_name = 'direct_key';

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- After running this script:
-- 1. RLS should be enabled on profiles table
-- 2. INSERT policy should allow authenticated users to create their own profile
-- 3. The fallback profile creation in app/auth/actions.ts should work
-- 
-- NEXT STEPS (Manual in Supabase Dashboard):
-- 1. Go to Authentication → Settings → Email confirmations
-- 2. Turn OFF "Enable email confirmations" for testing
-- 3. Test sign-up at http://localhost:3001/sign-up
