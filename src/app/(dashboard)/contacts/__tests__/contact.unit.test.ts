import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (must be hoisted before any imports that use them) ────────
vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}))

import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import Papa from 'papaparse'

import {
  contactSchema,
  contactSearchSchema,
} from '@/lib/validations/contact'
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContactsCSV,
} from '@/lib/actions/contacts'

// ── Fixtures ────────────────────────────────────────────────────────

const mockAdminUser = { id: 'user-1', orgId: 'org-1', role: 'admin' as const, email: 'admin@test.com' }
const mockMemberUser = { id: 'user-2', orgId: 'org-1', role: 'member' as const, email: 'member@test.com' }
const mockViewerUser = { id: 'user-3', orgId: 'org-1', role: 'viewer' as const, email: 'viewer@test.com' }

const mockContact = {
  id: 'contact-1',
  org_id: 'org-1',
  first_name: 'Priya',
  last_name: 'Sharma',
  email: 'priya@example.com',
  phone: null,
  company: 'Acme',
  job_title: null,
  lead_source: null,
  owner_id: null,
  tags: [],
  custom_fields: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockContactWithOwner = {
  ...mockContact,
  owner_name: null,
  owner_email: null,
  last_activity_at: null,
}

// ── contactSchema ────────────────────────────────────────────────────

describe('contactSchema', () => {
  // AC-06: Given create form, when first_name empty, then validation error
  it('rejects empty first_name', () => {
    const result = contactSchema.safeParse({ first_name: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('first_name')
  })

  // AC-06: Given create form, when email malformed, then validation error
  it('rejects malformed email', () => {
    const result = contactSchema.safeParse({ first_name: 'Jane', email: 'notanemail' })
    expect(result.success).toBe(false)
    const emailErr = result.error?.issues.find((i) => i.path.includes('email'))
    expect(emailErr).toBeDefined()
  })

  // BR-07: lead_source must be allowed enum value
  it('rejects unknown lead_source value', () => {
    const result = contactSchema.safeParse({ first_name: 'Jane', lead_source: 'instagram' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('lead_source')
  })

  // AC-04: email is optional — schema accepts contact without email
  it('accepts a contact without email', () => {
    const result = contactSchema.safeParse({ first_name: 'Jane' })
    expect(result.success).toBe(true)
  })

  // AC-04: valid contact with all fields parses successfully
  it('accepts a valid contact with all fields', () => {
    const result = contactSchema.safeParse({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@acme.com',
      phone: '+91 98765 43210',
      company: 'Acme Corp',
      job_title: 'CTO',
      lead_source: 'referral',
      owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      tags: ['vip', 'q4'],
    })
    expect(result.success).toBe(true)
  })
})

// ── contactSearchSchema ──────────────────────────────────────────────

describe('contactSearchSchema', () => {
  // AC-01: page param coerced from string to number
  it('coerces page string to number', () => {
    const result = contactSearchSchema.safeParse({ page: '3' })
    expect(result.success).toBe(true)
    expect(result.data?.page).toBe(3)
  })

  it('defaults page to 1 and per_page to 50 when omitted', () => {
    const result = contactSearchSchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data?.page).toBe(1)
    expect(result.data?.per_page).toBe(50)
  })

  it('rejects unknown lead_source in search params', () => {
    const result = contactSearchSchema.safeParse({ lead_source: 'twitter' })
    expect(result.success).toBe(false)
  })
})

// ── getContacts ──────────────────────────────────────────────────────

describe('getContacts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Unauthorized when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await getContacts({})
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // BR-03: soft-deleted contacts excluded from list queries
  it('SQL excludes soft-deleted contacts (deleted_at IS NULL)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '0' }]) // count query
      .mockResolvedValueOnce([])               // data query

    await getContacts({})

    const [countCall, dataCall] = vi.mocked(queryForOrg).mock.calls
    expect(countCall[2]).toContain('deleted_at IS NULL')
    expect(dataCall[2]).toContain('deleted_at IS NULL')
  })

  // AC-01: list returns paginated results
  it('returns paginated results with correct pageCount', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '120' }])
      .mockResolvedValueOnce([mockContactWithOwner, mockContactWithOwner])

    const result = await getContacts({ per_page: '50' })

    expect(result.data?.total).toBe(120)
    expect(result.data?.pageCount).toBe(3) // ceil(120/50)
    expect(result.data?.contacts).toHaveLength(2)
  })

  // BR-10: pagination uses LIMIT/OFFSET
  it('passes per_page and offset to SQL', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '5' }])
      .mockResolvedValueOnce([])

    await getContacts({ page: '2', per_page: '10' })

    const dataCallParams = vi.mocked(queryForOrg).mock.calls[1][3]
    // params: [...filterParams, per_page=10, offset=10]
    expect(dataCallParams).toContain(10)  // per_page
    expect(dataCallParams).toContain(10)  // offset = (2-1)*10
  })
})

// ── createContact ────────────────────────────────────────────────────

describe('createContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Unauthorized when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await createContact({ first_name: 'Jane', email: 'j@x.com' })
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns error when viewer tries to create', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const result = await createContact({ first_name: 'Jane' })
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-06: invalid input returns validation error without hitting DB
  it('returns validation error for invalid input without DB call', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const result = await createContact({ first_name: '' }) // fails min(1)
    expect(result.error).toBeDefined()
    expect('fieldErrors' in result.error!).toBe(true)
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-04: happy path — inserts and returns contact
  it('creates contact and returns data on success (pro plan)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro' }])   // org plan check
      .mockResolvedValueOnce([mockContact])         // INSERT

    const result = await createContact({ first_name: 'Priya', email: 'priya@example.com' })
    expect(result.data).toEqual(mockContact)
  })

  // AC-05: duplicate email returns named error
  it('returns duplicate email error on unique constraint violation', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro' }])
      .mockRejectedValueOnce({ code: '23505' }) // pg unique violation

    const result = await createContact({ first_name: 'Priya', email: 'priya@example.com' })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('already exists')
  })

  // AC-17 / BR-04: free plan contact limit
  it('returns plan limit error when org has 500 contacts on free plan', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'free' }])  // org plan
      .mockResolvedValueOnce([{ count: '500' }])  // contact count

    const result = await createContact({ first_name: 'Priya', email: 'priya@example.com' })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('limit reached')
    // INSERT should not have been called
    expect(vi.mocked(queryForOrg).mock.calls).toHaveLength(2)
  })

  // BR-05: owner must be in same org
  it('rejects owner_id not belonging to the same org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([]) // owner not found in org

    const result = await createContact({
      first_name: 'Priya',
      owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('organisation')
  })
})

// ── updateContact ────────────────────────────────────────────────────

describe('updateContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Unauthorized when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await updateContact('contact-1', { first_name: 'Jane' })
    expect(result.error).toBeDefined()
  })

  it('returns error when viewer tries to update', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const result = await updateContact('contact-1', { first_name: 'Jane' })
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-09: contact not found (deleted or wrong id)
  it('returns not-found error for a soft-deleted or missing contact', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([]) // contact not found

    const result = await updateContact('contact-1', { first_name: 'Jane' })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('not found')
  })

  // AC-09: happy path — updates and returns contact
  it('updates contact and returns updated data', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const updated = { ...mockContact, company: 'NewCo' }
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: 'contact-1' }]) // existing check
      .mockResolvedValueOnce([updated])               // UPDATE

    const result = await updateContact('contact-1', {
      first_name: 'Priya',
      email: 'priya@example.com',
      company: 'NewCo',
    })
    expect(result.data).toEqual(updated)
  })

  // AC-05 (edit): duplicate email on update returns error
  it('returns duplicate email error on update unique constraint violation', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: 'contact-1' }])
      .mockRejectedValueOnce({ code: '23505' })

    const result = await updateContact('contact-1', { first_name: 'Jane', email: 'taken@example.com' })
    expect((result.error as { message: string }).message).toContain('already exists')
  })
})

// ── deleteContact ────────────────────────────────────────────────────

describe('deleteContact', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns Unauthorized when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await deleteContact('contact-1')
    expect(result.error).toBeDefined()
  })

  it('returns error when viewer tries to delete', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const result = await deleteContact('contact-1')
    expect(result.error).toBeDefined()
  })

  // AC-10: delete returns not-found for missing contact
  it('returns not-found error for a missing contact', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([]) // not found

    const result = await deleteContact('contact-1')
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('not found')
  })

  // BR-02: soft delete sets deleted_at, never issues DELETE FROM
  it('soft-deletes by setting deleted_at — never hard deletes', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: 'contact-1' }]) // exists check
      .mockResolvedValueOnce([])                     // UPDATE

    const result = await deleteContact('contact-1')
    expect(result.success).toBe(true)

    const calls = vi.mocked(queryForOrg).mock.calls
    const updateSql = calls[1][2] as string
    expect(updateSql).toContain('deleted_at')
    expect(updateSql).not.toMatch(/DELETE FROM/i)
  })

  // BR-03: verify the existence check filters soft-deleted (deleted_at IS NULL)
  it('existence check excludes already-deleted contacts', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])

    await deleteContact('contact-1')

    const existsCheckSql = vi.mocked(queryForOrg).mock.calls[0][2] as string
    expect(existsCheckSql).toContain('deleted_at IS NULL')
  })
})

// ── importContactsCSV ────────────────────────────────────────────────

describe('importContactsCSV', () => {
  beforeEach(() => vi.clearAllMocks())

  function makeCsvFormData(csvText: string) {
    const file = {
      text: vi.fn().mockResolvedValue(csvText),
    } as unknown as File
    const fd = {
      get: vi.fn().mockReturnValue(file),
    } as unknown as FormData
    return fd
  }

  // AC-13: valid CSV imports successfully
  it('imports valid rows and returns imported count', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(Papa.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { first_name: 'Jane', email: 'jane@test.com' },
        { first_name: 'John', email: 'john@test.com' },
      ],
      errors: [],
    })
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro' }])
      .mockResolvedValueOnce([{ id: 'c1' }])  // row 1 inserted
      .mockResolvedValueOnce([{ id: 'c2' }])  // row 2 inserted

    const result = await importContactsCSV(makeCsvFormData('first_name,email\nJane,jane@test.com'))
    expect(result.data?.imported).toBe(2)
    expect(result.data?.skipped).toBe(0)
  })

  // AC-14: CSV with invalid rows returns error list
  it('returns error list for rows missing first_name', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(Papa.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { first_name: '', email: 'bad@test.com' },  // fails min(1)
      ],
      errors: [],
    })
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro' }])

    const result = await importContactsCSV(makeCsvFormData('first_name,email\n,bad@test.com'))
    expect(result.data?.errors.length).toBeGreaterThan(0)
    expect(result.data?.imported).toBe(0)
  })

  // BR-01: ON CONFLICT DO NOTHING — duplicate email rows skipped
  it('skips rows with duplicate email (ON CONFLICT DO NOTHING)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(Papa.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ first_name: 'Jane', email: 'dup@test.com' }],
      errors: [],
    })
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro' }])
      .mockResolvedValueOnce([])  // ON CONFLICT DO NOTHING returns empty

    const result = await importContactsCSV(makeCsvFormData('first_name,email\nJane,dup@test.com'))
    expect(result.data?.skipped).toBe(1)
    expect(result.data?.imported).toBe(0)
  })

  // BR-04: free plan truncates import at remaining capacity
  it('truncates import when free plan remaining capacity is less than valid rows', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(Papa.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { first_name: 'A', email: 'a@test.com' },
        { first_name: 'B', email: 'b@test.com' },
        { first_name: 'C', email: 'c@test.com' },
      ],
      errors: [],
    })
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'free' }])   // org plan
      .mockResolvedValueOnce([{ count: '499' }])   // 499 existing → 1 slot left
      .mockResolvedValueOnce([{ id: 'x' }])         // only 1 insert happens

    const result = await importContactsCSV(makeCsvFormData('first_name,email\nA,a@test.com'))
    expect(result.data?.imported).toBe(1) // only 1 of 3 valid rows imported
    // The truncation note should appear in errors
    expect(result.data?.errors.some((e) => e.message.includes('Free plan limit'))).toBe(true)
  })

  // AC-13: missing required headers returns error
  it('returns error when CSV is missing required headers', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(Papa.parse as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ name: 'Jane' }], // missing first_name and email headers
      errors: [],
    })

    const result = await importContactsCSV(makeCsvFormData('name\nJane'))
    expect(result.error).toBeDefined()
    expect(result.error?.message).toContain('required columns')
  })

  it('returns Unauthorized when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await importContactsCSV(makeCsvFormData(''))
    expect(result.error).toBeDefined()
  })

  it('returns error when viewer tries to import', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const result = await importContactsCSV(makeCsvFormData(''))
    expect(result.error).toBeDefined()
  })
})
