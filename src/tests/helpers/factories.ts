import type { Contact, Lead, Deal, Ticket, Activity, User, Org } from '@/types/crm'

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()

export function makeOrg(overrides: Partial<Org> = {}): Org {
  return {
    id: id(),
    name: 'Test Org',
    plan: 'free',
    created_at: now(),
    ...overrides,
  }
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: id(),
    org_id: id(),
    email: 'user@example.com',
    full_name: 'Test User',
    role: 'admin',
    avatar_url: null,
    created_at: now(),
    ...overrides,
  }
}

export function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: id(),
    org_id: id(),
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane@example.com',
    phone: null,
    company: 'Acme Corp',
    job_title: null,
    lead_source: null,
    owner_id: null,
    tags: [],
    custom_fields: {},
    created_at: now(),
    updated_at: now(),
    ...overrides,
  }
}

export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: id(),
    org_id: id(),
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone: null,
    company: 'Prospect Inc',
    source: 'Website',
    status: 'New',
    owner_id: null,
    converted_contact_id: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  }
}

export function makeDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: id(),
    org_id: id(),
    title: 'Test Deal',
    value: 10000,
    currency: 'INR',
    stage: 'Prospecting',
    pipeline_id: id(),
    contact_id: null,
    owner_id: null,
    expected_close_date: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  }
}

export function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: id(),
    org_id: id(),
    subject: 'Test Ticket',
    description: null,
    status: 'Open',
    priority: 'Medium',
    contact_id: null,
    assignee_id: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  }
}

export function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: id(),
    org_id: id(),
    type: 'note',
    title: 'Test Note',
    description: null,
    contact_id: null,
    lead_id: null,
    deal_id: null,
    ticket_id: null,
    user_id: id(),
    occurred_at: now(),
    created_at: now(),
    ...overrides,
  }
}
