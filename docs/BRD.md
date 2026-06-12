# Business Requirements Document (BRD)
# FreshCRM — v1.0

**Document Status:** Draft  
**Date:** 2026-06-12  
**Owner:** Adithya Sekar  

---

## 1. Problem Statement

Small and mid-sized B2B sales and support teams rely on bloated, expensive CRM tools (Salesforce, HubSpot) that require months of setup and vendor lock-in to a single cloud database. Teams need a production-grade CRM that:

- Works out of the box with minimal setup
- Can run on any Postgres provider (local, Supabase, AWS RDS, Neon, Railway) without changing application code
- Gives sales teams a clean pipeline view, support teams a structured inbox, and managers meaningful reports
- Is fully multi-tenant with strict org-level data isolation from day one

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|---------------|
| G1 | Sales reps can manage contacts and move deals through a pipeline | 100% of deals trackable end-to-end in Kanban |
| G2 | Support teams can handle tickets with SLA visibility | Ticket creation to resolution fully tracked |
| G3 | Managers get actionable reports without custom queries | 5 core report views available on launch |
| G4 | No data leakage between tenants | RLS enforced on every table, verified by tests |
| G5 | Developer can switch DB provider in < 5 minutes | Single env var change, zero code change |

---

## 3. Target Users & Personas

### Persona 1 — Sales Rep (Primary)
- Manages 50–200 contacts
- Needs quick contact lookup, lead status tracking, deal movement
- Lives in the Contacts list and Deals Kanban daily
- Logs calls, emails, and notes on contact activity timeline

### Persona 2 — Sales Manager
- Reviews pipeline health, deal values, win/loss rates
- Needs Reports dashboard and pipeline stage summary
- Creates pipelines, assigns owners, manages team members in Settings

### Persona 3 — Support Agent
- Handles inbound tickets from contacts
- Needs inbox view with priority + SLA visibility
- Replies via email thread view inside the ticket

### Persona 4 — Org Admin
- Onboards team, sets roles (admin / member / viewer)
- Configures pipelines, custom fields, lead sources
- Manages billing plan (free / pro / enterprise)

---

## 4. Features In Scope — v1

### 4.1 Authentication & Org Management
- Email + password signup with org creation
- Login / logout / session refresh
- Role-based access: admin, member, viewer
- Invite team members by email

### 4.2 Contacts
- Create, view, edit, soft-delete contacts
- Fields: first/last name, email, phone, company, job title, lead source, owner, tags, custom fields (JSONB)
- Full-text search (trigram) on name + email
- Filter by owner, lead source, tags
- Import contacts via CSV
- Activity timeline on contact detail (calls, emails, notes, tasks, meetings)

### 4.3 Leads
- Convert a contact to a lead
- Lead status: New → Contacted → Qualified → Lost
- Lead score (integer)
- Lead source tracking
- Owner assignment
- Mark as converted (links to a deal)

### 4.4 Deals & Pipeline
- Multiple pipelines per org (pipeline selector dropdown on Kanban page, defaults to org default)
- Kanban board per pipeline
- Stages: New, Qualified, Proposal, Negotiation, Closed Won / Closed Lost (configurable per pipeline)
- Deal fields: name, value, currency, close date, linked contact, owner
- Drag-and-drop cards between stages
- Deal detail with activity timeline
- Win probability per stage
- Pipeline management in Settings (add, rename, reorder stages per pipeline)

### 4.5 Tickets (Support Inbox)
- Ticket list with status (Open / Pending / Resolved / Closed), priority (Low / Medium / High / Urgent)
- SLA due date timer visible in list
- Ticket detail: email thread view + reply composer
- Assignee management
- Link ticket to a contact

### 4.6 Activities
- Unified activity timeline across contacts, deals, and tickets
- Types: Call, Email, Note, Task, Meeting
- Due date and completion tracking for tasks
- Owner-based filtering

### 4.7 Email
- Send transactional emails via Resend
- Inbound email webhook: receive replies and attach to correct thread
- Email thread view inside contact detail and ticket detail

### 4.8 Reports
- Total contacts over time
- Open deals by stage (pipeline funnel)
- Revenue this month / this quarter
- Tickets by status and priority
- Activities completed by owner

### 4.9 Settings
- Profile settings (name, avatar)
- Team management (invite, role change, remove)
- Pipeline configuration (add/rename/reorder stages)
- Custom fields management (per entity type)
- Billing plan display

---

## 5. Out of Scope — v1

- Mobile native app (web responsive only)
- Phone/VoIP integration
- Live chat widget
- AI-assisted deal scoring or lead recommendations
- Third-party integrations (Slack, Zapier, calendar sync)
- White-labelling
- ~~Multi-pipeline per org~~ — included in v1 (pipeline selector on Deals page)

---

## 6. Technical Constraints

| Constraint | Detail |
|------------|--------|
| Multi-tenancy | Every table scoped to `org_id`. RLS via `current_org_id()` helper on all providers |
| Auth | Supabase Auth (JWT). `org_id` embedded in JWT claims |
| DB portability | App works on local Docker, Supabase Cloud, AWS RDS, Neon, Railway — env var switch only |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui — no changes allowed |
| Validation | Zod on every form and every server action — no exceptions |
| Testing | 80% unit test coverage gate. Playwright E2E for all critical flows |
| No SDK leakage | Provider SDKs (pg, supabase-js, neon) never imported in application code |

---

## 7. Non-Functional Requirements

| Area | Requirement |
|------|------------|
| Performance | Contact list loads < 1s for up to 10,000 records |
| Security | RLS on every table. Service role key only in migrations and webhooks |
| Availability | Vercel + Supabase Cloud SLA (99.9% target) |
| Scalability | Multi-AZ AWS RDS for production. Auto-scaling storage |
| Accessibility | shadcn/ui components (ARIA-compliant). Keyboard navigation on all pages |

---

## 8. Architecture Summary

```
Browser (Next.js App Router)
  → Server Components (data fetch via lib/actions/)
  → Server Actions (auth → Zod → queryForOrg())
  → src/lib/db/index.ts (provider router)
  → Provider: Supabase | pg | Neon (selected by DB_PROVIDER env var)
  → Postgres (RLS enforced via current_org_id())
```

---

## 9. Module Build Order

| # | Module | Depends On |
|---|--------|-----------|
| 1 | Auth (login, signup, middleware) | — |
| 2 | Layout shell (sidebar, topbar) | Auth |
| 3 | Shared components (DataTable, CrudForm, etc.) | Layout |
| 4 | Contacts | Shared components |
| 5 | Leads | Contacts |
| 6 | Deals + Kanban | Contacts, Leads |
| 7 | Tickets | Contacts |
| 8 | Activities | Contacts, Deals, Tickets |
| 9 | Email | Contacts, Tickets |
| 10 | Reports | All modules |
| 11 | Settings | Auth, all modules |

---

## 10. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| Q1 | Support multiple pipelines per org in v1 or defer? | Adithya | **Resolved** — Include in v1, pipeline selector on Deals page |
| Q2 | CSV import — client-side parse or server-side? | Adithya | **Resolved** — Server-side |
| Q3 | Which Supabase region for production? | Adithya | **Resolved** — ap-south-1 |
| Q4 | Free plan limits | Adithya | **Resolved** — 500 contacts, 3 users, 100 deals, 500 emails/month |
