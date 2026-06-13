export const DEAL_STAGES = [
  'Prospecting',
  'Qualification',
  'Proposal',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Unqualified',
  'Converted',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Event',
  'Other',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const TICKET_STATUSES = [
  'Open',
  'In Progress',
  'Waiting',
  'Resolved',
  'Closed',
] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const

export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const ACTIVITY_TYPES = [
  'call',
  'email',
  'note',
  'meeting',
  'task',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const USER_ROLES = ['admin', 'member', 'viewer'] as const

export type UserRole = (typeof USER_ROLES)[number]

export const FREE_PLAN_LIMITS = {
  contacts: 500,
  users: 3,
  deals: 100,
  emailsPerMonth: 500,
} as const

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Contacts', href: '/contacts', icon: 'Users' },
  { label: 'Leads', href: '/leads', icon: 'TrendingUp' },
  { label: 'Deals', href: '/deals', icon: 'Briefcase' },
  { label: 'Tickets', href: '/tickets', icon: 'Ticket' },
  { label: 'Activities', href: '/activities', icon: 'Activity' },
  { label: 'Email', href: '/email', icon: 'Mail' },
  { label: 'Reports', href: '/reports', icon: 'BarChart2' },
  { label: 'Settings', href: '/settings', icon: 'Settings' },
] as const
