-- ================================================================
-- 000_extensions.sql
--
-- Standard Postgres extensions only.
-- Runs identically on:
--   Docker Postgres 15  |  AWS RDS 15  |  Supabase  |  Neon
--   Railway  |  Google Cloud SQL  |  Azure Postgres
--
-- NO Supabase-specific functions here. RLS policies use a
-- portable pattern that works everywhere (see 002_rls.sql).
-- ================================================================

-- UUID generation (standard, available on all providers)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fast trigram text search (contacts search bar)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Cryptography (password hashing when using self-hosted auth)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Portable org_id isolation helper ────────────────────────────
-- This function reads org_id from a Postgres session variable.
-- It is set by your application layer before every query.
--
-- On Supabase: the JWT claim org_id is extracted by PostgREST
--   and set automatically. No change needed.
-- On RDS/Neon/Railway: your db client calls
--   SET LOCAL app.current_org_id = '<uuid>' in a transaction,
--   which this function reads.
-- On Docker: set manually in psql for testing:
--   SET app.current_org_id = '00000000-0000-0000-0000-000000000001';

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN COALESCE(
    -- Supabase path: org_id inside JWT claims
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
      ->> 'org_id',
    -- RDS/Neon/Railway path: set by app before query
    NULLIF(current_setting('app.current_org_id', true), '')
  )::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ── Portable current_user_id helper ─────────────────────────────
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN COALESCE(
    -- Supabase: sub claim from JWT
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb
      ->> 'sub',
    -- RDS/Neon/Railway: set by app before query
    NULLIF(current_setting('app.current_user_id', true), '')
  )::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ── updated_at auto-trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
