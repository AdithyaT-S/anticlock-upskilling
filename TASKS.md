# FreshCRM — Master Task Tracker

Status: ⬜ Todo | 🔄 In Progress | ✅ Done | 🔒 Blocked

---

## Layer 1 — Foundation (Already Built)

| Task | Status | Files |
|------|--------|-------|
| DB abstraction layer (provider router) | ✅ | `src/lib/db/index.ts` |
| DB providers (pg, supabase, neon) | ✅ | `src/lib/db/providers/` |
| DB types interface | ✅ | `src/lib/db/types.ts` |
| Migration runner | ✅ | `scripts/migrate.ts` |
| CRM schema — extensions + helpers | ✅ | `supabase/migrations/000_extensions.sql` |
| CRM schema — all tables | ✅ | `supabase/migrations/001_tables.sql` |
| CRM schema — RLS policies | ✅ | `supabase/migrations/002_rls.sql` |
| Terraform — prod RDS | ✅ | `infra/terraform/` |
| CI pipeline | ✅ | `.github/workflows/ci.yml` |
| AI PR review | ✅ | `.github/workflows/ai-pr-review.yml` |
| Auto-merge | ✅ | `.github/workflows/auto-merge.yml` |
| Deploy pipeline | ✅ | `.github/workflows/deploy.yml` |
| Skill files (10 skills) | ✅ | `.claude/skills/` |
| Commands (4 commands) | ✅ | `.claude/commands/` |
| Agents (4 agents) | ✅ | `agents/` |
| BRD | ✅ | `docs/BRD.md` |
| Stitch designs (8 screens) | ✅ | `docs/Stitch Instructions.md` |

---

## Layer 2 — App Scaffold

| Task | Status | Notes |
|------|--------|-------|
| `create-next-app` | ⬜ | Run in terminal — Node.js required |
| Install npm dependencies | ⬜ | See TASKS.md bottom |
| shadcn/ui init + components | ⬜ | After npm install |
| `.env.local` setup | ⬜ | Copy from `.env.all-providers` |
| `src/lib/utils/cn.ts` | ⬜ | clsx + tailwind-merge helper |
| `src/lib/utils/format.ts` | ⬜ | date, currency, truncate helpers |
| `src/lib/utils/constants.ts` | ⬜ | deal stages, lead sources, enums |
| `src/types/crm.ts` | ⬜ | shared TypeScript types |
| `src/types/supabase.ts` | ⬜ | generated DB types |
| `src/tests/fixtures/auth.ts` | ⬜ | Playwright auth fixture |
| `src/tests/mocks/db.ts` | ⬜ | Vitest DB mock |
| `src/tests/helpers/factories.ts` | ⬜ | test data factories |

---

## Layer 3 — Module 1: Auth

**Spec:** ✅ `src/app/(auth)/SPEC.md`

| Layer | Task | Status |
|-------|------|--------|
| DB | `orgs` table + RLS | ✅ in migrations |
| DB | `users` table + RLS | ✅ in migrations |
| Backend | `src/lib/supabase/client.ts` — browser singleton | ⬜ |
| Backend | `src/lib/supabase/server.ts` — server client + `getAuthUser()` | ⬜ |
| Backend | `src/lib/supabase/middleware.ts` — session refresh | ⬜ |
| Backend | `src/lib/validations/auth.ts` — loginSchema + signupSchema | ⬜ |
| Backend | `src/lib/actions/auth.ts` — signIn, signUp, signOut | ⬜ |
| Backend | `src/middleware.ts` — route protection | ⬜ |
| Frontend | `src/app/(auth)/layout.tsx` — centered card layout | ⬜ |
| Frontend | `src/app/(auth)/login/page.tsx` | ⬜ |
| Frontend | `src/app/(auth)/signup/page.tsx` | ⬜ |
| Frontend | `src/app/(auth)/callback/route.ts` | ⬜ |
| Tests | Unit tests — schemas + actions | ⬜ |
| Tests | E2E tests — signup, login, logout, redirect | ⬜ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 4 — Module 2: Layout Shell

**Spec:** ⬜ `/create-spec Layout`

| Layer | Task | Status |
|-------|------|--------|
| Frontend | `src/app/(dashboard)/layout.tsx` — wraps sidebar + topbar | ⬜ |
| Frontend | `src/components/layout/Sidebar.tsx` — nav with icons | ⬜ |
| Frontend | `src/components/layout/TopBar.tsx` — search, notifications, avatar | ⬜ |
| Frontend | `src/components/layout/MobileNav.tsx` — responsive nav | ⬜ |
| Frontend | `src/app/(dashboard)/page.tsx` — dashboard home (placeholder) | ⬜ |
| Tests | Unit tests — Sidebar active states, nav links | ⬜ |
| Tests | E2E tests — navigation between modules | ⬜ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 5 — Module 3: Shared Components

**Spec:** ⬜ `/create-spec SharedComponents`
**Stitch screen:** Design System (`asset-stub-assets_0c364825aa6640ddb1dd32c3ab87ab81`)

| Layer | Task | Status |
|-------|------|--------|
| Frontend | `DataTable.tsx` — sort, pagination, search | ⬜ |
| Frontend | `CrudForm.tsx` — generic create/edit wrapper | ⬜ |
| Frontend | `ActivityTimeline.tsx` — calls, emails, notes, tasks | ⬜ |
| Frontend | `StatusBadge.tsx` — lead/deal/ticket status | ⬜ |
| Frontend | `PriorityDot.tsx` — ticket priority indicator | ⬜ |
| Frontend | `OwnerSelect.tsx` — assignee picker | ⬜ |
| Frontend | `TagInput.tsx` — multi-tag input | ⬜ |
| Frontend | `EmptyState.tsx` — empty list/page state | ⬜ |
| Frontend | `PageHeader.tsx` — title + action buttons bar | ⬜ |
| Frontend | `ConfirmDialog.tsx` — delete confirmation modal | ⬜ |
| Frontend | `SearchInput.tsx` — debounced search input | ⬜ |
| Tests | Unit tests — each component renders correctly | ⬜ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 6 — Module 4: Contacts

**Spec:** ⬜ `/create-spec Contacts`
**Stitch screens:** Contacts List + Contact Detail

| Layer | Task | Status |
|-------|------|--------|
| DB | `contacts` table + RLS | ✅ in migrations |
| Backend | `src/lib/validations/contact.ts` | ⬜ |
| Backend | `src/lib/actions/contacts.ts` — CRUD + CSV import | ⬜ |
| Frontend | `src/app/(dashboard)/contacts/page.tsx` — list + search | ⬜ |
| Frontend | `src/app/(dashboard)/contacts/columns.tsx` | ⬜ |
| Frontend | `src/app/(dashboard)/contacts/new/page.tsx` | ⬜ |
| Frontend | `src/app/(dashboard)/contacts/[id]/page.tsx` — detail + timeline | ⬜ |
| Frontend | `src/app/(dashboard)/contacts/[id]/edit/page.tsx` | ⬜ |
| Frontend | `error.tsx` + `loading.tsx` per route | ⬜ |
| Tests | Unit tests (schema + actions) | ⬜ |
| Tests | E2E tests (create, search, detail, edit, delete) | ⬜ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 7 — Module 5: Leads 🔒 After Contacts

**Spec:** 🔒 `/create-spec Leads` — after Contacts is built
**Stitch screen:** Leads List & Detail

| Layer | Task | Status |
|-------|------|--------|
| DB | `leads` table + RLS | ✅ in migrations |
| Backend | `src/lib/validations/lead.ts` | 🔒 |
| Backend | `src/lib/actions/leads.ts` — CRUD + convert to deal | 🔒 |
| Frontend | `src/app/(dashboard)/leads/page.tsx` + detail panel | 🔒 |
| Frontend | `src/app/(dashboard)/leads/columns.tsx` | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 8 — Module 6: Deals + Kanban 🔒 After Leads

**Spec:** 🔒 `/create-spec Deals` — after Leads is built
**Stitch screen:** Deals Pipeline

| Layer | Task | Status |
|-------|------|--------|
| DB | `pipelines`, `pipeline_stages`, `deals` + RLS | ✅ in migrations |
| Backend | `src/lib/validations/deal.ts` | 🔒 |
| Backend | `src/lib/actions/deals.ts` — CRUD + stage move | 🔒 |
| Backend | `src/lib/actions/pipelines.ts` — multi-pipeline support | 🔒 |
| Frontend | `src/app/(dashboard)/deals/page.tsx` — Kanban with pipeline selector | 🔒 |
| Frontend | `src/components/modules/deals/KanbanBoard.tsx` | 🔒 |
| Frontend | `src/components/modules/deals/KanbanColumn.tsx` | 🔒 |
| Frontend | `src/components/modules/deals/KanbanCard.tsx` | 🔒 |
| Frontend | `src/app/(dashboard)/deals/[id]/page.tsx` — deal detail | 🔒 |
| Tests | Unit + E2E (drag-drop, stage move, pipeline switch) | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 9 — Module 7: Tickets 🔒 After Contacts

**Spec:** 🔒 `/create-spec Tickets` — after Contacts is built
**Stitch screen:** Support Tickets

| Layer | Task | Status |
|-------|------|--------|
| DB | `tickets` table + RLS | ✅ in migrations |
| Backend | `src/lib/validations/ticket.ts` | 🔒 |
| Backend | `src/lib/actions/tickets.ts` — CRUD + status transitions | 🔒 |
| Frontend | `src/app/(dashboard)/tickets/page.tsx` — inbox split view | 🔒 |
| Frontend | `src/components/modules/tickets/TicketThread.tsx` | 🔒 |
| Frontend | `src/components/modules/tickets/ReplyComposer.tsx` | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 10 — Module 8: Activities 🔒 After Deals + Tickets

**Spec:** 🔒 `/create-spec Activities`

| Layer | Task | Status |
|-------|------|--------|
| DB | `activities` table + RLS | ✅ in migrations |
| Backend | `src/lib/actions/activities.ts` | 🔒 |
| Frontend | `src/app/(dashboard)/activities/page.tsx` | 🔒 |
| Frontend | `ActivityTimeline.tsx` (shared) — reused across modules | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 11 — Module 9: Email 🔒 After Tickets

**Spec:** 🔒 `/create-spec Email`

| Layer | Task | Status |
|-------|------|--------|
| DB | `email_threads`, `email_messages` + RLS | ✅ in migrations |
| Backend | `src/lib/actions/email.ts` — send via Resend | 🔒 |
| Backend | `src/app/api/webhooks/email/route.ts` — inbound webhook | 🔒 |
| Frontend | Email thread view in Contact detail | 🔒 |
| Frontend | Email thread view in Ticket detail | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 12 — Module 10: Reports 🔒 After All Modules

**Spec:** 🔒 `/create-spec Reports`
**Stitch screen:** Reports Dashboard

| Layer | Task | Status |
|-------|------|--------|
| Backend | `src/lib/actions/reports.ts` — aggregation queries | 🔒 |
| Frontend | `src/app/(dashboard)/reports/page.tsx` — 5 chart cards | 🔒 |
| Frontend | Chart components (recharts or similar) | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 13 — Module 11: Settings 🔒 After All Modules

**Spec:** 🔒 `/create-spec Settings`

| Layer | Task | Status |
|-------|------|--------|
| Backend | `src/lib/actions/settings.ts` — profile, team, pipeline config | 🔒 |
| Frontend | `src/app/(dashboard)/settings/page.tsx` — tabbed settings | 🔒 |
| Frontend | Team management, pipeline config, custom fields | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Dependencies to Install (after create-next-app)

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query zod react-hook-form @hookform/resolvers
npm install resend sonner lucide-react clsx tailwind-merge

npx shadcn@latest init
npx shadcn@latest add button input label form card badge table
npx shadcn@latest add dialog sheet dropdown-menu select tabs avatar
npx shadcn@latest add skeleton toast progress separator command popover

npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

npm install -D vitest @vitejs/plugin-react @testing-library/react
npm install -D @testing-library/user-event @testing-library/jest-dom
npm install -D @playwright/test
```
