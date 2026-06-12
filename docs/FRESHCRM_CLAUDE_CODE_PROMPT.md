# FreshCRM — Complete Claude Code Implementation Prompt
# Paste this into your Claude Code session to kick off the entire project.
# Read every section before starting. Do not skip any step.

---

## 0. BEFORE YOU WRITE ANY CODE — READ THIS

You are building FreshCRM: a production-grade, Freshworks-style CRM.
Your job is NOT to write fast code. Your job is to write CORRECT, REUSABLE,
TESTED code that another developer can maintain without ever asking you a question.

Rules you must never break:
- Read the relevant skill file BEFORE writing any new pattern
- Every module needs a SPEC.md before code starts
- Tests are written in the SAME session as the feature
- NEVER duplicate a component that exists in src/components/shared/
- NEVER write inline Supabase calls inside components or pages
- NEVER skip Zod validation before a DB mutation
- NEVER write a server action without an auth check first
- If a shared component doesn't exist yet, build it ONCE, add it to shared/, done

---

## 1. STACK DECISION (do not change this)

Frontend:   Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui
Database:   Supabase (Postgres + Auth + Realtime + Storage)
Validation: Zod (all forms and API inputs)
Data:       TanStack Query (client-side), Server Components (default)
Email:      Resend (transactional) + webhooks for inbound
Testing:    Vitest (unit + integration) + Playwright (E2E)
Deploy:     Vercel + Supabase cloud
Design:     Google Stitch → Figma → Figma MCP → Claude Code

---

## 2. DESIGN PIPELINE SETUP (do this first, before any code)

### Step 1 — Generate designs in Google Stitch
Go to stitch.withgoogle.com and use these prompts one at a time:

PROMPT 1 — Dashboard:
"CRM dashboard for a B2B sales team. Left sidebar nav with icons for
Dashboard, Contacts, Leads, Deals, Tickets, Reports, Settings.
Top bar with search, notifications, avatar. Main area shows:
4 KPI cards (Total Contacts, Open Deals, Revenue This Month, Tickets),
a deals pipeline Kanban preview (5 columns), recent activity feed.
Color: Indigo primary (#4F46E5), white surfaces, gray-50 background.
Font: Inter. Style: clean SaaS, similar to Freshworks or Linear."

PROMPT 2 — Contacts list:
"CRM contacts list page. Table with columns: Avatar+Name, Email, Company,
Owner, Lead Source, Last Activity, Tags. Row hover shows quick actions.
Top toolbar: search input, filter dropdown, import CSV button, New Contact
button (indigo). Pagination at bottom. Same sidebar and topbar as dashboard."

PROMPT 3 — Contact detail:
"CRM contact detail page. Left column (60%): activity timeline showing
calls, emails, notes, tasks with timestamps and icons. Right column (40%):
contact info card (name, email, phone, company, owner), deals associated,
tags, custom fields. Tab bar: Activity | Details | Emails | Files."

PROMPT 4 — Deals Kanban:
"CRM deals pipeline. Full-width Kanban board with 5 columns: New, Qualified,
Proposal, Negotiation, Closed Won. Each card shows deal name, company,
value badge, owner avatar, close date. Drag handle visible on hover.
Column header shows deal count and total value. Add deal button per column."

PROMPT 5 — Tickets inbox:
"CRM support tickets page. Left panel: list of tickets with status badge
(Open/Pending/Resolved), priority dot, subject, requester, assignee, SLA timer.
Right panel: ticket detail with email thread view, reply composer, sidebar
with ticket metadata. Filter by status/priority/assignee at top."

Export ALL screens from Stitch → "Export to Figma"

### Step 2 — Polish in Figma
- Apply your design system: set color variables, typography (Inter), spacing tokens
- Ensure component names match code: Button, DataTable, StatusBadge, KanbanCard
- Enable Dev Mode (Figma menu → Preferences → Enable Dev Mode MCP Server)

### Step 3 — Connect Figma MCP to Claude Code
Run this in terminal inside the project folder:

  claude plugin install figma@claude-plugins-official

Then add the MCP server:

  # Remote version (recommended):
  claude mcp add figma

  # OR desktop/local version:
  claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp

Verify connection:
  /mcp
  # You should see: figma or figma-desktop listed as connected

### Step 4 — Reference Figma in every frontend prompt
When building any page, always include:
  "Implement this screen using the Figma design: [PASTE FIGMA FRAME LINK]
   Match layout, spacing, colors, and component names exactly.
   Use the shared components from src/components/shared/."

---

## 3. PROJECT SETUP — RUN THESE COMMANDS

```bash
# Create project
npx create-next-app@latest freshcrm \
  --typescript --tailwind --app --src-dir --import-alias "@/*"
cd freshcrm

# Install core deps
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query zod react-hook-form @hookform/resolvers
npm install resend
npm install sonner lucide-react clsx tailwind-merge

# shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input label form card badge table
npx shadcn@latest add dialog sheet dropdown-menu select tabs avatar
npx shadcn@latest add command popover calendar date-picker
npx shadcn@latest add skeleton toast progress separator

# Testing
npm install -D vitest @vitejs/plugin-react @testing-library/react
npm install -D @testing-library/user-event @testing-library/jest-dom
npm install -D playwright @playwright/test

# DnD for Kanban
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Supabase CLI
npx supabase init
```

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
RESEND_API_KEY=your-resend-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. FULL FILE STRUCTURE — BUILD TO THIS EXACTLY

```
freshcrm/
├── CLAUDE.md                          ← master spec (this file)
├── .claude/
│   └── skills/                        ← READ BEFORE WRITING EACH PATTERN
│       ├── supabase-query.md
│       ├── crud-form.md
│       ├── data-table.md
│       ├── server-action.md
│       ├── api-route.md
│       ├── test-unit.md
│       ├── test-e2e.md
│       ├── rls-policy.md
│       └── error-handling.md
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             ← sidebar + topbar shell
│   │   │   ├── page.tsx               ← dashboard home
│   │   │   ├── contacts/
│   │   │   │   ├── SPEC.md
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── [id]/edit/page.tsx
│   │   │   │   └── __tests__/
│   │   │   │       ├── contacts.unit.test.ts
│   │   │   │       └── contacts.e2e.ts
│   │   │   ├── leads/      (same pattern)
│   │   │   ├── deals/      (same pattern)
│   │   │   ├── tickets/    (same pattern)
│   │   │   ├── activities/ (same pattern)
│   │   │   ├── reports/    (same pattern)
│   │   │   └── settings/   (same pattern)
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── email/route.ts
│   │       └── v1/
│   │           ├── contacts/route.ts
│   │           ├── leads/route.ts
│   │           └── deals/route.ts
│   │
│   ├── components/
│   │   ├── ui/                        ← shadcn auto-generated, do not edit
│   │   ├── shared/                    ← YOUR reusable components, built ONCE
│   │   │   ├── DataTable.tsx          ← all list pages use this
│   │   │   ├── CrudForm.tsx           ← all create/edit forms use this
│   │   │   ├── ActivityTimeline.tsx   ← contacts + deals + tickets
│   │   │   ├── StatusBadge.tsx        ← leads, deals, tickets status
│   │   │   ├── PriorityDot.tsx        ← tickets priority indicator
│   │   │   ├── OwnerSelect.tsx        ← assignee picker, used everywhere
│   │   │   ├── TagInput.tsx           ← contacts + leads tagging
│   │   │   ├── EmptyState.tsx         ← consistent empty screens
│   │   │   ├── PageHeader.tsx         ← title + actions bar, all pages
│   │   │   ├── ConfirmDialog.tsx      ← delete confirmations
│   │   │   └── SearchInput.tsx        ← debounced search, all list pages
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   └── MobileNav.tsx
│   │   └── modules/
│   │       ├── deals/
│   │       │   ├── KanbanBoard.tsx
│   │       │   ├── KanbanColumn.tsx
│   │       │   └── KanbanCard.tsx
│   │       └── tickets/
│   │           ├── TicketThread.tsx
│   │           └── ReplyComposer.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              ← browser client (singleton)
│   │   │   ├── server.ts              ← server client (per-request)
│   │   │   └── middleware.ts          ← session refresh middleware
│   │   ├── validations/               ← Zod schemas, one per entity
│   │   │   ├── contact.ts
│   │   │   ├── lead.ts
│   │   │   ├── deal.ts
│   │   │   └── ticket.ts
│   │   ├── actions/                   ← server actions, one file per module
│   │   │   ├── contacts.ts
│   │   │   ├── leads.ts
│   │   │   ├── deals.ts
│   │   │   └── tickets.ts
│   │   └── utils/
│   │       ├── cn.ts                  ← clsx + tailwind-merge helper
│   │       ├── format.ts              ← date, currency, truncate helpers
│   │       └── constants.ts           ← deal stages, lead sources, etc.
│   │
│   ├── types/
│   │   ├── crm.ts                     ← all shared TypeScript types
│   │   └── supabase.ts                ← generated DB types
│   │
│   └── tests/
│       ├── fixtures/
│       │   └── auth.ts                ← Playwright auth fixture
│       ├── mocks/
│       │   └── supabase.ts            ← Vitest Supabase mock
│       └── helpers/
│           └── factories.ts           ← test data factories
│
└── supabase/
    └── migrations/
        ├── 001_orgs_users.sql
        ├── 002_contacts.sql
        ├── 003_leads.sql
        ├── 004_deals.sql
        ├── 005_tickets.sql
        ├── 006_activities.sql
        └── 007_rls_policies.sql
```

---

## 5. SKILL FILES — CREATE THESE IN .claude/skills/

### .claude/skills/supabase-query.md
```
# Skill: supabase-query

Use this pattern for ALL database reads in server components and server actions.

## Pattern
import { createServerClient } from '@/lib/supabase/server'

export async function getContacts(orgId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, company, owner_id, created_at')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`DB error: ${error.message}`)
  return data
}

## Rules
- Always scope to org_id (RLS handles this but be explicit)
- Always filter deleted_at IS NULL for soft-deleteable records
- Always type the return with the generated Supabase types
- Never call supabase directly inside a React component
```

### .claude/skills/server-action.md
```
# Skill: server-action

Use this exact pattern for ALL server actions (mutations).

## Pattern
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { contactSchema } from '@/lib/validations/contact'
import { getAuthUser } from '@/lib/supabase/server'

export async function createContact(formData: unknown) {
  // 1. Auth check — ALWAYS first
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  // 2. Validate — ALWAYS before DB
  const parsed = contactSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.flatten() }

  // 3. Mutate
  const supabase = createServerClient()
  const { error } = await supabase
    .from('contacts')
    .insert({ ...parsed.data, org_id: user.org_id, owner_id: user.id })

  if (error) return { error: { message: error.message } }

  // 4. Revalidate
  revalidatePath('/contacts')
  return { success: true }
}

## Rules
- Auth check is line 1, no exceptions
- Zod parse before any DB call
- Return { error } or { success: true } — never throw to client
- Always revalidatePath after mutation
```

### .claude/skills/crud-form.md
```
# Skill: crud-form

Pattern for ALL create/edit forms using react-hook-form + Zod + server actions.

## Pattern
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, ContactInput } from '@/lib/validations/contact'
import { createContact } from '@/lib/actions/contacts'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ContactForm({ defaultValues }: { defaultValues?: Partial<ContactInput> }) {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultValues ?? { first_name: '', last_name: '', email: '' },
  })

  async function onSubmit(data: ContactInput) {
    const result = await createContact(data)
    if (result.error) {
      toast.error('Something went wrong')
      return
    }
    toast.success('Contact created')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="first_name" render={({ field }) => (
          <FormItem>
            <FormLabel>First name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}

## Rules
- Always use zodResolver — never manual validation
- Always use Form/FormField components from shadcn
- Always show toast on success and error
- Disable submit button while isSubmitting
```

### .claude/skills/data-table.md
```
# Skill: data-table

The DataTable in src/components/shared/DataTable.tsx is the ONLY table component.
Never create another table. Use this for ALL list pages.

## Usage
import { DataTable } from '@/components/shared/DataTable'
import { columns } from './columns'

<DataTable
  columns={columns}
  data={contacts}
  searchKey="email"
  isLoading={false}
/>

## Column definition pattern (in a columns.tsx file per module)
import { ColumnDef } from '@tanstack/react-table'
import { Contact } from '@/types/crm'
import { StatusBadge } from '@/components/shared/StatusBadge'

export const columns: ColumnDef<Contact>[] = [
  { accessorKey: 'first_name', header: 'Name',
    cell: ({ row }) => <span className="font-medium">{row.original.first_name} {row.original.last_name}</span> },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'status', header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
]

## Rules
- DataTable handles sort, pagination, search internally
- Pass data as array, columns as ColumnDef[]
- Never build a custom <table> in any page
```

### .claude/skills/test-unit.md
```
# Skill: test-unit

Pattern for ALL Vitest unit tests. Co-locate in __tests__/ next to the module.

## Pattern
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { contactSchema } from '@/lib/validations/contact'
import { createContact } from '@/lib/actions/contacts'
import { mockSupabase } from '@/tests/mocks/supabase'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: () => mockSupabase }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('Contact validation', () => {
  it('accepts valid contact', () => {
    const result = contactSchema.safeParse({
      first_name: 'Priya', last_name: 'Sharma', email: 'priya@example.com'
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = contactSchema.safeParse({ first_name: 'Priya' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })
})

describe('createContact action', () => {
  beforeEach(() => { mockSupabase.reset() })

  it('returns error when not authenticated', async () => {
    mockSupabase.auth.mockUserNull()
    const result = await createContact({ first_name: 'Priya', email: 'p@x.com' })
    expect(result.error).toBeDefined()
  })

  it('inserts contact and returns success', async () => {
    mockSupabase.auth.mockUser({ id: 'u1', org_id: 'org1' })
    mockSupabase.from('contacts').insert.mockResolvedValue({ error: null })
    const result = await createContact({ first_name: 'Priya', last_name: 'S', email: 'p@x.com' })
    expect(result.success).toBe(true)
  })
})

## Rules
- Mock Supabase — never hit the real DB in unit tests
- Test: validation passes, validation fails, auth guard, success path, error path
- Min 5 test cases per module (schema + action coverage)
```

### .claude/skills/test-e2e.md
```
# Skill: test-e2e

Pattern for Playwright E2E tests. One file per critical user flow.

## Pattern
import { test, expect } from '@/tests/fixtures/auth'

test.describe('Contacts', () => {
  test('create a new contact', async ({ page, authenticatedOrg }) => {
    await page.goto('/contacts/new')

    await page.fill('[name="first_name"]', 'Priya')
    await page.fill('[name="last_name"]', 'Sharma')
    await page.fill('[name="email"]', 'priya@testcrm.com')
    await page.selectOption('[name="lead_source"]', 'website')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/)
    await expect(page.getByText('Priya Sharma')).toBeVisible()
    await expect(page.getByText('Contact created')).toBeVisible()
  })

  test('search filters the contact list', async ({ page }) => {
    await page.goto('/contacts')
    await page.fill('[placeholder="Search contacts..."]', 'priya')
    await expect(page.getByText('Priya Sharma')).toBeVisible()
    await expect(page.getByText('John Doe')).not.toBeVisible()
  })
})

## Rules
- Use the auth fixture — never manually log in inside tests
- Test the full flow a real user would take
- Assert both URL changes and visible text
- One describe block per module, one test per user flow
- Critical flows: create, list/search, detail view, edit, delete
```

### .claude/skills/rls-policy.md
```
# Skill: rls-policy

Every table MUST have RLS enabled and policies scoped to org_id.

## Pattern
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (org_id = (auth.jwt() ->> 'org_id')::uuid);

## Rules
- Every table gets all 4 policies (select, insert, update, delete)
- Always scope to org_id — never user_id alone
- Soft-deleteable tables filter deleted_at in application layer, not RLS
- Service role key bypasses RLS — only use for webhooks and migrations
```

---

## 6. DATABASE SCHEMA — GENERATE THESE MIGRATION FILES

Tell Claude Code: "Create supabase/migrations/ files for all these tables
following the rls-policy skill. Generate TypeScript types to src/types/supabase.ts"

Tables:
- orgs (id, name, slug, created_at)
- users (id, org_id, email, full_name, avatar_url, role: admin|member)
- contacts (id, org_id, first_name, last_name, email, phone, company,
            job_title, lead_source, owner_id, tags[], deleted_at, timestamps)
- leads (id, org_id, contact_id, status: new|contacted|qualified|lost,
         score int, source, owner_id, converted_at, timestamps)
- pipelines (id, org_id, name, is_default)
- pipeline_stages (id, pipeline_id, name, position, probability)
- deals (id, org_id, name, contact_id, pipeline_id, stage_id, value,
         currency, close_date, owner_id, status: open|won|lost, timestamps)
- tickets (id, org_id, subject, contact_id, status: open|pending|resolved|closed,
           priority: low|medium|high|urgent, assignee_id, sla_due_at, timestamps)
- activities (id, org_id, type: call|email|note|task|meeting,
              contact_id, deal_id, ticket_id, body, due_at, done_at,
              owner_id, timestamps)
- email_threads (id, org_id, contact_id, subject, provider_thread_id, timestamps)
- email_messages (id, thread_id, from_addr, to_addr[], body_html, sent_at, direction: in|out)

---

## 7. MODULE BUILD ORDER — FOLLOW THIS SEQUENCE

For each module, run this sequence in Claude Code:
1. Read SPEC.md for this module
2. Read relevant skill files
3. Check src/components/shared/ — import what exists, don't rebuild
4. Generate DB migration if not done
5. Generate Zod schema in src/lib/validations/
6. Generate server actions in src/lib/actions/
7. Generate page(s) using Figma MCP design reference
8. Generate unit tests
9. Generate E2E tests
10. Run: npx vitest run && npx playwright test — all must pass

BUILD ORDER:
[ ] 1. Auth (login, signup, middleware, org creation)
[ ] 2. Layout shell (sidebar, topbar, route groups)
[ ] 3. Shared components (DataTable, CrudForm, StatusBadge, etc.)
[ ] 4. Contacts (foundation — everything links here)
[ ] 5. Leads (linked to contacts)
[ ] 6. Deals + Kanban (linked to contacts + pipeline)
[ ] 7. Tickets (support inbox)
[ ] 8. Activities (timeline — cross-module)
[ ] 9. Email (Resend send + webhook receive)
[ ] 10. Reports (reads from all modules)
[ ] 11. Settings (users, roles, pipeline config, custom fields)

---

## 8. FIGMA MCP USAGE IN PROMPTS

When implementing any frontend screen, ALWAYS use this format:

```
Read .claude/skills/data-table.md and .claude/skills/crud-form.md first.

Implement the Contacts list page at src/app/(dashboard)/contacts/page.tsx.
Reference Figma design: [PASTE YOUR FIGMA FRAME URL HERE]

Requirements:
- Match the Figma layout exactly: search bar top-left, "New Contact" button top-right
- Use the shared DataTable component from src/components/shared/DataTable.tsx
- Use the columns definition pattern from the data-table skill
- Fetch contacts via server component using getContacts() from lib/actions/contacts.ts
- Columns: Avatar+Name, Email, Company, Owner, Lead Source, Last Activity, Tags
- Row click navigates to /contacts/[id]
- Do NOT create any new components that exist in shared/
```

---

## 9. CI/CD — GITHUB ACTIONS

Tell Claude Code: "Generate .github/workflows/ci.yml that runs on every PR:
- npx vitest run --coverage (fail if coverage < 80%)
- npx playwright test (fail on any failure)
- npx tsc --noEmit (type check)
- npx next build (build check)"

---

## 10. FIRST PROMPT TO RUN IN CLAUDE CODE

Paste this verbatim into your Claude Code terminal to start:

---
Read CLAUDE.md fully before doing anything.

Start the build in this order:

1. Create all skill files in .claude/skills/ using the content in section 5 of CLAUDE.md

2. Generate supabase/migrations/ for all tables in section 6.
   Follow the rls-policy skill for every table.
   Then run: npx supabase db push

3. Build the auth module:
   - src/app/(auth)/login/page.tsx — email + password form
   - src/app/(auth)/signup/page.tsx — name + email + password + org name
   - src/lib/supabase/middleware.ts — session refresh
   - src/lib/supabase/server.ts — server client + getAuthUser helper
   - src/lib/supabase/client.ts — browser singleton

4. Build the dashboard layout shell:
   - src/app/(dashboard)/layout.tsx
   - src/components/layout/Sidebar.tsx (nav items: Dashboard, Contacts, Leads,
     Deals, Tickets, Reports, Settings — with lucide icons)
   - src/components/layout/TopBar.tsx (search, notifications, avatar)

5. Build ALL shared components in src/components/shared/ — full implementations,
   not stubs. These must be production-ready before any module page is built.

6. Generate unit tests for auth and shared components.

After each step, confirm what was built and what's next before continuing.
---
