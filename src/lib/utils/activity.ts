import type { Activity, ActivityType } from '@/types/crm'

export interface DbActivityRow {
  id: string
  type: string
  body: string | null
  due_at: string | null
  done_at: string | null
  owner_id: string | null
  created_at: string
}

export const ACTIVITY_TITLES: Record<string, string> = {
  call:    'Call logged',
  email:   'Email sent',
  note:    'Note added',
  task:    'Task',
  meeting: 'Meeting',
}

/** Map a raw DB activity row to the shared Activity type. Pass the entity IDs for the entity this activity belongs to. */
export function mapToActivity(
  row: DbActivityRow,
  orgId: string,
  entity: {
    contact_id?: string | null
    lead_id?: string | null
    deal_id?: string | null
    ticket_id?: string | null
  }
): Activity {
  return {
    id:          row.id,
    org_id:      orgId,
    type:        row.type as ActivityType,
    title:       ACTIVITY_TITLES[row.type] ?? row.type,
    description: row.body ?? null,
    contact_id:  entity.contact_id ?? null,
    lead_id:     entity.lead_id ?? null,
    deal_id:     entity.deal_id ?? null,
    ticket_id:   entity.ticket_id ?? null,
    user_id:     row.owner_id ?? '',
    occurred_at: row.created_at,
    created_at:  row.created_at,
  }
}
