import { z } from 'zod'

export const dealSchema = z.object({
  name:        z.string().min(1, 'Deal name is required').max(200),
  pipeline_id: z.string().uuid('Invalid pipeline'),
  stage_id:    z.string().uuid('Invalid stage'),
  value:       z.number().min(0, 'Value must be ≥ 0'),
  currency:    z.string().length(3, 'Currency must be a 3-letter code'),
  close_date:  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional()
    .nullable(),
  contact_id:  z.string().uuid().optional().nullable(),
  owner_id:    z.string().uuid().optional().nullable(),
})

export type DealInput = z.infer<typeof dealSchema>

export const moveStageSchema = z.object({
  deal_id:  z.string().uuid('Invalid deal'),
  stage_id: z.string().uuid('Invalid stage'),
})

export type MoveStageInput = z.infer<typeof moveStageSchema>

export const closeDealSchema = z
  .object({
    deal_id:     z.string().uuid('Invalid deal'),
    status:      z.enum(['won', 'lost']),
    lost_reason: z.string().max(500).optional().nullable(),
  })
  .refine(
    (d) => d.status !== 'lost' || (d.lost_reason && d.lost_reason.length > 0),
    { message: 'Lost reason is required when closing as lost', path: ['lost_reason'] }
  )

export type CloseDealInput = z.infer<typeof closeDealSchema>

export const pipelineSchema = z.object({
  name:       z.string().min(1, 'Pipeline name is required').max(100),
  is_default: z.boolean(),
})

export type PipelineInput = z.infer<typeof pipelineSchema>
