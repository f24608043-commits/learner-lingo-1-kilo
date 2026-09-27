-- RLS Proof Script for Messaging System
-- This script demonstrates that RLS policies are working correctly
-- Run each section separately in Supabase SQL Editor with different user contexts

-- ============================================================================
-- SECTION 1: Verify RLS is enabled on all messaging tables
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('conversations', 'conversation_members', 'messages', 'blocks', 'message_reports')
ORDER BY tablename;

-- Expected output: All tables should have rowsecurity = true


-- ============================================================================
-- SECTION 2: Verify RLS policies exist
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
WHERE tablename IN ('conversations', 'conversation_members', 'messages', 'blocks', 'message_reports')
ORDER BY tablename, policyname;

-- Expected output: Should see policies for each table


-- ============================================================================
-- SECTION 3: Test conversation access control
-- ============================================================================
-- First, let's check if there are any conversations
SELECT id, type, title, created_by, created_at 
FROM conversations 
LIMIT 5;

-- If no conversations exist, create test data:
-- INSERT INTO conversations (type, title, created_by, direct_key)
-- VALUES ('direct', 'Test Conversation', '<user_id>', gen_random_uuid());


-- ============================================================================
-- SECTION 4: Test is_conversation_member function
-- ============================================================================
-- This function is used by RLS policies to check membership
-- Test it with actual user IDs from your database

-- Get some user IDs to test with:
SELECT id, display_name, role 
FROM profiles 
LIMIT 5;

-- Then test the function (replace with actual IDs):
-- SELECT is_conversation_member('<user_id>', '<conversation_id>');


-- ============================================================================
-- SECTION 5: Verify rate limiting table and trigger exist
-- ============================================================================
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'message_rate_limits';

-- Check trigger exists on messages table:
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'messages'
  AND trigger_name = 'message_rate_limit_trigger';


-- ============================================================================
-- SECTION 6: Verify realtime publication includes messages
-- ============================================================================
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'messages';


-- ============================================================================
-- SECTION 7: Test message insertion with rate limit
-- ============================================================================
-- This test demonstrates the rate limiting trigger
-- WARNING: This will actually insert a message if you have valid data

-- First check current rate limit entries:
SELECT * FROM message_rate_limits ORDER BY minute_start DESC LIMIT 5;

-- To test rate limit, you would need to:
-- 1. Be authenticated as a user
-- 2. Be a member of a conversation
-- 3. Insert 31 messages within 1 minute
-- The 31st message should fail with "Rate limit exceeded"


-- ============================================================================
-- SECTION 8: Verify block table RLS
-- ============================================================================
-- Users should only see their own blocks
-- This query shows the policy definition

SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'blocks'
  AND policyname = 'Users can view their blocks';


-- ============================================================================
-- SECTION 9: Verify message_reports RLS
-- ============================================================================
-- Users should only see their own reports
-- This query shows the policy definition

SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'message_reports'
  AND policyname = 'Users can view their reports';


-- ============================================================================
-- SECTION 10: Verify conversation_members RLS
-- ============================================================================
-- Users can only see members of conversations they are in
-- This query shows the policy definition

SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversation_members'
  AND policyname = 'Users can view conversation members';


-- ============================================================================
-- SECTION 11: Verify messages RLS
-- ============================================================================
-- Users can only view messages in conversations they are members of
-- This query shows the policy definition

SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messages'
  AND policyname = 'Users can view messages in their conversations';


-- ============================================================================
-- SECTION 12: Verify conversations RLS
-- ============================================================================
-- Users can only view conversations they are members of
-- This query shows the policy definition

SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversations'
  AND policyname = 'Users can view their conversations';


-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================
-- After running this script, verify:
-- 
-- ✅ All messaging tables have rowsecurity = true
-- ✅ RLS policies exist for all tables
-- ✅ is_conversation_member function exists
-- ✅ Rate limiting table and trigger exist
-- ✅ Messages table is in supabase_realtime publication
-- ✅ Block table policies only allow users to see their own blocks
-- ✅ Message_reports policies only allow users to see their own reports
-- ✅ Conversation_members policies only show members of user's conversations
-- ✅ Messages policies only show messages in user's conversations
-- ✅ Conversations policies only show user's conversations
