import type {
  DealStage,
  LeadStatus,
  LeadSource,
  TicketStatus,
  TicketPriority,
  ActivityType,
  UserRole,
} from '@/lib/utils/constants'

export type { DealStage, LeadStatus, LeadSource, TicketStatus, TicketPriority, ActivityType, UserRole }

export interface Org {
  id: string
  name: string
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface Contact {
  id: string
  org_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  owner_id: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  org_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  source: LeadSource | null
  status: LeadStatus
  owner_id: string | null
  converted_contact_id: string | null
  created_at: string
  updated_at: string
}

export interface Pipeline {
  id: string
  org_id: string
  name: string
  is_default: boolean
  created_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  position: number
  created_at: string
}

export interface Deal {
  id: string
  org_id: string
  title: string
  value: number | null
  currency: string
  stage: DealStage
  pipeline_id: string
  contact_id: string | null
  owner_id: string | null
  expected_close_date: string | null
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  org_id: string
  subject: string
  description: string | null
  status: TicketStatus
  priority: TicketPriority
  contact_id: string | null
  assignee_id: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  org_id: string
  type: ActivityType
  title: string
  description: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  ticket_id: string | null
  user_id: string
  occurred_at: string
  created_at: string
}

export interface EmailThread {
  id: string
  org_id: string
  subject: string
  contact_id: string | null
  created_at: string
}

export interface EmailMessage {
  id: string
  thread_id: string
  from_email: string
  to_email: string
  body: string
  direction: 'inbound' | 'outbound'
  sent_at: string
}

// Action return type — all server actions return this shape
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
