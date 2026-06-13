import { z } from 'zod'

export const DB_LEAD_SOURCES = [
  'website',
  'referral',
  'cold_outreach',
  'social',
  'event',
  'other',
] as const

export type DbLeadSource = (typeof DB_LEAD_SOURCES)[number]

export const LEAD_SOURCE_LABELS: Record<DbLeadSource, string> = {
  website:      'Website',
  referral:     'Referral',
  cold_outreach:'Cold Outreach',
  social:       'Social Media',
  event:        'Event',
  other:        'Other',
}

export const contactSchema = z.object({
  first_name:   z.string().min(1, 'First name is required').max(100),
  last_name:    z.string().max(100).optional(),
  email:        z.union([z.string().email('Invalid email').max(254), z.literal('')]).optional(),
  phone:        z.string().max(30).optional(),
  company:      z.string().max(200).optional(),
  job_title:    z.string().max(200).optional(),
  lead_source:  z.enum(DB_LEAD_SOURCES).optional(),
  owner_id:     z.string().uuid('Invalid owner').optional(),
  tags:         z.array(z.string().max(50)).max(20).optional(),
  custom_fields:z.record(z.string(), z.unknown()).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

export const contactSearchSchema = z.object({
  q:           z.string().max(200).optional(),
  owner_id:    z.string().uuid().optional(),
  lead_source: z.enum(DB_LEAD_SOURCES).optional(),
  page:        z.coerce.number().int().min(1).default(1),
  per_page:    z.coerce.number().int().min(1).max(100).default(50),
})

export type ContactSearchParams = z.infer<typeof contactSearchSchema>

export const csvImportRowSchema = z.object({
  first_name:  z.string().min(1, 'First name is required'),
  last_name:   z.string().optional(),
  email:       z.string().email('Invalid email'),
  phone:       z.string().max(30).optional(),
  company:     z.string().max(200).optional(),
  job_title:   z.string().max(200).optional(),
  lead_source: z.enum(DB_LEAD_SOURCES).optional(),
  tags:        z.string().optional(),
})

export type CsvImportRow = z.infer<typeof csvImportRowSchema>
