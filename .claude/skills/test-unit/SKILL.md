# Skill: test-unit

Pattern for ALL Vitest unit tests. Co-locate in `__tests__/` next to the module.
Mock the DB layer — never hit a real database in unit tests.

## Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactSchema } from '@/lib/validations/contact'
import { createContact, deleteContact } from '@/lib/actions/contacts'

// Mock the DB abstraction layer
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

const mockUser = { id: 'user-1', orgId: 'org-1', role: 'admin' }
const mockContact = {
  id: 'contact-1', org_id: 'org-1', first_name: 'Priya',
  last_name: 'Sharma', email: 'priya@example.com',
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

  it('propagates DB errors gracefully', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(queryForOrg).mockRejectedValue(new Error('DB connection failed'))
    await expect(createContact({ first_name: 'Priya', email: 'p@x.com' }))
      .rejects.toThrow()
  })
})

describe('deleteContact action', () => {
  it('soft deletes — does not hard delete', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockUser)
    vi.mocked(queryForOrg).mockResolvedValue([])
    await deleteContact('contact-1')
    const call = vi.mocked(queryForOrg).mock.calls[0]
    expect(call[2]).toMatch(/deleted_at/)       // SQL must set deleted_at
    expect(call[2]).not.toMatch(/DELETE FROM/)  // must NOT hard delete
  })
})
```

## Rules

- Mock `@/lib/db` and `@/lib/auth` — never hit real DB or real auth in unit tests
- Minimum 5 test cases per module: schema valid, schema invalid, auth guard, success path, error path
- Test soft-delete asserts SQL contains `deleted_at`, not `DELETE FROM`
- Run with `npx vitest run` — all must pass before committing
- Coverage gate: 80% lines + functions enforced in CI
