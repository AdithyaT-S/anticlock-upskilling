-- ================================================================
-- 002_rls.sql
--
-- Row Level Security using current_org_id() from 000_extensions.
--
-- HOW IT WORKS ON EACH PROVIDER:
--
-- Docker / RDS / Neon / Railway:
--   Your db client runs this before every query:
--     SET LOCAL app.current_org_id = '<uuid>';
--     SET LOCAL app.current_user_id = '<uuid>';
--   current_org_id() reads those session vars.
--   See src/lib/db/providers/pg.ts → withOrgContext()
--
-- Supabase:
--   PostgREST extracts org_id from the JWT and sets
--   request.jwt.claims automatically. current_org_id()
--   reads it from there. Zero extra code needed.
--
-- TO DISABLE RLS (e.g. you prefer app-layer enforcement):
--   Set DB_USE_RLS=false in .env
--   Your migration runner will skip this file.
--   Your server actions then manually add WHERE org_id = $1.
-- ================================================================

-- Roles (Supabase creates these; we create them if missing)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
    THEN CREATE ROLE authenticated NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
    THEN CREATE ROLE anon NOLOGIN NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
    THEN CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS; END IF;
END $$;

-- Grant table access to roles
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orgs','users','contacts','leads','pipelines','pipeline_stages',
    'deals','tickets','activities','email_threads','email_messages'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON %I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON %I TO service_role;', t);
    EXECUTE format('GRANT SELECT ON %I TO anon;', t);
  END LOOP;
END $$;

-- ── orgs ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "orgs_read"   ON orgs;
DROP POLICY IF EXISTS "orgs_write"  ON orgs;
CREATE POLICY "orgs_read"  ON orgs FOR SELECT USING (id = current_org_id());
CREATE POLICY "orgs_write" ON orgs FOR UPDATE  USING (id = current_org_id());

-- ── users ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read"   ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_read"   ON users FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (org_id = current_org_id());
CREATE POLICY "users_update" ON users FOR UPDATE USING (id = current_user_id());

-- ── contacts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contacts_read"   ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;
CREATE POLICY "contacts_read"   ON contacts FOR SELECT
  USING (org_id = current_org_id() AND deleted_at IS NULL);
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
  WITH CHECK (org_id = current_org_id());
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
  USING (org_id = current_org_id());
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
  USING (org_id = current_org_id());

-- ── leads ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leads_all" ON leads;
CREATE POLICY "leads_all" ON leads FOR ALL
  USING (org_id = current_org_id());

-- ── pipelines ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "pipelines_all" ON pipelines;
CREATE POLICY "pipelines_all" ON pipelines FOR ALL
  USING (org_id = current_org_id());

DROP POLICY IF EXISTS "stages_all" ON pipeline_stages;
CREATE POLICY "stages_all" ON pipeline_stages FOR ALL
  USING (pipeline_id IN (
    SELECT id FROM pipelines WHERE org_id = current_org_id()
  ));

-- ── deals ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "deals_all" ON deals;
CREATE POLICY "deals_all" ON deals FOR ALL
  USING (org_id = current_org_id());

-- ── tickets ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tickets_all" ON tickets;
CREATE POLICY "tickets_all" ON tickets FOR ALL
  USING (org_id = current_org_id());

-- ── activities ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activities_all" ON activities;
CREATE POLICY "activities_all" ON activities FOR ALL
  USING (org_id = current_org_id());

-- ── email ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "threads_all"  ON email_threads;
DROP POLICY IF EXISTS "messages_all" ON email_messages;
CREATE POLICY "threads_all" ON email_threads FOR ALL
  USING (org_id = current_org_id());
CREATE POLICY "messages_all" ON email_messages FOR ALL
  USING (thread_id IN (
    SELECT id FROM email_threads WHERE org_id = current_org_id()
  ));
