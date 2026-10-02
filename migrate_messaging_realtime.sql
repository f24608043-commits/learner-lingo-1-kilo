-- Realtime publication for direct messaging.
--
-- app/messages/[id]/page.tsx subscribes to postgres_changes on public.messages.
-- Supabase only emits change events for tables that belong to a publication, so
-- while public.messages was absent from supabase_realtime the subscription
-- connected successfully but never delivered anything: a second user sending a
-- message stayed invisible until the thread was reloaded.
--
-- Idempotent: re-running only adds tables that are still missing.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;