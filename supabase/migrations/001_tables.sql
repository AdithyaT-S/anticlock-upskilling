-- ================================================================
-- 001_tables.sql
--
-- All FreshCRM tables. Pure Postgres 15 — no provider-specific
-- syntax. Tested on Docker, RDS, Supabase, Neon, Railway.
-- ================================================================

-- ── orgs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orgs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  plan       text NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free','pro','enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── users ────────────────────────────────────────────────────────
-- auth_provider_id: the UUID from whichever auth system you use
--   Supabase Auth → auth.users.id
--   NextAuth      → your own users table id
--   Cognito       → sub claim from Cognito JWT
CREATE TABLE IF NOT EXISTS users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  auth_provider_id text UNIQUE,       -- external auth system reference
  email            text NOT NULL,
  full_name        text NOT NULL DEFAULT '',
  avatar_url       text,
  role             text NOT NULL DEFAULT 'member'
                     CHECK (role IN ('admin','member','viewer')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_org      ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_id  ON users(auth_provider_id);

-- ── contacts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  email         text,
  phone         text,
  company       text,
  job_title     text,
  lead_source   text CHECK (lead_source IN
                  ('website','referral','cold_outreach','social','event','other')),
  owner_id      uuid REFERENCES users(id) ON DELETE SET NULL,
  tags          text[]  NOT NULL DEFAULT '{}',
  custom_fields jsonb   NOT NULL DEFAULT '{}',
  deleted_at    timestamptz,          -- soft delete
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_contacts_org     ON contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_owner   ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_active  ON contacts(org_id)
  WHERE deleted_at IS NULL;
-- trigram index for fast ILIKE search
CREATE INDEX IF NOT EXISTS idx_contacts_search  ON contacts
  USING gin((
    coalesce(first_name,'') || ' ' || coalesce(last_name,'') ||
    ' ' || coalesce(email,'') || ' ' || coalesce(company,'')
  ) gin_trgm_ops);

-- ── leads ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id   uuid REFERENCES contacts(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','contacted','qualified','lost')),
  score        int  NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  source       text,
  owner_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  notes        text,
  converted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_org     ON leads(org_id);
CREATE INDEX IF NOT EXISTS idx_leads_contact ON leads(contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(org_id, status);

-- ── pipelines ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pipelines (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name       text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pipelines_org ON pipelines(org_id);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  name        text NOT NULL,
  position    int  NOT NULL DEFAULT 0,
  probability int  NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline ON pipeline_stages(pipeline_id);

-- ── deals ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name        text NOT NULL,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  pipeline_id uuid NOT NULL REFERENCES pipelines(id),
  stage_id    uuid NOT NULL REFERENCES pipeline_stages(id),
  value       numeric(14,2) NOT NULL DEFAULT 0,
  currency    char(3) NOT NULL DEFAULT 'INR',
  close_date  date,
  owner_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','won','lost')),
  lost_reason text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_deals_org     ON deals(org_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage   ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_status  ON deals(org_id, status);

-- ── tickets ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','pending','resolved','closed')),
  priority    text NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','urgent')),
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sla_due_at  timestamptz,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tickets_org      ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(org_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee ON tickets(assignee_id);

-- ── activities (unified timeline) ────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type       text NOT NULL
               CHECK (type IN ('call','email','note','task','meeting')),
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id    uuid REFERENCES deals(id) ON DELETE SET NULL,
  ticket_id  uuid REFERENCES tickets(id) ON DELETE SET NULL,
  body       text,
  due_at     timestamptz,
  done_at    timestamptz,
  owner_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activities_org     ON activities(org_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal    ON activities(deal_id);

-- ── email threads + messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_threads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  contact_id         uuid REFERENCES contacts(id) ON DELETE SET NULL,
  subject            text NOT NULL,
  provider_thread_id text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_org     ON email_threads(org_id);
CREATE INDEX IF NOT EXISTS idx_threads_contact ON email_threads(contact_id);

CREATE TABLE IF NOT EXISTS email_messages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES email_threads(id) ON DELETE CASCADE,
  from_addr text NOT NULL,
  to_addrs  text[] NOT NULL DEFAULT '{}',
  body_html text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sent_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON email_messages(thread_id);

-- ── Apply updated_at trigger to all mutable tables ───────────────
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orgs','users','contacts','leads',
    'deals','tickets','activities'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$I;
       CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON %1$I
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t
    );
  END LOOP;
END $$;
