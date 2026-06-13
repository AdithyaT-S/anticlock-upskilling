# Skill: server-action

Use this exact pattern for ALL server actions (mutations).
Uses `@/lib/db` abstraction — works on Docker local, Supabase, RDS, Neon, Railway.

## Pattern

```typescript
'use server'
import { queryForOrg } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { contactSchema } from '@/lib/validations/contact'
import { getAuthUser } from '@/lib/auth'
import type { Contact } from '@/types/crm'

export async function createContact(formData: unknown) {
  // 1. Auth check — ALWAYS first, no exceptions
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  // 2. Validate — ALWAYS before DB, no exceptions
  const parsed = contactSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Mutate via provider-agnostic query
  const [contact] = await queryForOrg<Contact>(
    user.orgId,
    user.id,
    `INSERT INTO contacts (org_id, owner_id, first_name, last_name, email, phone, company)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user.orgId,
      user.id,
      parsed.data.first_name,
      parsed.data.last_name,
      parsed.data.email,
      parsed.data.phone ?? null,
      parsed.data.company ?? null,
    ]
  )

  // 4. Revalidate
  revalidatePath('/contacts')
  return { data: contact }
}

export async function updateContact(id: string, formData: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = contactSchema.partial().safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [contact] = await queryForOrg<Contact>(
    user.orgId,
    user.id,
    `UPDATE contacts SET first_name = $1, last_name = $2, email = $3, updated_at = now()
     WHERE id = $4 AND org_id = $5
     RETURNING *`,
    [parsed.data.first_name, parsed.data.last_name, parsed.data.email, id, user.orgId]
  )

  revalidatePath(`/contacts/${id}`)
  revalidatePath('/contacts')
  return { data: contact }
}

export async function deleteContact(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  await queryForOrg(
    user.orgId,
    user.id,
    `UPDATE contacts SET deleted_at = now() WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )

  revalidatePath('/contacts')
  return { success: true }
}
```

## Activity mapping — use shared helper, never copy-paste

When an action needs to return activities, import from the shared utility — never define `DbActivityRow`, `ACTIVITY_TITLES`, or `mapToActivity` locally:

```typescript
import { type DbActivityRow, mapToActivity } from '@/lib/utils/activity'

// In your action:
const rows = await queryForOrg<DbActivityRow>(user.orgId, user.id, activitySql, params)
const activities = rows.map((r) => mapToActivity(r, user.orgId, { contact_id: contactId }))
//                                                                 ^ or deal_id / lead_id / ticket_id
```

## Shared types — canonical sources

| Type | Import from |
|------|-------------|
| `OrgMember` | `@/lib/actions/contacts` |
| `ContactOption` | `@/lib/actions/contacts` |
| `DbActivityRow` | `@/lib/utils/activity` |

Never redefine these in leads/deals/tickets action files — import and re-export if callers need them:
```typescript
import type { OrgMember, ContactOption } from '@/lib/actions/contacts'
export type { OrgMember, ContactOption }
```

## Parameter numbering in multi-query actions

When a single action runs TWO queries that share the same `$idx` counter (e.g. count + paginated list), **do not increment `idx` between queries**. Both queries receive their own params array starting from the same base:

```typescript
// ✅ Correct — idx is the org_id position; same for both queries
const [countRow] = await queryForOrg(orgId, userId, `WHERE org_id = $${idx}`, [...filters, orgId])
const rows       = await queryForOrg(orgId, userId, `WHERE org_id = $${idx} LIMIT $${idx+1} OFFSET $${idx+2}`, [...filters, orgId, limit, offset])

// ❌ Wrong — idx++ after count shifts all refs in the main query by +1
idx++
const rows = await queryForOrg(orgId, userId, `WHERE org_id = $${idx} ...`, [...filters, orgId, limit, offset])
```

## Rules

- Auth check is line 1 — no exceptions
- Zod parse before any DB call — no exceptions
- Use `queryForOrg()` from `@/lib/db` — never provider SDKs directly
- Return `{ error }` or `{ data }` — never throw to the client
- Always revalidatePath after mutation
- `org_id` and `owner_id` always come from `getAuthUser()` — never trust client-supplied values
- Soft delete: set `deleted_at = now()`, never hard delete contact/lead/deal records
- Never define `DbActivityRow`, `ACTIVITY_TITLES`, `mapToActivity` locally — use `@/lib/utils/activity`
- `OrgMember` and `ContactOption` always come from `@/lib/actions/contacts`
