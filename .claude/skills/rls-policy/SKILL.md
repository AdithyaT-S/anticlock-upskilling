# Skill: rls-policy

Every table MUST have RLS enabled and all 4 policies scoped to org_id.
These policies are portable — they work identically on Docker local, Supabase, RDS, Neon, and Railway
because `current_org_id()` reads from either JWT claims or session variables depending on the provider.

## Pattern

```sql
-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- SELECT: can only read own org's rows
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (org_id = current_org_id());

-- INSERT: can only insert into own org
CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (org_id = current_org_id());

-- UPDATE: can only update own org's rows
CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (org_id = current_org_id());

-- DELETE: can only delete own org's rows
CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (org_id = current_org_id());
```

## The current_org_id() function (already in 000_extensions.sql)

```sql
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
BEGIN
  -- Supabase path: org_id from JWT claims
  BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json ->> 'org_id')::uuid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  -- RDS / Neon / Railway / local path: org_id from session variable
  RETURN current_setting('app.current_org_id', true)::uuid;
END;
$$ LANGUAGE plpgsql STABLE;
```

## Rules

- Every table gets all 4 policies (SELECT, INSERT, UPDATE, DELETE) — no exceptions
- Always scope to `org_id` via `current_org_id()` — never use `auth.uid()` alone
- Soft-deleteable tables (contacts, leads, deals): filter `deleted_at` in application layer, not RLS
- Service role key bypasses RLS — only use for migrations and inbound email webhooks
- New provider? The `pg.ts` provider calls `SET LOCAL app.current_org_id = $1` before every query
  — no policy changes needed, RLS just works
