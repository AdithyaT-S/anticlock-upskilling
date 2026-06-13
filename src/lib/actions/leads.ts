'use server'

import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/auth'
import { queryForOrg } from '@/lib/db'
import {
  leadSchema,
  leadUpdateSchema,
  leadSearchSchema,
  leadStatusUpdateSchema,
} from '@/lib/validations/lead'
import type { Activity, ActivityType } from '@/types/crm'
import type { OrgMember } from '@/lib/actions/contacts'

export type { OrgMember }

// ── Extended types ──────────────────────────────────────────────────

export interface LeadWithContact {
  id: string
  org_id: string
  contact_id: string | null
  status: string
  score: number
  source: string | null
  owner_id: string | null
  notes: string | null
  converted_at: string | null
  created_at: string
  updated_at: string
  contact_first_name: string | null
  contact_last_name: string | null
  contact_company: string | null
  contact_email: string | null
  contact_phone: string | null
  owner_name: string | null
  owner_email: string | null
  owner_avatar_url: string | null
  last_activity_at: string | null
}

export interface ContactOption {
  id: string
  first_name: string
  last_name: string
  email: string | null
  company: string | null
}

interface DbActivityRow {
  id: string
  type: string
  body: string | null
  due_at: string | null
  done_at: string | null
  owner_id: string | null
  created_at: string
}

const ACTIVITY_TITLES: Record<string, string> = {
  call:    'Call logged',
  email:   'Email sent',
  note:    'Note added',
  task:    'Task',
  meeting: 'Meeting',
}

function mapToActivity(row: DbActivityRow, orgId: string, contactId: string): Activity {
  return {
    id:          row.id,
    org_id:      orgId,
    type:        row.type as ActivityType,
    title:       ACTIVITY_TITLES[row.type] ?? row.type,
    description: row.body ?? null,
    contact_id:  contactId,
    lead_id:     null,
    deal_id:     null,
    ticket_id:   null,
    user_id:     row.owner_id ?? '',
    occurred_at: row.created_at,
    created_at:  row.created_at,
  }
}

// ── getLeads ─────────────────────────────────────────────────────────

export async function getLeads(params: Record<string, string | string[] | undefined>) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = leadSearchSchema.safeParse(params)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { status, owner_id, page, per_page } = parsed.data
  const offset = (page - 1) * per_page

  const conditions: string[] = []
  const sqlParams: unknown[] = []
  let idx = 1

  if (status) {
    conditions.push(`l.status = $${idx}`)
    sqlParams.push(status)
    idx++
  }
  if (owner_id) {
    conditions.push(`l.owner_id = $${idx}`)
    sqlParams.push(owner_id)
    idx++
  }

  const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : ''

  const [countRow] = await queryForOrg<{ count: string }>(
    user.orgId, user.id,
    `SELECT COUNT(*) AS count
     FROM leads l
     WHERE l.org_id = $${idx} ${where}`,
    [...sqlParams, user.orgId]
  )
  const total = parseInt(countRow?.count ?? '0', 10)
  idx++

  const leads = await queryForOrg<LeadWithContact>(
    user.orgId, user.id,
    `SELECT
       l.id, l.org_id, l.contact_id, l.status, l.score, l.source,
       l.owner_id, l.notes, l.converted_at, l.created_at, l.updated_at,
       c.first_name  AS contact_first_name,
       c.last_name   AS contact_last_name,
       c.company     AS contact_company,
       c.email       AS contact_email,
       c.phone       AS contact_phone,
       u.full_name   AS owner_name,
       u.email       AS owner_email,
       u.avatar_url  AS owner_avatar_url,
       (SELECT MAX(a.created_at) FROM activities a WHERE a.contact_id = l.contact_id) AS last_activity_at
     FROM leads l
     LEFT JOIN contacts c ON c.id = l.contact_id
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.org_id = $${idx} ${where}
     ORDER BY l.created_at DESC
     LIMIT $${idx + 1} OFFSET $${idx + 2}`,
    [...sqlParams, user.orgId, per_page, offset]
  )

  return {
    data: {
      leads,
      total,
      page,
      per_page,
      pageCount: Math.ceil(total / per_page),
    },
  }
}

// ── getLead ───────────────────────────────────────────────────────────

export async function getLead(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const rows = await queryForOrg<LeadWithContact>(
    user.orgId, user.id,
    `SELECT
       l.id, l.org_id, l.contact_id, l.status, l.score, l.source,
       l.owner_id, l.notes, l.converted_at, l.created_at, l.updated_at,
       c.first_name  AS contact_first_name,
       c.last_name   AS contact_last_name,
       c.company     AS contact_company,
       c.email       AS contact_email,
       c.phone       AS contact_phone,
       u.full_name   AS owner_name,
       u.email       AS owner_email,
       u.avatar_url  AS owner_avatar_url,
       NULL::timestamptz AS last_activity_at
     FROM leads l
     LEFT JOIN contacts c ON c.id = l.contact_id
     LEFT JOIN users u ON u.id = l.owner_id
     WHERE l.id = $1`,
    [id]
  )

  const lead = rows[0]
  if (!lead) return { error: { message: 'Lead not found' } }

  const activities = lead.contact_id
    ? await queryForOrg<DbActivityRow>(
        user.orgId, user.id,
        `SELECT a.id, a.type, a.body, a.due_at, a.done_at, a.owner_id, a.created_at
         FROM activities a
         WHERE a.contact_id = $1
         ORDER BY a.created_at DESC`,
        [lead.contact_id]
      )
    : []

  const mapped = activities.map((row) =>
    mapToActivity(row, user.orgId, lead.contact_id ?? '')
  )

  return { data: { lead, activities: mapped } }
}

// ── getContactsForPicker ──────────────────────────────────────────────

export async function getContactsForPicker() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const contacts = await queryForOrg<ContactOption>(
    user.orgId, user.id,
    `SELECT id, first_name, last_name, email, company
     FROM contacts
     WHERE deleted_at IS NULL
     ORDER BY first_name, last_name`,
    []
  )

  return { data: contacts }
}

// ── createLead ───────────────────────────────────────────────────────

export async function createLead(data: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const parsed = leadSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const d = parsed.data

  const [contact] = await queryForOrg<{ id: string }>(
    user.orgId, user.id,
    `SELECT id FROM contacts WHERE id = $1 AND deleted_at IS NULL`,
    [d.contact_id]
  )
  if (!contact) return { error: { message: 'Selected contact does not exist in this organisation' } }

  if (d.owner_id) {
    const [owner] = await queryForOrg<{ id: string }>(
      user.orgId, user.id,
      `SELECT id FROM users WHERE id = $1`,
      [d.owner_id]
    )
    if (!owner) return { error: { message: 'Selected owner is not a member of this organisation' } }
  }

  const [existingLead] = await queryForOrg<{ id: string }>(
    user.orgId, user.id,
    `SELECT id FROM leads WHERE contact_id = $1 AND converted_at IS NULL`,
    [d.contact_id]
  )
  if (existingLead) return { error: { message: 'This contact already has an active lead' } }

  try {
    const [lead] = await queryForOrg<{ id: string }>(
      user.orgId, user.id,
      `INSERT INTO leads (org_id, contact_id, status, score, source, owner_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [
        user.orgId,
        d.contact_id,
        d.status,
        d.score,
        d.source ?? null,
        d.owner_id ?? null,
        d.notes ?? null,
      ]
    )
    revalidatePath('/leads')
    return { data: { id: lead.id } }
  } catch (err) {
    console.error('[createLead]', err)
    return { error: { message: 'Failed to create lead' } }
  }
}

// ── updateLead ───────────────────────────────────────────────────────

export async function updateLead(id: string, data: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const parsed = leadUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [existing] = await queryForOrg<{ id: string; converted_at: string | null }>(
    user.orgId, user.id,
    `SELECT id, converted_at FROM leads WHERE id = $1`,
    [id]
  )
  if (!existing) return { error: { message: 'Lead not found' } }
  if (existing.converted_at) return { error: { message: 'This lead has been converted and cannot be edited' } }

  const d = parsed.data

  if (d.owner_id) {
    const [owner] = await queryForOrg<{ id: string }>(
      user.orgId, user.id,
      `SELECT id FROM users WHERE id = $1`,
      [d.owner_id]
    )
    if (!owner) return { error: { message: 'Selected owner is not a member of this organisation' } }
  }

  try {
    await queryForOrg(
      user.orgId, user.id,
      `UPDATE leads SET
         status=$1, score=$2, source=$3, owner_id=$4, notes=$5, updated_at=now()
       WHERE id=$6 AND org_id=$7`,
      [
        d.status,
        d.score,
        d.source ?? null,
        d.owner_id ?? null,
        d.notes ?? null,
        id,
        user.orgId,
      ]
    )
    revalidatePath('/leads')
    return { success: true }
  } catch (err) {
    console.error('[updateLead]', err)
    return { error: { message: 'Failed to update lead' } }
  }
}

// ── updateLeadStatus ─────────────────────────────────────────────────

export async function updateLeadStatus(id: string, data: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const parsed = leadStatusUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [existing] = await queryForOrg<{ id: string; converted_at: string | null }>(
    user.orgId, user.id,
    `SELECT id, converted_at FROM leads WHERE id = $1`,
    [id]
  )
  if (!existing) return { error: { message: 'Lead not found' } }
  if (existing.converted_at) return { error: { message: 'This lead has been converted and cannot be edited' } }

  await queryForOrg(
    user.orgId, user.id,
    `UPDATE leads SET status=$1, updated_at=now() WHERE id=$2 AND org_id=$3`,
    [parsed.data.status, id, user.orgId]
  )

  revalidatePath('/leads')
  return { success: true }
}

// ── deleteLead ───────────────────────────────────────────────────────

export async function deleteLead(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const [existing] = await queryForOrg<{ id: string }>(
    user.orgId, user.id,
    `SELECT id FROM leads WHERE id = $1`,
    [id]
  )
  if (!existing) return { error: { message: 'Lead not found' } }

  await queryForOrg(
    user.orgId, user.id,
    `DELETE FROM leads WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )

  revalidatePath('/leads')
  return { success: true }
}

// ── convertLeadToDeal ────────────────────────────────────────────────

export async function convertLeadToDeal(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const [lead] = await queryForOrg<{
    id: string
    contact_id: string | null
    source: string | null
    converted_at: string | null
  }>(
    user.orgId, user.id,
    `SELECT id, contact_id, source, converted_at FROM leads WHERE id = $1`,
    [id]
  )
  if (!lead) return { error: { message: 'Lead not found' } }
  if (lead.converted_at) return { error: { message: 'This lead has already been converted to a deal' } }

  await queryForOrg(
    user.orgId, user.id,
    `UPDATE leads SET converted_at=now(), updated_at=now() WHERE id=$1 AND org_id=$2`,
    [id, user.orgId]
  )

  revalidatePath('/leads')
  return {
    data: {
      contactId: lead.contact_id,
      source: lead.source,
    },
  }
}
