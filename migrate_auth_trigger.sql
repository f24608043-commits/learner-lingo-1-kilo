-- Auto-create a public.profiles row whenever a Supabase auth user signs up.
--
-- Without this trigger, sign-up succeeds in auth.users but leaves the user
-- with no profile, so every role-gated page redirects them back to sign-in.
-- Idempotent: safe to re-run.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name, xp, streak_count, onboarding_done)
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.raw_user_meta_data ->> 'role' IN ('learner', 'tutor', 'admin')
        THEN (NEW.raw_user_meta_data ->> 'role')::user_role
      ELSE 'learner'::user_role
    END,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
    ),
    0,
    0,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
