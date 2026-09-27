-- Migration: 0009_messaging_system
-- Messaging system with direct and group chat, RLS, rate limiting

-- Drop existing messaging tables if they exist (from previous migration)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Create conversation_type enum
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL DEFAULT 'direct',
  title TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  direct_key UUID UNIQUE, -- For direct conversations, ensures one thread per pair
  last_message_at TIMESTAMP WITH TIME ZONE,
  jitsi_room_id TEXT, -- For group live class rooms
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create conversation_members table
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  last_read_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 2000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Create message_reports table
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_direct_key ON conversations(direct_key) WHERE direct_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON message_reports(message_id);

-- SECURITY DEFINER helper function to check if user is conversation member
CREATE OR REPLACE FUNCTION is_conversation_member(user_id UUID, conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_members
    WHERE conversation_members.user_id = is_conversation_member.user_id
    AND conversation_members.conversation_id = is_conversation_member.conversation_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Rate limiting table for messages
CREATE TABLE IF NOT EXISTS message_rate_limits (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minute_start TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, minute_start)
);

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_message_rate_limit(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_minute TIMESTAMP WITH TIME ZONE;
  current_count INTEGER;
BEGIN
  current_minute := date_trunc('minute', NOW());
  
  -- Get or create rate limit entry
  INSERT INTO message_rate_limits (user_id, minute_start, message_count)
  VALUES (user_id, current_minute, 1)
  ON CONFLICT (user_id, minute_start)
  DO UPDATE SET message_count = message_rate_limits.message_count + 1
  RETURNING message_count INTO current_count;
  
  -- If count is 1, it was a new entry, so allow
  IF current_count = 1 THEN
    RETURN TRUE;
  END IF;
  
  -- If count exceeds 30, reject
  IF current_count > 30 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to enforce rate limit before insert
CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_message_rate_limit(NEW.sender_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 30 messages per minute';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rate limiting
DROP TRIGGER IF EXISTS message_rate_limit_trigger ON messages;
CREATE TRIGGER message_rate_limit_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION enforce_message_rate_limit();

-- Function to update last_message_at on conversation
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_timestamp_trigger ON messages;
CREATE TRIGGER update_conversation_timestamp_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can see conversations they are members of
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (is_conversation_member(auth.uid(), id));

-- No client-side insert into conversations (server actions only)
CREATE POLICY "No direct insert into conversations"
  ON conversations FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update conversations"
  ON conversations FOR UPDATE
  WITH CHECK (false);

CREATE POLICY "No direct delete conversations"
  ON conversations FOR DELETE
  USING (false);

-- RLS Policies for conversation_members
-- Users can view members of conversations they are in
CREATE POLICY "Users can view conversation members"
  ON conversation_members FOR SELECT
  USING (is_conversation_member(auth.uid(), conversation_id));

-- Only server actions should insert members
CREATE POLICY "No direct insert into conversation_members"
  ON conversation_members FOR INSERT
  WITH CHECK (false);

-- Users can update their own last_read_at
CREATE POLICY "Users can update their own read status"
  ON conversation_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can leave conversations
CREATE POLICY "Users can delete themselves from conversations"
  ON conversation_members FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for messages
-- Users can view messages in conversations they are members of
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (is_conversation_member(auth.uid(), conversation_id));

-- Users can insert messages only if they are members and sender is themselves
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_conversation_member(auth.uid(), conversation_id)
    AND NOT EXISTS (
      -- Check if sender is blocked by any member
      SELECT 1 FROM blocks
      WHERE blocker_id IN (SELECT user_id FROM conversation_members WHERE conversation_id = messages.conversation_id)
      AND blocked_id = auth.uid()
    )
  );

-- No updates or deletes on messages
CREATE POLICY "No direct update messages"
  ON messages FOR UPDATE
  WITH CHECK (false);

CREATE POLICY "No direct delete messages"
  ON messages FOR DELETE
  USING (false);

-- RLS Policies for blocks
-- Users can view their own blocks
CREATE POLICY "Users can view their blocks"
  ON blocks FOR SELECT
  USING (blocker_id = auth.uid());

-- Users can create blocks
CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- Users can delete their blocks
CREATE POLICY "Users can delete their blocks"
  ON blocks FOR DELETE
  USING (blocker_id = auth.uid());

-- RLS Policies for message_reports
-- Users can view their own reports
CREATE POLICY "Users can view their reports"
  ON message_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON message_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Add messages table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
