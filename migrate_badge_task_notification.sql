-- Badges, tasks, ranks, and notifications.
--
-- Idempotent: safe to re-run against a database that already has these
-- objects. Mirrors the schema that is live in Supabase.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ───────────────────────────────────────────────────────────────────
-- ADD VALUE cannot run inside a transaction block on older Postgres, so
-- these are guarded individually rather than wrapped in DO blocks.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'badge_category') THEN
    CREATE TYPE badge_category AS ENUM (
      'academic', 'participation', 'behavior',
      'achievement', 'milestone', 'social'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM (
      'assigned', 'submitted', 'graded', 'overdue', 'cancelled'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_target_type') THEN
    CREATE TYPE task_target_type AS ENUM ('learner', 'classroom');
  END IF;
END
$$;

-- notification_type predates this migration, so only add the values the
-- application uses that may not be present yet.
DO $$
DECLARE
  v TEXT;
  wanted TEXT[] := ARRAY[
    'friend_request', 'friend_accepted', 'badge_earned', 'streak_milestone',
    'lesson_completed', 'leaderboard_rank', 'enrollment_request',
    'enrollment_accepted', 'enrollment_declined', 'session_scheduled',
    'session_reminder', 'session_started', 'session_cancelled',
    'task_assigned', 'task_submitted', 'task_graded', 'badge_awarded',
    'message_received', 'group_invite', 'system'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('system');
  END IF;

  FOREACH v IN ARRAY wanted LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_enum e
                   JOIN pg_type t ON t.oid = e.enumtypid
                   WHERE t.typname = 'notification_type' AND e.enumlabel = v) THEN
      EXECUTE format('ALTER TYPE notification_type ADD VALUE %L', v);
    END IF;
  END LOOP;
END
$$;

-- ── Tables ──────────────────────────────────────────────────────────────────
-- badges already existed with criteria columns; add the new columns.
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria_type TEXT NOT NULL DEFAULT 'lessons_completed',
  criteria_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE badges ADD COLUMN IF NOT EXISTS category badge_category NOT NULL DEFAULT 'achievement';
ALTER TABLE badges ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Guard against duplicate badge names, dropping any that already clash.
CREATE UNIQUE INDEX IF NOT EXISTS badges_name_key ON badges(name);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_is_active ON badges(is_active);

CREATE TABLE IF NOT EXISTS learner_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_by_tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context TEXT,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learner_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_learner_badges_learner_id ON learner_badges(learner_id);
CREATE INDEX IF NOT EXISTS idx_learner_badges_badge_id ON learner_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_learner_badges_awarded_by_tutor_id ON learner_badges(awarded_by_tutor_id);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type task_target_type NOT NULL,
  target_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  status task_status NOT NULL DEFAULT 'assigned',
  attachments JSONB,
  feedback TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_tutor_id ON tasks(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_target ON tasks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE TABLE IF NOT EXISTS user_ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  metrics JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ranks_user_id ON user_ranks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ranks_role ON user_ranks(role);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE learner_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active badges" ON badges;
CREATE POLICY "Anyone can view active badges" ON badges
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Tutors can view learner badges they awarded" ON learner_badges;
CREATE POLICY "Tutors can view learner badges they awarded" ON learner_badges
  FOR SELECT USING (awarded_by_tutor_id = auth.uid());

DROP POLICY IF EXISTS "Learners can view their own badges" ON learner_badges;
CREATE POLICY "Learners can view their own badges" ON learner_badges
  FOR SELECT USING (learner_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can award badges" ON learner_badges;
CREATE POLICY "Tutors can award badges" ON learner_badges
  FOR INSERT WITH CHECK (
    awarded_by_tutor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'tutor')
  );

DROP POLICY IF EXISTS "Tutors can manage their tasks" ON tasks;
CREATE POLICY "Tutors can manage their tasks" ON tasks
  FOR ALL USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

DROP POLICY IF EXISTS "Learners can view tasks assigned to them" ON tasks;
CREATE POLICY "Learners can view tasks assigned to them" ON tasks
  FOR SELECT USING (
    (target_type = 'learner' AND target_id = auth.uid())
    OR (target_type = 'classroom' AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = tasks.target_id
        AND group_members.learner_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can view their own rank" ON user_ranks;
CREATE POLICY "Users can view their own rank" ON user_ranks
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can view their learners ranks" ON user_ranks;
CREATE POLICY "Tutors can view their learners ranks" ON user_ranks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tutor_enrollments
      WHERE tutor_enrollments.tutor_id = auth.uid()
        AND tutor_enrollments.learner_id = user_ranks.user_id
        AND tutor_enrollments.status = 'enrolled'
    )
  );

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Default badges ──────────────────────────────────────────────────────────
-- criteria_type must satisfy the badge_criteria_type enum already in the DB.
INSERT INTO badges (name, description, category, icon_url, criteria_type, criteria_value) VALUES
  ('First Task Completed', 'Completed your first task!',                 'milestone',    '🏆', 'lessons_completed', 1),
  ('Perfect Attendance',  'Attended all sessions for a month',           'participation', '📅', 'streak_days',        30),
  ('Top Score',           'Achieved the highest score in a task',        'academic',     '🎯', 'xp_earned',          1000),
  ('Most Improved',       'Showed the most improvement',                'achievement',  '📈', 'xp_earned',          500),
  ('Team Player',         'Helped peers in group activities',           'social',       '🤝', 'lessons_completed',  5),
  ('Perfect Score',       'Got 100% on a task',                         'academic',     '💯', 'xp_earned',          200),
  ('Early Bird',          'Submitted all tasks early',                  'participation', '🐦', 'lessons_completed',  3),
  ('Night Owl',           'Completed tasks late at night',              'participation', '🦉', 'lessons_completed',  3),
  ('Streak Master',       'Maintained a 7-day streak',                  'milestone',    '🔥', 'streak_days',        7),
  ('Helpful Peer',        'Helped other learners',                      'social',       '💡', 'lessons_completed',  5)
ON CONFLICT (name) DO NOTHING;
