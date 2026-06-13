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
| CRM schema — extensions + helpers | ✅ | `db/migrations/000_extensions.sql` |
| CRM schema — all tables | ✅ | `db/migrations/001_tables.sql` |
| CRM schema — RLS policies | ✅ | `db/migrations/002_rls.sql` |
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
| Next.js 14 scaffold (manual — folder was non-empty) | ✅ | `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts` |
| Install npm dependencies | ✅ | All deps + shadcn peer deps + `@tanstack/react-table` installed |
| shadcn/ui init + components | ✅ | 20 components in `src/components/ui/` |
| `.env.local` setup | ✅ | Local/Docker config |
| `docker-compose.yml` | ✅ | Postgres 16 + Redis 7 |
| `src/lib/utils/cn.ts` | ✅ | clsx + tailwind-merge helper |
| `src/lib/utils/format.ts` | ✅ | date, currency, truncate helpers |
| `src/lib/utils/constants.ts` | ✅ | deal stages, lead sources, enums |
| `src/types/crm.ts` | ✅ | shared TypeScript types |
| `src/types/db.ts` | ✅ | generated DB types stub |
| `src/tests/fixtures/auth.ts` | ✅ | Playwright auth fixture |
| `src/tests/mocks/db.ts` | ✅ | Vitest DB mock |
| `src/tests/helpers/factories.ts` | ✅ | test data factories |
| TypeScript clean build | ✅ | `tsc --noEmit` passes with zero errors |

---

## Layer 3 — Module 1: Auth ✅ MERGED

**Spec:** ✅ `specs/auth/SPEC.md`
**Review:** ✅ `review-reports/auth.md`

| Layer | Task | Status |
|-------|------|--------|
| DB | `orgs` table + RLS | ✅ in migrations |
| DB | `users` table + RLS | ✅ in migrations |
| Backend | `src/lib/auth.ts` — NextAuth config + `getAuthUser()` | ✅ |
| Backend | `src/app/api/auth/[...nextauth]/route.ts` | ✅ |
| Backend | `src/lib/validations/auth.ts` — loginSchema + signupSchema | ✅ |
| Backend | `src/lib/actions/auth.ts` — signUp server action | ✅ |
| Backend | `src/middleware.ts` — route protection via NextAuth | ✅ |
| Frontend | `src/app/(auth)/layout.tsx` — centered card layout | ✅ |
| Frontend | `src/app/(auth)/login/page.tsx` | ✅ |
| Frontend | `src/app/(auth)/signup/page.tsx` | ✅ |
| Tests | Unit tests — schemas + actions | ✅ |
| Tests | E2E tests — signup, login, logout, redirect | ✅ |
| DevOps | `/commit` + `/create-pr` + merged | ✅ |

---

## Layer 4 — Module 2: Layout Shell ✅ MERGED

**Spec:** ✅ `specs/layout/SPEC.md`
**Review:** ✅ `review-reports/layout.md`

| Layer | Task | Status |
|-------|------|--------|
| Frontend | `src/app/(dashboard)/layout.tsx` — wraps sidebar + topbar | ✅ |
| Frontend | `src/components/layout/Sidebar.tsx` — nav with icons | ✅ |
| Frontend | `src/components/layout/TopBar.tsx` — search, notifications, avatar | ✅ |
| Frontend | `src/components/layout/MobileNav.tsx` — responsive nav | ✅ |
| Frontend | `src/app/(dashboard)/page.tsx` — dashboard home (placeholder) | ✅ |
| Tests | Unit tests — Sidebar active states, nav links | ✅ |
| Tests | E2E tests — navigation between modules | ✅ |
| DevOps | `/commit` + `/create-pr` + merged | ✅ |

---

## Layer 5 — Module 3: Shared Components ✅ MERGED

**Spec:** ✅ `specs/shared-components/SPEC.md`
**Review:** ✅ `review-reports/shared-components.md` — APPROVED 2026-06-13
**Branch:** `feat/shared-components` — merged via PR #4 + #5

| Layer | Task | Status |
|-------|------|--------|
| Frontend | `DataTable.tsx` — TanStack Table, sort, pagination, skeleton | ✅ |
| Frontend | `CrudForm.tsx` — react-hook-form shell, pending spinner | ✅ |
| Frontend | `ActivityTimeline.tsx` — icon map, connector line, skeleton | ✅ |
| Frontend | `StatusBadge.tsx` — colour-mapped pill, unknown fallback | ✅ |
| Frontend | `PriorityDot.tsx` — coloured dot + optional label | ✅ |
| Frontend | `OwnerSelect.tsx` — Command/Popover combobox, Unassign | ✅ |
| Frontend | `TagInput.tsx` — chip input, Enter/comma/Backspace | ✅ |
| Frontend | `EmptyState.tsx` — centered icon + title + CTA | ✅ |
| Frontend | `PageHeader.tsx` — flex header, title left, actions right | ✅ |
| Frontend | `ConfirmDialog.tsx` — destructive Dialog, disabled while pending | ✅ |
| Frontend | `SearchInput.tsx` — debounced, clear button, Search icon | ✅ |
| Tests | 67 unit tests — 23/23 ACs + all BRs covered | ✅ |
| DevOps | `/commit` + `/create-pr` | ✅ |

---

## Layer 6 — Module 4: Contacts 🔄 In Progress

**Spec:** ✅ `specs/contacts/SPEC.md`
**Review:** ✅ `review-reports/contacts.md` — APPROVED 2026-06-13
**Stitch screens:** CRM Contacts List (`c744ca79a3b14fb49ca284b552f1c7f0`) + CRM Contact Detail (`b2ac0c027cd748b19c899e117c670912`)
**Branch:** `feat/contacts`

| Layer | Task | Status |
|-------|------|--------|
| DB | `contacts` table + RLS | ✅ in migrations |
| Backend | `src/lib/validations/contact.ts` — contactSchema | ✅ |
| Backend | `src/lib/actions/contacts.ts` — CRUD + CSV import | ✅ |
| Frontend | `src/app/(dashboard)/contacts/page.tsx` — list + search | ✅ |
| Frontend | `src/app/(dashboard)/contacts/columns.tsx` | ✅ |
| Frontend | `src/app/(dashboard)/contacts/new/page.tsx` | ✅ |
| Frontend | `src/app/(dashboard)/contacts/[id]/page.tsx` — detail + timeline | ✅ |
| Frontend | `src/app/(dashboard)/contacts/[id]/edit/page.tsx` | ✅ |
| Frontend | `error.tsx` + `loading.tsx` per route | ✅ |
| Tests | Unit tests — schema + actions | ✅ |
| Tests | E2E tests — create, search, detail, edit, delete | ✅ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 7 — Module 5: Leads 🔄 In Progress

**Spec:** ✅ `specs/leads/SPEC.md`
**Review:** ✅ `review-reports/leads.md` — APPROVED 2026-06-13
**Stitch screen:** CRM Leads List & Detail (`219d7f6e5ccb4e80864c3ec66dc0743a`)
**Branch:** `feat/leads`

| Layer | Task | Status |
|-------|------|--------|
| DB | `leads` table + RLS | ✅ in migrations |
| Backend | `src/lib/validations/lead.ts` | ✅ |
| Backend | `src/lib/actions/leads.ts` — CRUD + convert to deal | ✅ |
| Frontend | `src/app/(dashboard)/leads/page.tsx` + detail panel | ✅ |
| Frontend | `src/app/(dashboard)/leads/columns.tsx` | ✅ |
| Tests | Unit (45/45) + E2E (10 flows) | ✅ |
| DevOps | `/commit` + `/create-pr` | ⬜ |

---

## Layer 8 — Module 6: Deals + Kanban 🔒 After Leads

**Spec:** 🔒 Run `/create-spec Deals` after Leads is merged
**Stitch screen:** CRM Deals Pipeline (`49d332b5a2dd4dc4a424a77f4fa75cfe`)

| Layer | Task | Status |
|-------|------|--------|
| DB | `pipelines`, `pipeline_stages`, `deals` + RLS | ✅ in migrations |
| Backend | `src/lib/validations/deal.ts` | 🔒 |
| Backend | `src/lib/actions/deals.ts` — CRUD + stage move | 🔒 |
| Backend | `src/lib/actions/pipelines.ts` — multi-pipeline support | 🔒 |
| Frontend | `src/app/(dashboard)/deals/page.tsx` — Kanban + pipeline selector | 🔒 |
| Frontend | `src/components/modules/deals/KanbanBoard.tsx` | 🔒 |
| Frontend | `src/components/modules/deals/KanbanColumn.tsx` | 🔒 |
| Frontend | `src/components/modules/deals/KanbanCard.tsx` | 🔒 |
| Frontend | `src/app/(dashboard)/deals/[id]/page.tsx` — deal detail | 🔒 |
| Tests | Unit + E2E (drag-drop, stage move, pipeline switch) | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 9 — Module 7: Tickets ⬜ After Contacts

**Spec:** ⬜ Run `/create-spec Tickets` after Contacts is merged
**Stitch screen:** CRM Support Tickets (`fbfaee3f845f4b8596df70cce1f169ae`)

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

**Spec:** 🔒 Run `/create-spec Activities` after Deals + Tickets are merged

| Layer | Task | Status |
|-------|------|--------|
| DB | `activities` table + RLS | ✅ in migrations |
| Frontend | `ActivityTimeline.tsx` (shared component) | ✅ built in Layer 5 |
| Backend | `src/lib/actions/activities.ts` | 🔒 |
| Frontend | `src/app/(dashboard)/activities/page.tsx` | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 11 — Module 9: Email 🔒 After Tickets

**Spec:** 🔒 Run `/create-spec Email` after Tickets is merged

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

**Spec:** 🔒 Run `/create-spec Reports` after all modules are merged
**Stitch screen:** CRM Reports Dashboard (`0a01fa82d8544dd99680ec001f253fb3`)

| Layer | Task | Status |
|-------|------|--------|
| Backend | `src/lib/actions/reports.ts` — aggregation queries | 🔒 |
| Frontend | `src/app/(dashboard)/reports/page.tsx` — 5 chart cards | 🔒 |
| Frontend | Chart components (recharts) | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Layer 13 — Module 11: Settings 🔒 After All Modules

**Spec:** 🔒 Run `/create-spec Settings` after all modules are merged

| Layer | Task | Status |
|-------|------|--------|
| Backend | `src/lib/actions/settings.ts` — profile, team, pipeline config | 🔒 |
| Frontend | `src/app/(dashboard)/settings/page.tsx` — tabbed settings | 🔒 |
| Frontend | Team management, pipeline config, custom fields | 🔒 |
| Tests | Unit + E2E | 🔒 |
| DevOps | `/commit` + `/create-pr` | 🔒 |

---

## Build Order Summary

| # | Module | Branch | Status |
|---|--------|--------|--------|
| 1 | Auth | `feat/auth` | ✅ Merged to main |
| 2 | Layout Shell | `feat/layout` | ✅ Merged to main |
| 3 | Shared Components | `feat/shared-components` | ✅ Merged to main |
| 4 | Contacts | `feat/contacts` | 🔄 In Progress — implementation done, needs tests + PR |
| 5 | Leads | `feat/leads` | 🔒 After Contacts |
| 6 | Deals + Kanban | `feat/deals` | 🔒 After Leads |
| 7 | Tickets | `feat/tickets` | 🔒 After Contacts |
| 8 | Activities | `feat/activities` | 🔒 After Deals + Tickets |
| 9 | Email | `feat/email` | 🔒 After Tickets |
| 10 | Reports | `feat/reports` | 🔒 After all modules |
| 11 | Settings | `feat/settings` | 🔒 After all modules |
