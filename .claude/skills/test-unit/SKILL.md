# Skill: test-unit

Pattern for ALL Vitest unit tests. Co-locate in `__tests__/` next to the module.
Mock the DB layer — never hit a real database in unit tests.

## Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactSchema } from '@/lib/validations/contact'
import { createContact, deleteContact } from '@/lib/actions/contacts'

// Mock the DB abstraction layer — ALL three exports
vi.mock('@/lib/db', () => ({
  queryForOrg: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── Mock constants ──────────────────────────────────────────────────
// IMPORTANT: Use valid UUIDs for any field validated with z.string().uuid()
const ORG_ID     = '00000000-0000-4000-8000-000000000001'
const USER_ID    = '00000000-0000-4000-8000-000000000002'
const CONTACT_ID = '00000000-0000-4000-8000-000000000003'

// IMPORTANT: mockUser must include email — getAuthUser() returns { id, email, orgId, role }
const mockUser = {
  id:    USER_ID,
  email: 'admin@test.com',
  orgId: ORG_ID,
  role:  'admin' as const,
}

const mockContact = {
  id: CONTACT_ID, org_id: ORG_ID,
  first_name: 'Priya', last_name: 'Sharma', email: 'priya@example.com',
}

describe('Contact validation', () => {
  it('accepts a valid contact', () => {
    const result = contactSchema.safeParse({
      first_name: 'Priya', last_name: 'Sharma', email: 'priya@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = contactSchema.safeParse({ first_name: 'Priya' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejects invalid email format', () => {
    const result = contactSchema.safeParse({ first_name: 'Priya', email: 'not-an-email' })
    expect(result.success).toBe(false)
  })
})

describe('createContact action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await createContact({ first_name: 'Priya', email: 'p@x.com' })
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns validation error for invalid input', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    const result = await createContact({ first_name: 'Priya' }) // missing email
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('inserts contact and returns data on success', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(queryForOrg).mockResolvedValue([mockContact])
    const result = await createContact({
      first_name: 'Priya', last_name: 'Sharma', email: 'priya@example.com',
    })
    expect(result.data).toEqual(mockContact)
    expect(queryForOrg).toHaveBeenCalledOnce()
  })
})

describe('deleteContact action', () => {
  it('soft deletes — does not hard delete', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(queryForOrg).mockResolvedValue([{ id: CONTACT_ID }])
    await deleteContact(CONTACT_ID)
    const sql = vi.mocked(queryForOrg).mock.calls.find(c => String(c[2]).includes('UPDATE'))![2]
    expect(String(sql)).toMatch(/deleted_at/)
    expect(String(sql)).not.toMatch(/DELETE FROM/)
  })
})
```

## UUID requirement

If a Zod schema uses `z.string().uuid()` (e.g. `pipeline_id`, `stage_id`, `contact_id`), test IDs **must** be valid v4-format UUIDs. Non-UUID strings like `'contact-1'` or `'org-1'` will fail schema validation and trigger the wrong error path.

Always define UUID constants at the top of the test file:
```typescript
const ORG_ID  = '00000000-0000-4000-8000-000000000001'
const USER_ID = '00000000-0000-4000-8000-000000000002'
// etc — increment the last segment per constant
```

## mockUser shape

`getAuthUser()` returns `{ id, email, orgId, role }`. The mock must include **all four fields**:
```typescript
const mockUser = {
  id:    USER_ID,
  email: 'admin@test.com',
  orgId: ORG_ID,
  role:  'admin' as const,   // ← 'as const' required for "admin" | "member" | "viewer" type
}
```

## Multiple sequential DB calls

When an action makes N calls to `queryForOrg`, chain `mockResolvedValueOnce` exactly N times in order:
```typescript
vi.mocked(queryForOrg)
  .mockResolvedValueOnce([existingRecord])   // call 1: SELECT
  .mockResolvedValueOnce([{ id: NEW_ID }])   // call 2: INSERT
  .mockResolvedValueOnce(stages)             // call 3: SELECT stages
```

## Rules

- Mock `@/lib/db` (queryForOrg + query + transaction) and `@/lib/auth` — never hit real DB
- Minimum 5 test cases per module: schema valid, schema invalid, auth guard, success path, error path
- Test soft-delete asserts SQL contains `deleted_at`, not `DELETE FROM`
- IDs must be valid UUIDs whenever the schema uses `z.string().uuid()`
- `mockUser` must include `email` field and `role: '...' as const`
- Run with `npx vitest run` — all must pass before committing
- Coverage gate: 80% lines + functions enforced in CI
