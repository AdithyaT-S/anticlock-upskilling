'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/auth'
import { queryForOrg } from '@/lib/db'
import { dealSchema, moveStageSchema, closeDealSchema } from '@/lib/validations/deal'
import { FREE_PLAN_LIMITS } from '@/lib/utils/constants'
import type { DealWithRelations } from '@/types/crm'
import { type DbActivityRow, mapToActivity } from '@/lib/utils/activity'
import type { OrgMember, ContactOption } from '@/lib/actions/contacts'

export type { OrgMember, ContactOption }

// ── Extended types ──────────────────────────────────────────────────

export interface DealDetail extends DealWithRelations {
  pipeline_name: string
  activities: import('@/types/crm').Activity[]
}

// ── Reads ────────────────────────────────────────────────────────────

export async function getDealsForPipeline(pipelineId: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const [pipeline] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipelines WHERE id = $1 AND org_id = $2`,
    [pipelineId, user.orgId]
  )
  if (!pipeline) return { error: { message: 'Pipeline not found' } }

  const deals = await queryForOrg<DealWithRelations>(
    user.orgId,
    user.id,
    `SELECT
       d.id, d.org_id, d.name, d.pipeline_id, d.stage_id,
       d.value, d.currency, d.close_date, d.status, d.lost_reason,
       d.contact_id, d.owner_id, d.created_at, d.updated_at,
       ps.name   AS stage_name,
       ps.position AS stage_position,
       c.first_name AS contact_first_name,
       c.last_name  AS contact_last_name,
       c.company    AS contact_company,
       u.full_name  AS owner_name,
       u.avatar_url AS owner_avatar_url
     FROM deals d
     JOIN pipeline_stages ps ON ps.id = d.stage_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users   u ON u.id = d.owner_id
     WHERE d.org_id = $1 AND d.pipeline_id = $2
     ORDER BY d.created_at ASC`,
    [user.orgId, pipelineId]
  )

  return { data: deals }
}

export async function getDeal(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const [deal] = await queryForOrg<DealWithRelations & { pipeline_name: string }>(
    user.orgId,
    user.id,
    `SELECT
       d.id, d.org_id, d.name, d.pipeline_id, d.stage_id,
       d.value, d.currency, d.close_date, d.status, d.lost_reason,
       d.contact_id, d.owner_id, d.created_at, d.updated_at,
       ps.name     AS stage_name,
       ps.position AS stage_position,
       p.name      AS pipeline_name,
       c.first_name AS contact_first_name,
       c.last_name  AS contact_last_name,
       c.company    AS contact_company,
       u.full_name  AS owner_name,
       u.avatar_url AS owner_avatar_url
     FROM deals d
     JOIN pipeline_stages ps ON ps.id = d.stage_id
     JOIN pipelines p        ON p.id  = d.pipeline_id
     LEFT JOIN contacts c ON c.id = d.contact_id
     LEFT JOIN users   u ON u.id = d.owner_id
     WHERE d.id = $1 AND d.org_id = $2`,
    [id, user.orgId]
  )

  if (!deal) return { error: { message: 'Deal not found' } }

  const activityRows = await queryForOrg<DbActivityRow>(
    user.orgId,
    user.id,
    `SELECT id, type, body, due_at, done_at, owner_id, created_at
     FROM activities
     WHERE deal_id = $1 AND org_id = $2
     ORDER BY created_at DESC`,
    [id, user.orgId]
  )

  const dealDetail: DealDetail = {
    ...deal,
    pipeline_name: deal.pipeline_name,
    activities: activityRows.map((r) => mapToActivity(r, user.orgId, { deal_id: id })),
  }

  return { data: dealDetail }
}

export async function getContactOptions() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const contacts = await queryForOrg<ContactOption>(
    user.orgId,
    user.id,
    `SELECT id, first_name, last_name, email, company
     FROM contacts
     WHERE org_id = $1 AND deleted_at IS NULL
     ORDER BY first_name ASC, last_name ASC
     LIMIT 200`,
    [user.orgId]
  )

  return { data: contacts }
}

export async function getOrgMembers() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const members = await queryForOrg<OrgMember>(
    user.orgId,
    user.id,
    `SELECT id, full_name, email, avatar_url
     FROM users
     WHERE org_id = $1
     ORDER BY full_name ASC`,
    [user.orgId]
  )

  return { data: members }
}

// ── Mutations ────────────────────────────────────────────────────────

export async function createDeal(input: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // Free plan limit check
  const [orgRow] = await queryForOrg<{ plan: string; deal_count: string }>(
    user.orgId,
    user.id,
    `SELECT o.plan, COUNT(d.id)::text AS deal_count
     FROM orgs o
     LEFT JOIN deals d ON d.org_id = o.id AND d.status = 'open'
     WHERE o.id = $1
     GROUP BY o.plan`,
    [user.orgId]
  )

  if (orgRow?.plan === 'free' && Number(orgRow.deal_count) >= FREE_PLAN_LIMITS.deals) {
    return { error: { message: `Your org has reached the ${FREE_PLAN_LIMITS.deals}-deal limit on the free plan. Upgrade to Pro to add more deals.` } }
  }

  // Verify pipeline belongs to org
  const [pipeline] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipelines WHERE id = $1 AND org_id = $2`,
    [parsed.data.pipeline_id, user.orgId]
  )
  if (!pipeline) return { error: { message: 'Invalid pipeline' } }

  // Verify stage belongs to pipeline
  const [stage] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipeline_stages WHERE id = $1 AND pipeline_id = $2`,
    [parsed.data.stage_id, parsed.data.pipeline_id]
  )
  if (!stage) return { error: { message: 'Invalid stage for this pipeline.' } }

  const [deal] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `INSERT INTO deals
       (org_id, name, pipeline_id, stage_id, value, currency, close_date, contact_id, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      user.orgId,
      parsed.data.name,
      parsed.data.pipeline_id,
      parsed.data.stage_id,
      parsed.data.value,
      parsed.data.currency,
      parsed.data.close_date ?? null,
      parsed.data.contact_id ?? null,
      parsed.data.owner_id ?? null,
    ]
  )

  revalidatePath('/deals')
  return { data: deal }
}

export async function updateDeal(id: string, input: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = dealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [existing] = await queryForOrg<{ id: string; status: string }>(
    user.orgId,
    user.id,
    `SELECT id, status FROM deals WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )
  if (!existing) return { error: { message: 'Deal not found' } }
  if (existing.status !== 'open') return { error: { message: 'This deal is closed and cannot be modified.' } }

  // Verify pipeline + stage ownership
  const [pipeline] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipelines WHERE id = $1 AND org_id = $2`,
    [parsed.data.pipeline_id, user.orgId]
  )
  if (!pipeline) return { error: { message: 'Invalid pipeline' } }

  const [stage] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipeline_stages WHERE id = $1 AND pipeline_id = $2`,
    [parsed.data.stage_id, parsed.data.pipeline_id]
  )
  if (!stage) return { error: { message: 'Invalid stage for this pipeline.' } }

  const [deal] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `UPDATE deals
     SET name = $1, pipeline_id = $2, stage_id = $3, value = $4,
         currency = $5, close_date = $6, contact_id = $7, owner_id = $8,
         updated_at = now()
     WHERE id = $9 AND org_id = $10
     RETURNING id`,
    [
      parsed.data.name,
      parsed.data.pipeline_id,
      parsed.data.stage_id,
      parsed.data.value,
      parsed.data.currency,
      parsed.data.close_date ?? null,
      parsed.data.contact_id ?? null,
      parsed.data.owner_id ?? null,
      id,
      user.orgId,
    ]
  )

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
  return { data: deal }
}

export async function moveDealStage(input: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = moveStageSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [deal] = await queryForOrg<{ id: string; status: string; pipeline_id: string }>(
    user.orgId,
    user.id,
    `SELECT id, status, pipeline_id FROM deals WHERE id = $1 AND org_id = $2`,
    [parsed.data.deal_id, user.orgId]
  )
  if (!deal) return { error: { message: 'Deal not found' } }
  if (deal.status !== 'open') return { error: { message: 'This deal is closed and cannot be modified.' } }

  // Verify new stage belongs to same pipeline
  const [stage] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipeline_stages WHERE id = $1 AND pipeline_id = $2`,
    [parsed.data.stage_id, deal.pipeline_id]
  )
  if (!stage) return { error: { message: 'Invalid stage for this pipeline.' } }

  await queryForOrg(
    user.orgId,
    user.id,
    `UPDATE deals SET stage_id = $1, updated_at = now() WHERE id = $2 AND org_id = $3`,
    [parsed.data.stage_id, parsed.data.deal_id, user.orgId]
  )

  revalidatePath('/deals')
  return { data: { ok: true } }
}

export async function closeDeal(input: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = closeDealSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [deal] = await queryForOrg<{ id: string; status: string }>(
    user.orgId,
    user.id,
    `SELECT id, status FROM deals WHERE id = $1 AND org_id = $2`,
    [parsed.data.deal_id, user.orgId]
  )
  if (!deal) return { error: { message: 'Deal not found' } }
  if (deal.status !== 'open') return { error: { message: 'This deal is already closed.' } }

  await queryForOrg(
    user.orgId,
    user.id,
    `UPDATE deals
     SET status = $1, lost_reason = $2, updated_at = now()
     WHERE id = $3 AND org_id = $4`,
    [
      parsed.data.status,
      parsed.data.status === 'lost' ? (parsed.data.lost_reason ?? null) : null,
      parsed.data.deal_id,
      user.orgId,
    ]
  )

  revalidatePath('/deals')
  return { data: { ok: true } }
}

export async function deleteDeal(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  if (user.role !== 'admin') {
    return { error: { message: "You don't have permission to delete deals." } }
  }

  const [deal] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM deals WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )
  if (!deal) return { error: { message: 'Deal not found' } }

  await queryForOrg(
    user.orgId,
    user.id,
    `DELETE FROM deals WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )

  revalidatePath('/deals')
  return { data: { ok: true } }
}
