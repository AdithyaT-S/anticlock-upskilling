import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loginSchema, signupSchema } from '@/lib/validations/auth'

// ── Mocks ────────────────────────────────────────────────────────
vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('bcryptjs', () => ({
  default: {
    hash:    vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn(),
  },
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

import { query, transaction } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth/next'
import { signUp } from '@/lib/actions/auth'
import { getAuthUser } from '@/lib/auth'

// ── loginSchema ──────────────────────────────────────────────────
describe('loginSchema', () => {
  it('accepts valid email + password ≥8 chars', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'password1' })
    expect(r.success).toBe(true)
  })

  it('rejects missing email', () => {
    const r = loginSchema.safeParse({ password: 'password1' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('email')
  })

  it('rejects invalid email format', () => {
    const r = loginSchema.safeParse({ email: 'not-an-email', password: 'password1' })
    expect(r.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const r = loginSchema.safeParse({ email: 'user@example.com', password: 'short' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('password')
  })
})

// ── signupSchema ─────────────────────────────────────────────────
describe('signupSchema', () => {
  const valid = {
    full_name: 'Jane Smith',
    org_name:  'Acme Corp',
    email:     'jane@acme.com',
    password:  'securepass',
  }

  it('accepts all valid fields', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects missing full_name', () => {
    const r = signupSchema.safeParse({ ...valid, full_name: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('full_name')
  })

  it('rejects missing org_name', () => {
    const r = signupSchema.safeParse({ ...valid, org_name: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('org_name')
  })

  it('rejects password longer than 72 chars (BR-05)', () => {
    const r = signupSchema.safeParse({ ...valid, password: 'a'.repeat(73) })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].path).toContain('password')
  })
})

// ── signUp action ────────────────────────────────────────────────
describe('signUp action', () => {
  const validInput = {
    full_name: 'Jane Smith',
    org_name:  'Acme Corp',
    email:     'jane@acme.com',
    password:  'securepass',
  }

  beforeEach(() => vi.clearAllMocks())

  it('returns error when email already exists (AC-02)', async () => {
    vi.mocked(query).mockResolvedValueOnce([{ id: 'existing' }])
    const r = await signUp(validInput)
    expect(r.error).toBeDefined()
    expect((r.error as Record<string, string[]>).email?.[0]).toMatch(/already exists/)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('uses a transaction for org + user inserts (BR-01)', async () => {
    vi.mocked(query).mockResolvedValueOnce([])
    vi.mocked(transaction).mockResolvedValueOnce(undefined)
    await signUp(validInput)
    expect(transaction).toHaveBeenCalledOnce()
  })

  it('hashes password with bcryptjs at cost 12 before insert (BR-06)', async () => {
    vi.mocked(query).mockResolvedValueOnce([])
    vi.mocked(transaction).mockResolvedValueOnce(undefined)
    await signUp(validInput)
    expect(vi.mocked(bcrypt.hash)).toHaveBeenCalledWith('securepass', 12)
  })

  it('sets role=admin server-side regardless of input (BR-02)', async () => {
    vi.mocked(query).mockResolvedValueOnce([])
    let insertSql = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(transaction).mockImplementationOnce(async (fn: any) => {
      await fn(async (sql: string) => {
        insertSql += sql
        return [{ id: 'org-1' }]
      })
    })
    await signUp(validInput)
    expect(insertSql).toMatch(/'admin'/)
  })

  it('returns { success: true } on valid new signup (AC-01)', async () => {
    vi.mocked(query).mockResolvedValueOnce([])
    vi.mocked(transaction).mockResolvedValueOnce(undefined)
    const r = await signUp(validInput)
    expect(r).toEqual({ success: true })
  })

  it('returns _form error when transaction fails (BR-01 rollback)', async () => {
    vi.mocked(query).mockResolvedValueOnce([])
    vi.mocked(transaction).mockRejectedValueOnce(new Error('DB error'))
    const r = await signUp(validInput)
    expect(r.error).toBeDefined()
    expect((r.error as Record<string, string[]>)._form).toBeDefined()
  })

  it('returns validation error without hitting DB for invalid input', async () => {
    const r = await signUp({ email: 'bad' })
    expect(r.error).toBeDefined()
    expect(query).not.toHaveBeenCalled()
  })
})

// ── getAuthUser ──────────────────────────────────────────────────
describe('getAuthUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns user object when session exists (AC-09)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'u1', email: 'jane@acme.com', orgId: 'org-1', role: 'admin' },
    })
    const user = await getAuthUser()
    expect(user).toEqual({ id: 'u1', email: 'jane@acme.com', orgId: 'org-1', role: 'admin' })
  })

  it('returns null when no session (AC-06)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)
    expect(await getAuthUser()).toBeNull()
  })
})
