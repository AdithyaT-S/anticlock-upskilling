import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  dealSchema,
  moveStageSchema,
  closeDealSchema,
  pipelineSchema,
} from '@/lib/validations/deal'
import {
  createDeal,
  updateDeal,
  moveDealStage,
  closeDeal,
  deleteDeal,
  getDealsForPipeline,
  getDeal,
  getContactOptions,
  getOrgMembers,
} from '@/lib/actions/deals'
import { getPipelines, getPipelineWithStages, ensureDefaultPipeline } from '@/lib/actions/pipelines'

vi.mock('@/lib/db', () => ({
  queryForOrg: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Valid UUIDs — schema requires z.string().uuid() on all ID fields
const ORG_ID      = '00000000-0000-4000-8000-000000000001'
const USER_ID     = '00000000-0000-4000-8000-000000000002'
const USER_2_ID   = '00000000-0000-4000-8000-000000000003'
const PIPELINE_ID = '00000000-0000-4000-8000-000000000004'
const PIPELINE_2  = '00000000-0000-4000-8000-000000000005'
const STAGE_ID    = '00000000-0000-4000-8000-000000000006'
const STAGE_2_ID  = '00000000-0000-4000-8000-000000000007'
const DEAL_ID     = '00000000-0000-4000-8000-000000000008'
const CONTACT_ID  = '00000000-0000-4000-8000-000000000009'

const mockAdminUser  = { id: USER_ID,   email: 'admin@test.com',  orgId: ORG_ID, role: 'admin'  as const }
const mockMemberUser = { id: USER_2_ID, email: 'member@test.com', orgId: ORG_ID, role: 'member' as const }

const mockPipeline = {
  id: PIPELINE_ID, org_id: ORG_ID, name: 'Sales Pipeline',
  is_default: true, created_at: '2026-06-01T00:00:00Z',
}

const mockStage = {
  id: STAGE_ID, pipeline_id: PIPELINE_ID, name: 'New',
  position: 0, probability: 10, created_at: '2026-06-01T00:00:00Z',
}

const mockDeal = {
  id: DEAL_ID, org_id: ORG_ID, name: 'Enterprise Deal',
  pipeline_id: PIPELINE_ID, stage_id: STAGE_ID,
  stage_name: 'New', stage_position: 0,
  value: 50000, currency: 'INR', close_date: '2026-12-31',
  status: 'open', lost_reason: null,
  contact_id: CONTACT_ID, contact_first_name: 'John',
  contact_last_name: 'Doe', contact_company: 'Acme Corp',
  owner_id: USER_ID, owner_name: 'Admin User', owner_avatar_url: null,
  created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-01T00:00:00Z',
}

const VALID_DEAL_INPUT = {
  name:        'Enterprise Deal',
  pipeline_id: PIPELINE_ID,
  stage_id:    STAGE_ID,
  value:       50000,
  currency:    'INR',
  close_date:  '2026-12-31',
  contact_id:  CONTACT_ID,
  owner_id:    USER_ID,
}

// ── Schema validation ────────────────────────────────────────────────

describe('Deal validation schemas', () => {
  describe('dealSchema', () => {
    it('accepts valid deal input', () => {
      expect(dealSchema.safeParse(VALID_DEAL_INPUT).success).toBe(true)
    })

    // AC-07
    it('rejects empty deal name', () => {
      const result = dealSchema.safeParse({ ...VALID_DEAL_INPUT, name: '' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('name')
    })

    it('rejects deal name > 200 chars', () => {
      expect(dealSchema.safeParse({ ...VALID_DEAL_INPUT, name: 'x'.repeat(201) }).success).toBe(false)
    })

    // BR-10
    it('rejects negative deal value', () => {
      const result = dealSchema.safeParse({ ...VALID_DEAL_INPUT, value: -1 })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('value')
    })

    it('accepts zero deal value', () => {
      expect(dealSchema.safeParse({ ...VALID_DEAL_INPUT, value: 0 }).success).toBe(true)
    })

    // BR-06
    it('rejects currency != 3 chars', () => {
      const result = dealSchema.safeParse({ ...VALID_DEAL_INPUT, currency: 'US' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('currency')
    })

    it('rejects invalid pipeline_id UUID', () => {
      expect(dealSchema.safeParse({ ...VALID_DEAL_INPUT, pipeline_id: 'not-a-uuid' }).success).toBe(false)
    })

    it('rejects invalid close_date format', () => {
      const result = dealSchema.safeParse({ ...VALID_DEAL_INPUT, close_date: '12/31/2026' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].path).toContain('close_date')
    })

    it('accepts deal without optional fields', () => {
      const { close_date: _d, contact_id: _c, owner_id: _o, ...minimal } = VALID_DEAL_INPUT
      const result = dealSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      expect(result.data?.close_date).toBeUndefined()
    })
  })

  describe('moveStageSchema', () => {
    it('accepts valid stage move input', () => {
      expect(moveStageSchema.safeParse({ deal_id: DEAL_ID, stage_id: STAGE_2_ID }).success).toBe(true)
    })

    it('rejects non-UUID deal_id', () => {
      expect(moveStageSchema.safeParse({ deal_id: 'not-a-uuid', stage_id: STAGE_2_ID }).success).toBe(false)
    })

    it('rejects missing stage_id', () => {
      expect(moveStageSchema.safeParse({ deal_id: DEAL_ID }).success).toBe(false)
    })
  })

  describe('closeDealSchema', () => {
    // AC-10 & BR-04
    it('rejects closing as lost with empty reason', () => {
      const result = closeDealSchema.safeParse({ deal_id: DEAL_ID, status: 'lost', lost_reason: '' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toContain('Lost reason is required')
    })

    it('rejects closing as lost with null reason', () => {
      expect(closeDealSchema.safeParse({ deal_id: DEAL_ID, status: 'lost', lost_reason: null }).success).toBe(false)
    })

    // BR-04
    it('accepts closing as won without reason', () => {
      expect(closeDealSchema.safeParse({ deal_id: DEAL_ID, status: 'won', lost_reason: null }).success).toBe(true)
    })

    // AC-11
    it('accepts closing as lost with reason', () => {
      expect(
        closeDealSchema.safeParse({ deal_id: DEAL_ID, status: 'lost', lost_reason: 'Customer chose competitor' }).success
      ).toBe(true)
    })

    it('rejects lost_reason > 500 chars', () => {
      expect(
        closeDealSchema.safeParse({ deal_id: DEAL_ID, status: 'lost', lost_reason: 'x'.repeat(501) }).success
      ).toBe(false)
    })
  })

  describe('pipelineSchema', () => {
    it('accepts valid pipeline input', () => {
      expect(pipelineSchema.safeParse({ name: 'Sales Pipeline', is_default: true }).success).toBe(true)
    })

    it('rejects empty pipeline name', () => {
      expect(pipelineSchema.safeParse({ name: '', is_default: false }).success).toBe(false)
    })
  })
})

// ── createDeal ───────────────────────────────────────────────────────

describe('createDeal action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await createDeal(VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  it('returns validation error for invalid input (empty name)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const result = await createDeal({ ...VALID_DEAL_INPUT, name: '' })
    expect(result.error).toBeDefined()
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-08 & BR-02
  it('returns error when free plan deal limit (100) reached', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'free', deal_count: '100' }]) // plan check
    const result = await createDeal(VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('100-deal limit')
  })

  // BR-01
  it('returns error for pipeline not belonging to org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro', deal_count: '50' }]) // plan check
      .mockResolvedValueOnce([])                                   // pipeline not found
    const result = await createDeal(VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('Invalid pipeline')
  })

  // BR-01
  it('returns error when stage does not belong to pipeline', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro', deal_count: '50' }]) // plan check
      .mockResolvedValueOnce([mockPipeline])                       // pipeline found
      .mockResolvedValueOnce([])                                   // stage not in pipeline
    const result = await createDeal(VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('Invalid stage for this pipeline')
  })

  // AC-06
  it('creates deal and revalidates /deals on success', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ plan: 'pro', deal_count: '50' }])
      .mockResolvedValueOnce([mockPipeline])
      .mockResolvedValueOnce([mockStage])
      .mockResolvedValueOnce([{ id: DEAL_ID }])
    const result = await createDeal(VALID_DEAL_INPUT)
    expect(result.data).toEqual({ id: DEAL_ID })
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })
})

// ── updateDeal ───────────────────────────────────────────────────────

describe('updateDeal action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await updateDeal(DEAL_ID, VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
  })

  // BR-03
  it('returns error when deal is closed (won/lost)', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([{ id: DEAL_ID, status: 'won' }])
    const result = await updateDeal(DEAL_ID, VALID_DEAL_INPUT)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('closed')
  })

  it('successfully updates an open deal', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID, status: 'open' }]) // fetch existing
      .mockResolvedValueOnce([mockPipeline])                     // verify pipeline
      .mockResolvedValueOnce([mockStage])                        // verify stage
      .mockResolvedValueOnce([{ id: DEAL_ID }])                 // UPDATE
    const result = await updateDeal(DEAL_ID, VALID_DEAL_INPUT)
    expect(result.data).toEqual({ id: DEAL_ID })
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })
})

// ── moveDealStage ────────────────────────────────────────────────────

describe('moveDealStage action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // AC-04 & BR-03
  it('returns error when moving a closed deal', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([{ id: DEAL_ID, status: 'won', pipeline_id: PIPELINE_ID }])
    const result = await moveDealStage({ deal_id: DEAL_ID, stage_id: STAGE_2_ID })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('closed')
  })

  // BR-09
  it('returns error when stage belongs to a different pipeline', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID, status: 'open', pipeline_id: PIPELINE_ID }]) // fetch deal
      .mockResolvedValueOnce([])                                                           // stage not in pipeline
    const result = await moveDealStage({ deal_id: DEAL_ID, stage_id: STAGE_2_ID })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('Invalid stage for this pipeline')
  })

  // AC-03
  it('successfully moves deal to a new stage', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID, status: 'open', pipeline_id: PIPELINE_ID }]) // fetch deal
      .mockResolvedValueOnce([{ id: STAGE_2_ID }])                                        // verify stage
      .mockResolvedValueOnce([])                                                           // UPDATE
    const result = await moveDealStage({ deal_id: DEAL_ID, stage_id: STAGE_2_ID })
    expect(result.data).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })
})

// ── closeDeal ────────────────────────────────────────────────────────

describe('closeDeal action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // AC-09
  it('closes deal as won and stores null lost_reason', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID, status: 'open' }]) // fetch
      .mockResolvedValueOnce([])                                 // UPDATE
    const result = await closeDeal({ deal_id: DEAL_ID, status: 'won', lost_reason: null })
    expect(result.data).toEqual({ ok: true })
    // Verify UPDATE SQL uses correct columns
    const updateSql = vi.mocked(queryForOrg).mock.calls[1][2] as string
    expect(updateSql).toMatch(/status = \$1/)
    expect(updateSql).toMatch(/lost_reason = \$2/)
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })

  // AC-11
  it('closes deal as lost and stores lost_reason', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID, status: 'open' }])
      .mockResolvedValueOnce([])
    const result = await closeDeal({ deal_id: DEAL_ID, status: 'lost', lost_reason: 'Customer chose competitor' })
    expect(result.data).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })

  it('returns error when deal is already closed', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([{ id: DEAL_ID, status: 'lost' }])
    const result = await closeDeal({ deal_id: DEAL_ID, status: 'won', lost_reason: null })
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('already closed')
  })
})

// ── deleteDeal ───────────────────────────────────────────────────────

describe('deleteDeal action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // AC-17 & BR-05
  it('returns permission error for non-admin user', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockMemberUser)
    const result = await deleteDeal(DEAL_ID)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('permission')
    expect(queryForOrg).not.toHaveBeenCalled()
  })

  // AC-16 & BR-05: hard delete (no deleted_at)
  it('hard deletes deal for admin and revalidates', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: DEAL_ID }]) // SELECT deal
      .mockResolvedValueOnce([])                 // DELETE
    const result = await deleteDeal(DEAL_ID)
    expect(result.data).toEqual({ ok: true })
    const deleteSql = vi.mocked(queryForOrg).mock.calls[1][2] as string
    expect(deleteSql).toMatch(/DELETE FROM deals/)
    expect(deleteSql).not.toMatch(/deleted_at/)
    expect(revalidatePath).toHaveBeenCalledWith('/deals')
  })

  it('returns error when deal not found', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([]) // deal not found
    const result = await deleteDeal(DEAL_ID)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('not found')
  })
})

// ── Read actions ─────────────────────────────────────────────────────

describe('getDealsForPipeline action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    const result = await getDealsForPipeline(PIPELINE_ID)
    expect(result.error).toBeDefined()
  })

  // AC-02: returns only deals for the requested pipeline
  it('returns deals for the requested pipeline', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([mockPipeline]) // pipeline exists
      .mockResolvedValueOnce([mockDeal])     // deals
    const result = await getDealsForPipeline(PIPELINE_ID)
    expect(result.data).toEqual([mockDeal])
  })

  // BR-01 multi-tenant: pipeline from another org is not found
  it('returns error when pipeline not found in org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([]) // pipeline not in org
    const result = await getDealsForPipeline(PIPELINE_2)
    expect(result.error).toBeDefined()
    expect((result.error as { message: string }).message).toContain('not found')
  })
})

describe('getDeal action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns deal with mapped activities', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const mockActivity = {
      id: '00000000-0000-4000-8000-000000000010', type: 'note',
      body: 'Test note', due_at: null, done_at: null,
      owner_id: USER_ID, created_at: '2026-06-01T00:00:00Z',
    }
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ ...mockDeal, pipeline_name: 'Sales Pipeline' }]) // deal
      .mockResolvedValueOnce([mockActivity])                                       // activities
    const result = await getDeal(DEAL_ID)
    expect(result.data?.id).toBe(DEAL_ID)
    expect(result.data?.activities).toHaveLength(1)
    expect(result.data?.activities[0].title).toBe('Note added')
  })

  it('returns error for nonexistent deal', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])
    const result = await getDeal(DEAL_ID)
    expect(result.error).toBeDefined()
  })
})

describe('getContactOptions action', () => {
  it('returns list of contacts for org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const mockContact = { id: CONTACT_ID, first_name: 'John', last_name: 'Doe', email: 'j@x.com', company: 'Acme' }
    vi.mocked(queryForOrg).mockResolvedValueOnce([mockContact])
    const result = await getContactOptions()
    expect(result.data).toEqual([mockContact])
  })
})

describe('getOrgMembers action', () => {
  it('returns list of org members', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const member = { id: USER_ID, full_name: 'Admin User', email: 'admin@test.com', avatar_url: null }
    vi.mocked(queryForOrg).mockResolvedValueOnce([member])
    const result = await getOrgMembers()
    expect(result.data).toEqual([member])
  })
})

// ── Pipeline actions ─────────────────────────────────────────────────

describe('getPipelines action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns error when not authenticated', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(null)
    expect((await getPipelines()).error).toBeDefined()
  })

  // AC-01: default pipeline returned first (DB ORDER BY is_default DESC)
  it('returns pipelines in default-first order', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const other = { ...mockPipeline, id: PIPELINE_2, name: 'Custom', is_default: false }
    vi.mocked(queryForOrg).mockResolvedValueOnce([mockPipeline, other])
    const result = await getPipelines()
    expect(result.data?.[0].is_default).toBe(true)
  })
})

describe('getPipelineWithStages action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('returns stages ordered by position', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    const stage2 = { ...mockStage, id: STAGE_2_ID, name: 'Qualified', position: 1 }
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([mockPipeline])     // verify pipeline
      .mockResolvedValueOnce([mockStage, stage2]) // stages
    const result = await getPipelineWithStages(PIPELINE_ID)
    expect(result.data).toHaveLength(2)
    expect(result.data?.[0].position).toBe(0)
  })

  it('returns error for pipeline not belonging to org', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg).mockResolvedValueOnce([])
    const result = await getPipelineWithStages(PIPELINE_2)
    expect(result.error).toBeDefined()
  })
})

describe('ensureDefaultPipeline action', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const sixStages = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map(
    (name, i) => ({ id: `00000000-0000-4000-8000-0000000000${10 + i}`, pipeline_id: PIPELINE_ID, name, position: i, probability: [10, 30, 60, 80, 100, 0][i], created_at: '2026-06-01T00:00:00Z' })
  )

  // AC-18 & BR-07: creates default 6-stage pipeline when none exist
  it('creates default pipeline with 6 stages when org has none', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([])                    // call 1: existing pipelines → none
      .mockResolvedValueOnce([{ id: PIPELINE_ID }]) // call 2: INSERT pipeline
      .mockResolvedValueOnce([])                    // call 3: INSERT New
      .mockResolvedValueOnce([])                    // call 4: INSERT Qualified
      .mockResolvedValueOnce([])                    // call 5: INSERT Proposal
      .mockResolvedValueOnce([])                    // call 6: INSERT Negotiation
      .mockResolvedValueOnce([])                    // call 7: INSERT Closed Won
      .mockResolvedValueOnce([])                    // call 8: INSERT Closed Lost
      .mockResolvedValueOnce(sixStages)             // call 9: SELECT stages
    const result = await ensureDefaultPipeline()
    expect(result.pipelineId).toBe(PIPELINE_ID)
    expect(result.stages).toHaveLength(6)
    expect(result.stages[0].name).toBe('New')
    expect(result.stages[5].name).toBe('Closed Lost')
  })

  // BR-07: returns existing default pipeline without creating
  it('returns existing pipeline without creating when one already exists', async () => {
    vi.mocked(getAuthUser).mockResolvedValue(mockAdminUser)
    vi.mocked(queryForOrg)
      .mockResolvedValueOnce([{ id: PIPELINE_ID, is_default: true }]) // existing pipeline
      .mockResolvedValueOnce(sixStages)                                // SELECT stages
    const result = await ensureDefaultPipeline()
    expect(result.pipelineId).toBe(PIPELINE_ID)
    // Only 2 DB calls, not 9 — no INSERT
    expect(queryForOrg).toHaveBeenCalledTimes(2)
  })
})
