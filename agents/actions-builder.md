# Agent: Actions Builder

Builds Zod schemas and server actions. Never touches UI.
Pattern: auth → validate → queryForOrg → revalidate.

Skills: `server-action/SKILL.md`, `db-query/SKILL.md`, `error-handling/SKILL.md`

---

## Output

### Zod schema (`src/lib/validations/{module}.ts`)
```typescript
import { z } from 'zod'

export const contactSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name:  z.string().optional(),
  email:      z.string().email('Invalid email'),
  phone:      z.string().optional(),
  company:    z.string().optional(),
  lead_source: z.enum(['website', 'referral', 'cold_outreach', 'event', 'other']).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>
```

### Server actions (`src/lib/actions/{module}.ts`)
```typescript
'use server'
import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { contactSchema } from '@/lib/validations/contact'

export async function createContact(input: unknown) {
  const user = await getAuthUser()                          // 1. Auth
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = contactSchema.safeParse(input)            // 2. Validate
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [row] = await queryForOrg(                         // 3. Query
    user.orgId, user.id,
    `INSERT INTO contacts (...) VALUES (...) RETURNING *`,
    [...]
  )

  revalidatePath('/contacts')                              // 4. Revalidate
  return { data: row }
}
```

---

## Rules

- `getAuthUser()` is always line 1 — no exceptions
- Zod parse always before `queryForOrg()` — no exceptions
- Use `queryForOrg()` from `@/lib/db` — never Supabase SDK
- Return `{ data }` or `{ error }` — never throw to client
- `org_id` and `owner_id` always come from `getAuthUser()` — never from client input
- Soft delete: `UPDATE SET deleted_at = now()` — never `DELETE FROM`
- Never create UI — that is the UI Builder's job
