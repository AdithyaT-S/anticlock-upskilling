import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  leadSchema,
  leadUpdateSchema,
  leadSearchSchema,
} from '@/lib/validations/lead'
import {
  getLeads,
  createLead,
  updateLead,
  updateLeadStatus,
  deleteLead,
  convertLeadToDeal,
} from '@/lib/actions/leads'

vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// RFC 4122 v4 UUIDs — Zod's uuid() validator enforces version bits
const CONTACT_UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
const OWNER_UUID   = '550e8400-e29b-41d4-a716-446655440000'
const LEAD_UUID    = '6ba7b810-9dad-41d1-80b4-00c04fd430c8'

const mockAdminUser  = { id: 'user-1', email: 'admin@org.com', orgId: 'org-1', role: 'admin' } as const
const mockViewerUser = { id: 'user-2', email: 'viewer@org.com', orgId: 'org-1', role: 'viewer' } as const

const mockLeadRow = {
  id: LEAD_UUID, org_id: 'org-1', contact_id: CONTACT_UUID,
  status: 'new', score: 50, source: null, owner_id: null, notes: null,
  converted_at: null, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
  contact_first_name: 'Priya', contact_last_name: 'Sharma', contact_company: 'Acme',
  contact_email: 'priya@example.com', contact_phone: null,
  owner_name: null, owner_email: null, owner_avatar_url: null, last_activity_at: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── leadSchema ───────────────────────────────────────────────────────────────

describe('leadSchema', () => {
  it('accepts a valid create input', () => {
    const r = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: 50 })
    expect(r.success).toBe(true)
  })

  it('accepts optional source, owner_id, and notes', () => {
    const r = leadSchema.safeParse({
      contact_id: CONTACT_UUID, status: 'qualified', score: 75,
      source: 'referral', owner_id: OWNER_UUID, notes: 'Hot lead',
    })
    expect(r.success).toBe(true)
  })

  // AC-10
  it('rejects missing contact_id', () => {
    const r = leadSchema.safeParse({ status: 'new', score: 0 })
    expect(r.success).toBe(false)
    expect(r.error?.issues.map((i) => i.path[0])).toContain('contact_id')
  })

  it('rejects invalid contact_id (not a uuid)', () => {
    const r = leadSchema.safeParse({ contact_id: 'not-a-uuid', status: 'new', score: 0 })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0].message).toBe('Contact is required')
  })

  // AC-11, BR-03
  it('rejects score above 100', () => {
    const r = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: 101 })
    expect(r.success).toBe(false)
    const msg = r.error?.issues.find((i) => i.path[0] === 'score')?.message
    expect(msg).toBe('Score must be between 0 and 100')
  })

  it('rejects score below 0', () => {
    const r = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: -1 })
    expect(r.success).toBe(false)
    const msg = r.error?.issues.find((i) => i.path[0] === 'score')?.message
    expect(msg).toBe('Score must be between 0 and 100')
  })

  // BR-03: integer only
  it('rejects non-integer score', () => {
    const r = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: 50.5 })
    expect(r.success).toBe(false)
    const msg = r.error?.issues.find((i) => i.path[0] === 'score')?.message
    expect(msg).toBe('Score must be a whole number')
  })

  it('accepts boundary scores 0 and 100', () => {
    const lo = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: 0 })
    const hi = leadSchema.safeParse({ contact_id: CONTACT_UUID, status: 'new', score: 100 })
    expect(lo.success).toBe(true)
    expect(hi.success).toBe(true)
  })
})

// ── leadUpdateSchema ─────────────────────────────────────────────────────────

describe('leadUpdateSchema', () => {
  it('accepts valid update input without contact_id', () => {
    const r = leadUpdateSchema.safeParse({ status: 'qualified', score: 80 })
    expect(r.success).toBe(true)
  })

  // BR-01: contact_id is not present in update schema
  it('contact_id is stripped from update output (immutable field)', () => {
    const r = leadUpdateSchema.safeParse({ status: 'new', score: 0 })
    expect(r.success).toBe(true)
    if (r.success) expect((r.data as Record<string, unknown>).contact_id).toBeUndefined()
  })
})

// ── leadSearchSchema ─────────────────────────────────────────────────────────

describe('leadSearchSchema', () => {
  // BR-09: page/per_page coerced from URL string params
  it('coerces string page and per_page to numbers', () => {
    const r = leadSearchSchema.safeParse({ page: '2', per_page: '25' })
    expect(r.success).toBe(true)
    expect(r.data?.page).toBe(2)
    expect(r.data?.per_page).toBe(25)
  })

  it('defaults page to 1 and per_page to 50', () => {
    const r = leadSearchSchema.safeParse({})
    expect(r.success).toBe(true)
    expect(r.data?.page).toBe(1)
    expect(r.data?.per_page).toBe(50)
  })

  it('rejects per_page above 100', () => {
    expect(leadSearchSchema.safeParse({ per_page: '101' }).success).toBe(false)
  })
})

// ── getLeads ─────────────────────────────────────────────────────────────────

describe('getLeads', () => {
  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await getLeads({})
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-02
  it('adds status condition to SQL when status filter provided', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
    await getLeads({ status: 'qualified' })
    const countSql = vi.mocked(queryForOrg).mock.calls[0][2] as string
    expect(countSql).toMatch(/l\.status\s*=/)
  })

  // AC-03
  it('adds owner_id condition to SQL when owner filter provided', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
    await getLeads({ owner_id: OWNER_UUID })
    const countSql = vi.mocked(queryForOrg).mock.calls[0][2] as string
    expect(countSql).toMatch(/l\.owner_id\s*=/)
  })

  it('returns paginated data with correct total and pageCount', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ count: '3' }])
      .mockResolvedValueOnce([mockLeadRow, mockLeadRow, mockLeadRow])
    const r = await getLeads({})
    expect(r.data?.total).toBe(3)
    expect(r.data?.leads).toHaveLength(3)
    expect(r.data?.pageCount).toBe(1)
  })
})

// ── createLead ───────────────────────────────────────────────────────────────

describe('createLead', () => {
  const validInput = { contact_id: CONTACT_UUID, status: 'new', score: 50 }

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await createLead(validInput)
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns 403 error for viewer role', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const r = await createLead(validInput)
    expect((r.error as { message: string }).message).toMatch(/permission/i)
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-10
  it('returns validation error when contact_id is missing', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const r = await createLead({ status: 'new', score: 0 })
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-11
  it('returns validation error when score is out of range', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const r = await createLead({ contact_id: CONTACT_UUID, status: 'new', score: 150 })
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // BR-01: contact must exist in org
  it('returns error when contact does not exist in org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([]) // contact lookup → empty
    const r = await createLead(validInput)
    expect((r.error as { message: string }).message).toMatch(/contact does not exist/i)
  })

  // BR-06: owner must be in same org
  it('returns error when owner is not in the org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: CONTACT_UUID }]) // contact found
      .mockResolvedValueOnce([])                     // owner not found
    const r = await createLead({ ...validInput, owner_id: OWNER_UUID })
    expect((r.error as { message: string }).message).toMatch(/owner is not a member/i)
  })

  // AC-12, BR-02
  it('returns error when contact already has an active lead', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: CONTACT_UUID }]) // contact found
      .mockResolvedValueOnce([{ id: LEAD_UUID }])    // duplicate active lead found
    const r = await createLead(validInput)
    expect((r.error as { message: string }).message).toBe('This contact already has an active lead')
  })

  // AC-09
  it('creates lead and returns new id on success', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: CONTACT_UUID }]) // contact found
      .mockResolvedValueOnce([])                     // no duplicate
      .mockResolvedValueOnce([{ id: LEAD_UUID }])    // INSERT
    const r = await createLead(validInput)
    expect(r.data?.id).toBe(LEAD_UUID)
  })
})

// ── updateLead ───────────────────────────────────────────────────────────────

describe('updateLead', () => {
  const validUpdate = { status: 'qualified', score: 80 }

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await updateLead(LEAD_UUID, validUpdate)
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns error for viewer role', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const r = await updateLead(LEAD_UUID, validUpdate)
    expect((r.error as { message: string }).message).toMatch(/permission/i)
  })

  it('returns validation error for invalid score', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const r = await updateLead(LEAD_UUID, { status: 'new', score: 999 })
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns error when lead not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])
    const r = await updateLead(LEAD_UUID, validUpdate)
    expect((r.error as { message: string }).message).toBe('Lead not found')
  })

  // BR-04, AC-06
  it('returns error when lead is already converted', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([
      { id: LEAD_UUID, converted_at: '2024-02-01T00:00:00Z' },
    ])
    const r = await updateLead(LEAD_UUID, validUpdate)
    expect((r.error as { message: string }).message).toMatch(/converted and cannot be edited/i)
  })

  it('updates lead and returns success', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: LEAD_UUID, converted_at: null }])
      .mockResolvedValueOnce([]) // UPDATE
    const r = await updateLead(LEAD_UUID, validUpdate)
    expect(r).toMatchObject({ success: true })
  })
})

// ── updateLeadStatus ─────────────────────────────────────────────────────────

describe('updateLeadStatus', () => {
  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await updateLeadStatus(LEAD_UUID, { status: 'contacted' })
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-05: only status column is updated
  it('issues an UPDATE that sets only the status column', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: LEAD_UUID, converted_at: null }])
      .mockResolvedValueOnce([])
    await updateLeadStatus(LEAD_UUID, { status: 'contacted' })
    const updateSql = vi.mocked(queryForOrg).mock.calls[1][2] as string
    expect(updateSql).toMatch(/SET status=/)
    expect(updateSql).not.toMatch(/score/)
    expect(updateSql).not.toMatch(/notes/)
  })

  // BR-04
  it('returns error when lead is converted', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([
      { id: LEAD_UUID, converted_at: '2024-02-01T00:00:00Z' },
    ])
    const r = await updateLeadStatus(LEAD_UUID, { status: 'qualified' })
    expect((r.error as { message: string }).message).toMatch(/converted/i)
  })
})

// ── deleteLead ───────────────────────────────────────────────────────────────

describe('deleteLead', () => {
  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await deleteLead(LEAD_UUID)
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns error for viewer role', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const r = await deleteLead(LEAD_UUID)
    expect((r.error as { message: string }).message).toMatch(/permission/i)
  })

  it('returns error when lead not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])
    const r = await deleteLead(LEAD_UUID)
    expect((r.error as { message: string }).message).toBe('Lead not found')
  })

  // BR-05: hard delete — no deleted_at
  it('issues DELETE FROM (hard delete, not soft)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: LEAD_UUID }])
      .mockResolvedValueOnce([])
    await deleteLead(LEAD_UUID)
    const sql = vi.mocked(queryForOrg).mock.calls[1][2] as string
    expect(sql).toMatch(/DELETE FROM leads/)
    expect(sql).not.toMatch(/deleted_at/)
  })

  it('returns success after hard deletion', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: LEAD_UUID }])
      .mockResolvedValueOnce([])
    const r = await deleteLead(LEAD_UUID)
    expect(r).toMatchObject({ success: true })
  })
})

// ── convertLeadToDeal ────────────────────────────────────────────────────────

describe('convertLeadToDeal', () => {
  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const r = await convertLeadToDeal(LEAD_UUID)
    expect(r.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns error for viewer role', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockViewerUser)
    const r = await convertLeadToDeal(LEAD_UUID)
    expect((r.error as { message: string }).message).toMatch(/permission/i)
  })

  it('returns error when lead not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])
    const r = await convertLeadToDeal(LEAD_UUID)
    expect((r.error as { message: string }).message).toBe('Lead not found')
  })

  // AC-06, BR-04
  it('returns error when lead is already converted', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([{
      id: LEAD_UUID, contact_id: CONTACT_UUID,
      source: 'referral', converted_at: '2024-02-01T00:00:00Z',
    }])
    const r = await convertLeadToDeal(LEAD_UUID)
    expect((r.error as { message: string }).message).toMatch(/already been converted/i)
  })

  // AC-07, BR-07
  it('stamps converted_at and returns contactId + source', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{
        id: LEAD_UUID, contact_id: CONTACT_UUID,
        source: 'referral', converted_at: null,
      }])
      .mockResolvedValueOnce([])
    const r = await convertLeadToDeal(LEAD_UUID)
    expect(r.data?.contactId).toBe(CONTACT_UUID)
    expect(r.data?.source).toBe('referral')
  })

  // BR-07: UPDATE must set converted_at
  it('UPDATE SQL sets converted_at = now()', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{
        id: LEAD_UUID, contact_id: CONTACT_UUID,
        source: null, converted_at: null,
      }])
      .mockResolvedValueOnce([])
    await convertLeadToDeal(LEAD_UUID)
    const sql = vi.mocked(queryForOrg).mock.calls[1][2] as string
    expect(sql).toMatch(/converted_at\s*=\s*now\(\)/)
  })
})
