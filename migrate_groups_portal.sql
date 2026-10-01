-- Extend the existing groups/group_members tables for the Google Classroom-style
-- portal (roadmap §3).
--
-- `groups` and `group_members` already exist and are used by the tutoring
-- session flow, so this migration ALTERs them rather than recreating them:
--
--   groups         existing: id, tutor_id, name, description, created_at, updated_at
--   group_members  existing: id, group_id, learner_id, enrolled_at
--
-- Note the existing member column is `learner_id`, not the roadmap's
-- `user_id`. It is kept as-is so current code and RLS policies keep working;
-- `role` is added alongside it to express co-tutor / student.
--
-- Idempotent: safe to re-run.

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_privacy') THEN
    CREATE TYPE group_privacy AS ENUM ('private', 'public', 'invite_only', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_member_role') THEN
    CREATE TYPE group_member_role AS ENUM ('tutor', 'co_tutor', 'student');
  END IF;
END
$$;

-- ── groups ──────────────────────────────────────────────────────────────────
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_code VARCHAR(10);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy group_privacy NOT NULL DEFAULT 'private';

-- Human-friendly join code. Existing rows get a generated backfill.
UPDATE groups
SET group_code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE group_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_group_code_key ON groups(group_code);

CREATE INDEX IF NOT EXISTS idx_groups_tutor_id ON groups(tutor_id);
CREATE INDEX IF NOT EXISTS idx_groups_privacy ON groups(privacy);

-- A group needs a tutor that actually exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'groups_tutor_id_fkey'
  ) THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_tutor_id_fkey
      FOREIGN KEY (tutor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- ── group_members ───────────────────────────────────────────────────────────
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role group_member_role NOT NULL DEFAULT 'student';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_group_id_fkey'
  ) THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_learner_id_fkey'
  ) THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_learner_id_fkey
      FOREIGN KEY (learner_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- One membership per learner per group.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'group_members_group_learner_key'
  ) THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_group_learner_key
      UNIQUE (group_id, learner_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_group_members_learner_id ON group_members(learner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Without RLS enabled these tables are readable/writable by any authenticated
-- client through the Supabase REST API, which would leak class rosters.
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tutors can manage their own groups" ON groups;
CREATE POLICY "Tutors can manage their own groups" ON groups
  FOR ALL USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

-- Public groups are discoverable by any signed-in user; private ones only by
-- their tutor or an admin.
DROP POLICY IF EXISTS "Authenticated users can discover groups" ON groups;
CREATE POLICY "Authenticated users can discover groups" ON groups
  FOR SELECT USING (
    privacy = 'public'
    OR tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Members can view their group memberships" ON group_members;
CREATE POLICY "Members can view their group memberships" ON group_members
  FOR SELECT USING (
    learner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.tutor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Tutors can manage group members" ON group_members;
CREATE POLICY "Tutors can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.tutor_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM groups WHERE groups.id = group_members.group_id AND groups.tutor_id = auth.uid())
  );

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Supabase Realtime honours publication membership; without this, live
-- announcements and roster changes never reach subscribers.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
END
$$;
