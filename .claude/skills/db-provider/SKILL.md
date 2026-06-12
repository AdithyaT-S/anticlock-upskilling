---
description: >
  Use when writing any database query, server action, or API route.
  Explains how to use src/lib/db/index.ts correctly across all providers
  so no provider-specific SDK leaks into application code.
---

# Skill: db-provider

## The rule
**Never import from a provider SDK directly in application code.**

Wrong:
```ts
import { createClient } from '@supabase/supabase-js'        // ✗
import { Pool } from 'pg'                                    // ✗
import { neon } from '@neondatabase/serverless'              // ✗
```

Right:
```ts
import { query, queryForOrg, transaction } from '@/lib/db'  // ✓
```

## How to write a server action

```ts
'use server'
import { queryForOrg, transaction } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { contactSchema } from '@/lib/validations/contact'

export async function createContact(input: unknown) {
  // 1. Auth — always first
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized' }

  // 2. Validate
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Query — always pass orgId + userId for RLS context
  const [contact] = await queryForOrg<Contact>(
    user.orgId,
    user.id,
    `INSERT INTO contacts (org_id, first_name, last_name, email, owner_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.orgId, parsed.data.first_name, parsed.data.last_name,
     parsed.data.email, user.id]
  )

  revalidatePath('/contacts')
  return { data: contact }
}
```

## How RLS context flows by provider

| Provider | How org_id reaches Postgres |
|---|---|
| local / rds / railway | `SET LOCAL app.current_org_id` before each query via pg.ts |
| neon | Same — `set_config()` in the same HTTP transaction |
| supabase | PostgREST reads JWT claim automatically — no extra code |

The `queryForOrg()` helper handles all of this. Always use it for
queries that should be org-scoped. Only use raw `query()` for
admin/service operations where you want to bypass org context.

## Transactions

```ts
const result = await transaction(async (q) => {
  const [deal] = await q<Deal>(
    'INSERT INTO deals (org_id, name, stage_id) VALUES ($1,$2,$3) RETURNING *',
    [orgId, name, stageId]
  )
  await q(
    'INSERT INTO activities (org_id, type, deal_id, body) VALUES ($1,$2,$3,$4)',
    [orgId, 'note', deal.id, `Deal created: ${name}`]
  )
  return deal
}, { orgId, userId })
```

## Adding a new provider

1. Create `src/lib/db/providers/<name>.ts` implementing `DBProviderImpl`
2. Add the case to `src/lib/db/index.ts`
3. Add the env template to `.env.all-providers`
4. Add the migration step to `.github/workflows/deploy.yml`
5. No changes to any server action or API route
