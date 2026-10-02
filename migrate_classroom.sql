-- ============================================================================
-- LEGO PLATFORM — CLASSROOM SCHEMA (roadmap §3, §4, §2.4)
-- Run this in Supabase → SQL Editor → New query → Run.
--
-- SAFE TO RE-RUN (idempotent). Safe to run before or after
-- migrate_groups_portal.sql.
--
-- ── What already exists and is deliberately NOT recreated here ─────────────
--   groups / group_members   extended by migrate_groups_portal.sql
--   tutor_profiles           exists (id + tutor_id, bio, subjects[], rating…)
--   tutor_enrollments        exists (tutor ↔ learner, status pending/enrolled…)
--   session_requests         exists (1:1 tutoring session requests)
--   tasks                    exists — tutor→learner/classroom tasks
--   challenges / challenge_options
--                            exist — LESSON-level AI quiz questions
--
-- The tables below are deliberately kept separate from those:
--   • `assignments` is GROUP-classwork scoped (Google Classroom "Classwork").
--     `tasks` remains the 1:1 tutor→learner assignment system already in use.
--   • `quiz_questions`/`quiz_options` are GROUP-quiz scoped.
--     `challenges`/`challenge_options` remain the lesson-level AI quiz tables,
--     so existing lesson quizzes keep working untouched.
-- ============================================================================

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_privacy') THEN
    CREATE TYPE group_privacy AS ENUM ('private', 'public', 'invite_only', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_member_role') THEN
    CREATE TYPE group_member_role AS ENUM ('tutor', 'co_tutor', 'student');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'archived');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'graded', 'returned', 'late');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_question_type') THEN
    CREATE TYPE quiz_question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_request_status') THEN
    CREATE TYPE enrollment_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_target_type') THEN
    CREATE TYPE comment_target_type AS ENUM ('group', 'announcement', 'assignment');
  END IF;
END
$$;

-- ── Ensure the classroom prerequisites from migrate_groups_portal.sql ──────
-- Included here so this file can be run on its own.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS group_code VARCHAR(10);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy group_privacy NOT NULL DEFAULT 'private';

UPDATE groups
SET group_code = UPPER(SUBSTRING(REPLACE(id::text, '-', '') FROM 1 FOR 6))
WHERE group_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS groups_group_code_key ON groups(group_code);
CREATE INDEX IF NOT EXISTS idx_groups_tutor_id ON groups(tutor_id);
CREATE INDEX IF NOT EXISTS idx_groups_privacy ON groups(privacy);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_tutor_id_fkey') THEN
    ALTER TABLE groups
      ADD CONSTRAINT groups_tutor_id_fkey
      FOREIGN KEY (tutor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS role group_member_role NOT NULL DEFAULT 'student';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_group_id_fkey') THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_group_id_fkey
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_learner_id_fkey') THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_learner_id_fkey
      FOREIGN KEY (learner_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'group_members_group_learner_key') THEN
    ALTER TABLE group_members
      ADD CONSTRAINT group_members_group_learner_key UNIQUE (group_id, learner_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_group_members_learner_id ON group_members(learner_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);

-- ── Assignments (Classwork) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ,
  points INTEGER NOT NULL DEFAULT 100,
  status assignment_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tutor_id ON assignments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE TABLE IF NOT EXISTS assignment_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_attachments_assignment_id
  ON assignment_attachments(assignment_id);

-- ── Submissions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text_answer TEXT,
  submitted_at TIMESTAMPTZ,
  status submission_status NOT NULL DEFAULT 'draft',
  points_earned INTEGER,
  feedback TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

CREATE TABLE IF NOT EXISTS submission_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255),
  file_type VARCHAR(50),
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_attachments_submission_id
  ON submission_attachments(submission_id);

-- ── Quizzes (group-scoped) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  time_limit_minutes INTEGER,
  allow_retakes BOOLEAN NOT NULL DEFAULT false,
  max_attempts INTEGER NOT NULL DEFAULT 1,
  randomize_questions BOOLEAN NOT NULL DEFAULT false,
  randomize_options BOOLEAN NOT NULL DEFAULT false,
  show_results_after BOOLEAN NOT NULL DEFAULT true,
  passing_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_assignment_id ON quizzes(assignment_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type quiz_question_type NOT NULL DEFAULT 'multiple_choice',
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  -- For short_answer / essay grading: the reference answer.
  correct_text TEXT,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_options(question_id);

-- Exactly one correct option per multiple-choice / true-false question.
CREATE UNIQUE INDEX IF NOT EXISTS quiz_options_one_correct
  ON quiz_options(question_id)
  WHERE is_correct;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER,
  passed BOOLEAN,
  UNIQUE (quiz_id, student_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES quiz_options(id) ON DELETE SET NULL,
  text_answer TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER,
  auto_graded BOOLEAN NOT NULL DEFAULT true,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

-- ── Announcements & Comments (Stream) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  -- Comma-separated profile ids that were @mentioned, for notification fan-out.
  mention_user_ids UUID[] NOT NULL DEFAULT '{}',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_announcements_group_id
  ON group_announcements(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_announcements_tutor_id
  ON group_announcements(tutor_id);

-- Polymorphic so the same table backs comments on the group, on an
-- announcement, and on an assignment.
CREATE TABLE IF NOT EXISTS group_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type comment_target_type NOT NULL DEFAULT 'group',
  target_id UUID,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES group_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_comments_group_id ON group_comments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_target ON group_comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_user_id ON group_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_parent_id ON group_comments(parent_id);

-- ── Tutor reviews & group enrollment requests ───────────────────────────────
CREATE TABLE IF NOT EXISTS tutor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tutor_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_id ON tutor_reviews(tutor_id);

CREATE TABLE IF NOT EXISTS enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status enrollment_request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  UNIQUE (group_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_requests_group_id ON enrollment_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_student_id ON enrollment_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Every table below is class data (rosters, submissions, grades). Without RLS
-- they would be readable/writable by any signed-in client via PostgREST.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assignments', 'assignment_attachments', 'submissions', 'submission_attachments',
    'quizzes', 'quiz_questions', 'quiz_options', 'quiz_attempts', 'quiz_answers',
    'group_announcements', 'group_comments', 'tutor_reviews', 'enrollment_requests',
    'groups', 'group_members'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;

-- groups ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Tutors can manage their own groups" ON groups;
CREATE POLICY "Tutors can manage their own groups" ON groups
  FOR ALL USING (tutor_id = auth.uid())
  WITH CHECK (tutor_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can discover groups" ON groups;
CREATE POLICY "Authenticated users can discover groups" ON groups
  FOR SELECT USING (
    privacy = 'public'
    OR tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- group_members --------------------------------------------------------------
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

-- assignments ----------------------------------------------------------------
DROP POLICY IF EXISTS "Class members can view published assignments" ON assignments;
CREATE POLICY "Class members can view published assignments" ON assignments
  FOR SELECT USING (
    status = 'published'
    OR tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM group_members gm
               WHERE gm.group_id = assignments.group_id AND gm.learner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tutors can manage assignments" ON assignments;
CREATE POLICY "Tutors can manage assignments" ON assignments
  FOR ALL USING (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = assignments.group_id AND g.tutor_id = auth.uid())
  )
  WITH CHECK (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = assignments.group_id AND g.tutor_id = auth.uid())
  );

-- assignment_attachments -----------------------------------------------------
DROP POLICY IF EXISTS "Class members can view assignment attachments" ON assignment_attachments;
CREATE POLICY "Class members can view assignment attachments" ON assignment_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN groups g ON g.id = a.group_id
      WHERE a.id = assignment_attachments.assignment_id
        AND (g.tutor_id = auth.uid()
             OR a.status = 'published'
             OR EXISTS (SELECT 1 FROM group_members gm
                        WHERE gm.group_id = a.group_id AND gm.learner_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Tutors can manage assignment attachments" ON assignment_attachments;
CREATE POLICY "Tutors can manage assignment attachments" ON assignment_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = assignment_attachments.assignment_id AND g.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = assignment_attachments.assignment_id AND g.tutor_id = auth.uid()
    )
  );

-- submissions ----------------------------------------------------------------
-- A student sees only their own submission; the group's tutor sees all of them.
DROP POLICY IF EXISTS "Students and tutors can view submissions" ON submissions;
CREATE POLICY "Students and tutors can view submissions" ON submissions
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = submissions.assignment_id AND g.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can create their own submissions" ON submissions;
CREATE POLICY "Students can create their own submissions" ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can edit their own unsubmitted work" ON submissions;
CREATE POLICY "Students can edit their own unsubmitted work" ON submissions
  FOR UPDATE USING (student_id = auth.uid() AND status = 'draft')
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can grade submissions" ON submissions;
CREATE POLICY "Tutors can grade submissions" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = submissions.assignment_id AND g.tutor_id = auth.uid()
    )
  );

-- submission_attachments -----------------------------------------------------
DROP POLICY IF EXISTS "Owners and tutors can view submission attachments" ON submission_attachments;
CREATE POLICY "Owners and tutors can view submission attachments" ON submission_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN assignments a ON a.id = s.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE s.id = submission_attachments.submission_id
        AND (s.student_id = auth.uid() OR g.tutor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can manage their submission attachments" ON submission_attachments;
CREATE POLICY "Owners can manage their submission attachments" ON submission_attachments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_attachments.submission_id AND s.student_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_attachments.submission_id AND s.student_id = auth.uid())
  );

-- quizzes --------------------------------------------------------------------
-- Correct answers live in quiz_options.is_correct, which no SELECT policy may
-- expose. Only the owning tutor may read the full option set.
DROP POLICY IF EXISTS "Tutors can view quiz definitions" ON quizzes;
CREATE POLICY "Tutors can view quiz definitions" ON quizzes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = quizzes.assignment_id AND g.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors can manage quizzes" ON quizzes;
CREATE POLICY "Tutors can manage quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = quizzes.assignment_id AND g.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a JOIN groups g ON g.id = a.group_id
      WHERE a.id = quizzes.assignment_id AND g.tutor_id = auth.uid()
    )
  );

-- quiz_questions -------------------------------------------------------------
-- Learners get question text/type/points but NOT correct_text/explanation.
DROP POLICY IF EXISTS "Tutors can view quiz questions" ON quiz_questions;
CREATE POLICY "Tutors can view quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE q.id = quiz_questions.quiz_id AND g.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Learners can view quiz questions without answers" ON quiz_questions;
CREATE POLICY "Learners can view quiz questions without answers" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE q.id = quiz_questions.quiz_id
        AND a.status = 'published'
        AND (g.privacy = 'public'
             OR EXISTS (SELECT 1 FROM group_members gm
                        WHERE gm.group_id = a.group_id AND gm.learner_id = auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Tutors can manage quiz questions" ON quiz_questions;
CREATE POLICY "Tutors can manage quiz questions" ON quiz_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE q.id = quiz_questions.quiz_id AND g.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE q.id = quiz_questions.quiz_id AND g.tutor_id = auth.uid()
    )
  );

-- quiz_options ---------------------------------------------------------------
DROP POLICY IF EXISTS "Tutors can view correct answers" ON quiz_options;
CREATE POLICY "Tutors can view correct answers" ON quiz_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE qq.id = quiz_options.question_id AND g.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tutors can manage quiz options" ON quiz_options;
CREATE POLICY "Tutors can manage quiz options" ON quiz_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE qq.id = quiz_options.question_id AND g.tutor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_questions qq
      JOIN quizzes q ON q.id = qq.quiz_id
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE qq.id = quiz_options.question_id AND g.tutor_id = auth.uid()
    )
  );

-- quiz_attempts --------------------------------------------------------------
DROP POLICY IF EXISTS "Students and tutors can view quiz attempts" ON quiz_attempts;
CREATE POLICY "Students and tutors can view quiz attempts" ON quiz_attempts
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM quizzes q
      JOIN assignments a ON a.id = q.assignment_id
      JOIN groups g ON g.id = a.group_id
      WHERE q.id = quiz_attempts.quiz_id AND g.tutor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can start their own quiz attempts" ON quiz_attempts;
CREATE POLICY "Students can start their own quiz attempts" ON quiz_attempts
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can update their own quiz attempts" ON quiz_attempts;
CREATE POLICY "Students can update their own quiz attempts" ON quiz_attempts
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- quiz_answers ---------------------------------------------------------------
DROP POLICY IF EXISTS "Owners and tutors can view quiz answers" ON quiz_answers;
CREATE POLICY "Owners and tutors can view quiz answers" ON quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa
      LEFT JOIN quizzes q ON q.id = qa.quiz_id
      LEFT JOIN assignments a ON a.id = q.assignment_id
      LEFT JOIN groups g ON g.id = a.group_id
      WHERE qa.id = quiz_answers.attempt_id
        AND (qa.student_id = auth.uid() OR g.tutor_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students can save their own quiz answers" ON quiz_answers;
CREATE POLICY "Students can save their own quiz answers" ON quiz_answers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.student_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM quiz_attempts qa WHERE qa.id = quiz_answers.attempt_id AND qa.student_id = auth.uid())
  );

-- group_announcements --------------------------------------------------------
DROP POLICY IF EXISTS "Class members can view announcements" ON group_announcements;
CREATE POLICY "Class members can view announcements" ON group_announcements
  FOR SELECT USING (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g
               WHERE g.id = group_announcements.group_id
                 AND (g.tutor_id = auth.uid()
                      OR g.privacy = 'public'
                      OR EXISTS (SELECT 1 FROM group_members gm
                                 WHERE gm.group_id = g.id AND gm.learner_id = auth.uid())))
  );

DROP POLICY IF EXISTS "Tutors can manage announcements" ON group_announcements;
CREATE POLICY "Tutors can manage announcements" ON group_announcements
  FOR ALL USING (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = group_announcements.group_id AND g.tutor_id = auth.uid())
  )
  WITH CHECK (
    tutor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = group_announcements.group_id AND g.tutor_id = auth.uid())
  );

-- group_comments -------------------------------------------------------------
DROP POLICY IF EXISTS "Class members can view comments" ON group_comments;
CREATE POLICY "Class members can view comments" ON group_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM groups g
           WHERE g.id = group_comments.group_id
             AND (g.tutor_id = auth.uid()
                  OR g.privacy = 'public'
                  OR EXISTS (SELECT 1 FROM group_members gm
                             WHERE gm.group_id = g.id AND gm.learner_id = auth.uid())))
  );

DROP POLICY IF EXISTS "Class members can post comments" ON group_comments;
CREATE POLICY "Class members can post comments" ON group_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM groups g
                WHERE g.id = group_comments.group_id
                  AND (g.tutor_id = auth.uid()
                       OR g.privacy = 'public'
                       OR EXISTS (SELECT 1 FROM group_members gm
                                  WHERE gm.group_id = g.id AND gm.learner_id = auth.uid())))
  );

DROP POLICY IF EXISTS "Authors can edit or delete their own comments" ON group_comments;
CREATE POLICY "Authors can edit or delete their own comments" ON group_comments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their own comments" ON group_comments;
CREATE POLICY "Authors can delete their own comments" ON group_comments
  FOR DELETE USING (user_id = auth.uid());

-- tutor_reviews --------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone signed in can read tutor reviews" ON tutor_reviews;
CREATE POLICY "Anyone signed in can read tutor reviews" ON tutor_reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Students can create their own review" ON tutor_reviews;
CREATE POLICY "Students can create their own review" ON tutor_reviews
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their own review" ON tutor_reviews;
CREATE POLICY "Authors can update their own review" ON tutor_reviews
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete their own review" ON tutor_reviews;
CREATE POLICY "Authors can delete their own review" ON tutor_reviews
  FOR DELETE USING (student_id = auth.uid());

-- enrollment_requests --------------------------------------------------------
DROP POLICY IF EXISTS "Students can view their own enrollment requests" ON enrollment_requests;
CREATE POLICY "Students can view their own enrollment requests" ON enrollment_requests
  FOR SELECT USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM groups g WHERE g.id = enrollment_requests.group_id AND g.tutor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students can request enrollment" ON enrollment_requests;
CREATE POLICY "Students can request enrollment" ON enrollment_requests
  FOR INSERT WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students can cancel their own pending request" ON enrollment_requests;
CREATE POLICY "Students can cancel their own pending request" ON enrollment_requests
  FOR UPDATE USING (student_id = auth.uid() AND status = 'pending')
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Tutors can respond to enrollment requests" ON enrollment_requests;
CREATE POLICY "Tutors can respond to enrollment requests" ON enrollment_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM groups g WHERE g.id = enrollment_requests.group_id AND g.tutor_id = auth.uid())
  );

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Without publication membership, Supabase Realtime never delivers these.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'groups', 'group_members', 'assignments', 'submissions',
    'group_announcements', 'group_comments', 'enrollment_requests'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- ── Storage bucket for assignment / submission attachments ──────────────────
-- The app signs upload URLs server-side, so the bucket must be public-read but
-- write-restricted; RLS on storage.objects enforces the authenticated write.
INSERT INTO storage.buckets (id, name, public)
VALUES ('classwork', 'classwork', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload classwork files" ON storage.objects;
CREATE POLICY "Authenticated users can upload classwork files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'classwork'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Authenticated users can read classwork files" ON storage.objects;
CREATE POLICY "Authenticated users can read classwork files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'classwork'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Owners can delete their classwork files" ON storage.objects;
CREATE POLICY "Owners can delete their classwork files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'classwork'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── Notification types for classroom activity ───────────────────
-- Kept in sync with notificationTypeEnum in db/schema.ts. Idempotent.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_published';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'assignment_due_soon';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_received';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'submission_graded';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'quiz_published';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'quiz_graded';
