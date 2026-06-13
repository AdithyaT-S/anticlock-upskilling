'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { getAuthUser } from '@/lib/auth'
import { queryForOrg } from '@/lib/db'
import { FREE_PLAN_LIMITS } from '@/lib/utils/constants'
import {
  contactSchema,
  contactSearchSchema,
  csvImportRowSchema,
} from '@/lib/validations/contact'
import type { Contact } from '@/types/crm'
import { type DbActivityRow, mapToActivity } from '@/lib/utils/activity'

// ── Extended types ──────────────────────────────────────────────────

export interface ContactWithOwner extends Contact {
  owner_name: string | null
  owner_email: string | null
  last_activity_at: string | null
}

export interface OrgMember {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
}

export interface ContactOption {
  id: string
  first_name: string
  last_name: string
  email: string | null
  company: string | null
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: { row: number; message: string }[]
}

// ── getContacts ─────────────────────────────────────────────────────

export async function getContacts(params: Record<string, string | string[] | undefined>) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const parsed = contactSearchSchema.safeParse(params)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { q, owner_id, lead_source, page, per_page } = parsed.data
  const offset = (page - 1) * per_page

  const conditions: string[] = ['c.deleted_at IS NULL']
  const sqlParams: unknown[] = []
  let idx = 1

  if (q) {
    conditions.push(
      `(c.first_name ILIKE $${idx} OR c.last_name ILIKE $${idx} OR c.email ILIKE $${idx} OR c.company ILIKE $${idx})`
    )
    sqlParams.push(`%${q}%`)
    idx++
  }
  if (owner_id) {
    conditions.push(`c.owner_id = $${idx}`)
    sqlParams.push(owner_id)
    idx++
  }
  if (lead_source) {
    conditions.push(`c.lead_source = $${idx}`)
    sqlParams.push(lead_source)
    idx++
  }

  const where = conditions.join(' AND ')

  const [countRow] = await queryForOrg<{ count: string }>(
    user.orgId, user.id,
    `SELECT COUNT(*) AS count FROM contacts c WHERE ${where}`,
    sqlParams
  )
  const total = parseInt(countRow?.count ?? '0', 10)

  const contacts = await queryForOrg<ContactWithOwner>(
    user.orgId, user.id,
    `SELECT
       c.id, c.org_id, c.first_name, c.last_name, c.email, c.phone,
       c.company, c.job_title, c.lead_source, c.owner_id,
       c.tags, c.custom_fields, c.created_at, c.updated_at,
       u.full_name  AS owner_name,
       u.email      AS owner_email,
       (SELECT MAX(a.created_at) FROM activities a WHERE a.contact_id = c.id) AS last_activity_at
     FROM contacts c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...sqlParams, per_page, offset]
  )

  return {
    data: {
      contacts,
      total,
      page,
      per_page,
      pageCount: Math.ceil(total / per_page),
    },
  }
}

// ── getContact ──────────────────────────────────────────────────────

export async function getContact(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const rows = await queryForOrg<ContactWithOwner & { owner_avatar_url: string | null }>(
    user.orgId, user.id,
    `SELECT
       c.id, c.org_id, c.first_name, c.last_name, c.email, c.phone,
       c.company, c.job_title, c.lead_source, c.owner_id,
       c.tags, c.custom_fields, c.created_at, c.updated_at,
       u.full_name  AS owner_name,
       u.email      AS owner_email,
       u.avatar_url AS owner_avatar_url
     FROM contacts c
     LEFT JOIN users u ON u.id = c.owner_id
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [id]
  )

  const contact = rows[0]
  if (!contact) return { error: { message: 'Contact not found' } }

  const [dbActivities, dealsRows] = await Promise.all([
    queryForOrg<DbActivityRow>(
      user.orgId, user.id,
      `SELECT a.id, a.type, a.body, a.due_at, a.done_at, a.owner_id, a.created_at
       FROM activities a
       WHERE a.contact_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    ),
    queryForOrg<{ count: string }>(
      user.orgId, user.id,
      `SELECT COUNT(*) AS count FROM deals WHERE contact_id = $1`,
      [id]
    ),
  ])

  const activities = dbActivities.map((row) => mapToActivity(row, user.orgId, { contact_id: id }))
  const dealsCount = parseInt(dealsRows[0]?.count ?? '0', 10)

  return { data: { contact, activities, dealsCount } }
}

// ── getOrgMembers ───────────────────────────────────────────────────

export async function getOrgMembers() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const members = await queryForOrg<OrgMember>(
    user.orgId, user.id,
    `SELECT id, full_name, email, avatar_url FROM users ORDER BY full_name`,
    []
  )

  return { data: members }
}

// ── createContact ───────────────────────────────────────────────────

export async function createContact(data: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const parsed = contactSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const d = parsed.data

  if (d.owner_id) {
    const [owner] = await queryForOrg<{ id: string }>(
      user.orgId, user.id,
      `SELECT id FROM users WHERE id = $1`,
      [d.owner_id]
    )
    if (!owner) return { error: { message: 'Selected owner is not a member of this organisation' } }
  }

  const [orgRow] = await queryForOrg<{ plan: string }>(
    user.orgId, user.id,
    `SELECT plan FROM orgs WHERE id = $1`,
    [user.orgId]
  )
  if (orgRow?.plan === 'free') {
    const [countRow] = await queryForOrg<{ count: string }>(
      user.orgId, user.id,
      `SELECT COUNT(*) AS count FROM contacts WHERE deleted_at IS NULL`,
      []
    )
    if (parseInt(countRow?.count ?? '0', 10) >= FREE_PLAN_LIMITS.contacts) {
      return { error: { message: 'Contact limit reached — upgrade to Pro to add more contacts' } }
    }
  }

  try {
    const [contact] = await queryForOrg<Contact>(
      user.orgId, user.id,
      `INSERT INTO contacts
         (org_id, first_name, last_name, email, phone, company, job_title, lead_source, owner_id, tags, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        user.orgId,
        d.first_name,
        d.last_name ?? '',
        d.email || null,
        d.phone || null,
        d.company || null,
        d.job_title || null,
        d.lead_source ?? null,
        d.owner_id ?? null,
        d.tags ?? [],
        d.custom_fields ?? {},
      ]
    )
    revalidatePath('/contacts')
    return { data: contact }
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '23505') return { error: { message: 'A contact with this email already exists' } }
    console.error('[createContact]', err)
    return { error: { message: 'Failed to create contact' } }
  }
}

// ── updateContact ───────────────────────────────────────────────────

export async function updateContact(id: string, data: unknown) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const parsed = contactSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten() }

  const [existing] = await queryForOrg<{ id: string }>(
    user.orgId, user.id,
    `SELECT id FROM contacts WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  )
  if (!existing) return { error: { message: 'Contact not found' } }

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
    const [contact] = await queryForOrg<Contact>(
      user.orgId, user.id,
      `UPDATE contacts SET
         first_name=$1, last_name=$2, email=$3, phone=$4,
         company=$5, job_title=$6, lead_source=$7, owner_id=$8,
         tags=$9, custom_fields=$10, updated_at=now()
       WHERE id=$11 AND org_id=$12
       RETURNING *`,
      [
        d.first_name,
        d.last_name ?? '',
        d.email || null,
        d.phone || null,
        d.company || null,
        d.job_title || null,
        d.lead_source ?? null,
        d.owner_id ?? null,
        d.tags ?? [],
        d.custom_fields ?? {},
        id,
        user.orgId,
      ]
    )
    revalidatePath(`/contacts/${id}`)
    revalidatePath('/contacts')
    return { data: contact }
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '23505') return { error: { message: 'A contact with this email already exists' } }
    console.error('[updateContact]', err)
    return { error: { message: 'Failed to update contact' } }
  }
}

// ── deleteContact ───────────────────────────────────────────────────

export async function deleteContact(id: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const [existing] = await queryForOrg<{ id: string }>(
    user.orgId, user.id,
    `SELECT id FROM contacts WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  )
  if (!existing) return { error: { message: 'Contact not found' } }

  await queryForOrg(
    user.orgId, user.id,
    `UPDATE contacts SET deleted_at = now() WHERE id = $1 AND org_id = $2`,
    [id, user.orgId]
  )

  revalidatePath('/contacts')
  return { success: true }
}

// ── importContactsCSV ────────────────────────────────────────────────

export async function importContactsCSV(formData: FormData): Promise<{
  data?: ImportResult
  error?: { message: string }
}> {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }
  if (user.role === 'viewer') return { error: { message: "You don't have permission to do that" } }

  const file = formData.get('file') as File | null
  if (!file) return { error: { message: 'No file provided' } }

  const text = await file.text()
  const { data: rawRows, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  if (parseErrors.length > 0 && rawRows.length === 0) {
    return { error: { message: 'Could not parse CSV file' } }
  }

  const firstRow = rawRows[0]
  if (!firstRow || !('first_name' in firstRow) || !('email' in firstRow)) {
    return { error: { message: 'Invalid CSV — required columns: first_name, email' } }
  }

  const validRows: Array<{
    first_name: string
    last_name: string
    email: string
    phone?: string
    company?: string
    job_title?: string
    lead_source?: string
    tags: string[]
  }> = []
  const importErrors: { row: number; message: string }[] = []

  for (let i = 0; i < rawRows.length; i++) {
    const parsed = csvImportRowSchema.safeParse(rawRows[i])
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      importErrors.push({ row: i + 2, message: `${first.path.join('.')}: ${first.message}` })
      continue
    }
    validRows.push({
      first_name: parsed.data.first_name,
      last_name:  parsed.data.last_name ?? '',
      email:      parsed.data.email,
      phone:      parsed.data.phone,
      company:    parsed.data.company,
      job_title:  parsed.data.job_title,
      lead_source:parsed.data.lead_source,
      tags:       parsed.data.tags
        ? parsed.data.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
    })
  }

  const [orgRow] = await queryForOrg<{ plan: string }>(
    user.orgId, user.id,
    `SELECT plan FROM orgs WHERE id = $1`,
    [user.orgId]
  )

  let toImport = validRows
  if (orgRow?.plan === 'free') {
    const [countRow] = await queryForOrg<{ count: string }>(
      user.orgId, user.id,
      `SELECT COUNT(*) AS count FROM contacts WHERE deleted_at IS NULL`,
      []
    )
    const existing = parseInt(countRow?.count ?? '0', 10)
    const remaining = FREE_PLAN_LIMITS.contacts - existing
    if (remaining <= 0) {
      return { error: { message: 'Contact limit reached — upgrade to Pro to add more contacts' } }
    }
    if (validRows.length > remaining) {
      toImport = validRows.slice(0, remaining)
      importErrors.push({
        row: -1,
        message: `Free plan limit: only ${remaining} of ${validRows.length} valid rows were imported.`,
      })
    }
  }

  let imported = 0
  let skipped = 0

  for (const row of toImport) {
    try {
      const result = await queryForOrg<{ id: string }>(
        user.orgId, user.id,
        `INSERT INTO contacts (org_id, first_name, last_name, email, phone, company, job_title, lead_source, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (org_id, email) DO NOTHING
         RETURNING id`,
        [
          user.orgId,
          row.first_name,
          row.last_name,
          row.email,
          row.phone ?? null,
          row.company ?? null,
          row.job_title ?? null,
          row.lead_source ?? null,
          row.tags,
        ]
      )
      result.length > 0 ? imported++ : skipped++
    } catch (err) {
      console.error('[importContactsCSV] row error', err)
      skipped++
    }
  }

  revalidatePath('/contacts')
  return { data: { imported, skipped, errors: importErrors } }
}
