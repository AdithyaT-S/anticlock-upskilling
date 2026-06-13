# Skill: db-query

Use this pattern for ALL database reads. Never import provider SDKs directly.
The `@/lib/db` abstraction works identically on Docker local, Supabase, RDS, Neon, and Railway.

## Pattern

```typescript
import { queryForOrg } from '@/lib/db'
import type { Contact } from '@/types/crm'

export async function getContacts(orgId: string, userId: string) {
  const rows = await queryForOrg<Contact>(
    orgId,
    userId,
    `SELECT id, first_name, last_name, email, company, owner_id, created_at
     FROM contacts
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`,
    []
  )
  return rows
}
```

## With filters

```typescript
export async function searchContacts(orgId: string, userId: string, search: string) {
  const rows = await queryForOrg<Contact>(
    orgId,
    userId,
    `SELECT id, first_name, last_name, email, company
     FROM contacts
     WHERE deleted_at IS NULL
       AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)
     ORDER BY created_at DESC`,
    [`%${search}%`]
  )
  return rows
}
```

## Rules

- Always use `queryForOrg()` — never `query()` for multi-tenant data
- Always filter `deleted_at IS NULL` for soft-deleteable records
- Always pass `orgId` and `userId` — RLS context is set automatically by the provider
- Never import `pg`, `@supabase/supabase-js`, or `@neondatabase/serverless` in app code
- Never call DB directly inside a React component — always go through `src/lib/actions/`
- Read `.claude/skills/db-provider/SKILL.md` for the full provider contract
