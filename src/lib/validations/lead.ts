import { z } from 'zod'
import { DB_LEAD_SOURCES } from '@/lib/validations/contact'

export const DB_LEAD_STATUSES = ['new', 'contacted', 'qualified', 'lost'] as const
export type DbLeadStatus = (typeof DB_LEAD_STATUSES)[number]

export const LEAD_STATUS_LABELS: Record<DbLeadStatus, string> = {
  new:        'New',
  contacted:  'Contacted',
  qualified:  'Qualified',
  lost:       'Lost',
}

export const leadSchema = z.object({
  contact_id: z.string().uuid('Contact is required'),
  status:     z.enum(DB_LEAD_STATUSES),
  score:      z.number()
                .int('Score must be a whole number')
                .min(0, 'Score must be between 0 and 100')
                .max(100, 'Score must be between 0 and 100'),
  source:     z.enum(DB_LEAD_SOURCES).optional(),
  owner_id:   z.string().uuid().optional(),
  notes:      z.string().max(5000).optional(),
})

export type LeadInput = z.infer<typeof leadSchema>

export const leadUpdateSchema = leadSchema.omit({ contact_id: true })
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>

/** Fields shared between create and edit — used by shared form field components */
export type SharedLeadFields = Omit<LeadInput, 'contact_id'>

export const leadSearchSchema = z.object({
  status:   z.enum(DB_LEAD_STATUSES).optional(),
  owner_id: z.string().uuid().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
})
export type LeadSearchParams = z.infer<typeof leadSearchSchema>

export const leadStatusUpdateSchema = z.object({
  status: z.enum(DB_LEAD_STATUSES),
})
