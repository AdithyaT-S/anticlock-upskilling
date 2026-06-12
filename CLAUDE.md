# FreshCRM — Claude Code Master Context

Read this file fully before doing anything in this project.

---

## What This Project Is

**FreshCRM** — a production-grade, multi-tenant B2B SaaS CRM (Freshworks-style).
Built with Next.js 14 App Router + Supabase + TypeScript + Tailwind + shadcn/ui.
The DB abstraction layer, schema, migrations, CI/CD, and DevOps automation are already built.
We are now building the full application on top of that foundation.

---

## Current Build Status

| Phase | Status | File |
|-------|--------|------|
| BRD | ✅ Done | `docs/BRD.md` |
| Figma / Stitch Designs | 🔄 In Progress | `docs/Stitch Instructions.md` |
| CLAUDE.md | ✅ Done | This file |
| Skill files (.claude/skills/) | ✅ Done | See Phase 4 below |
| SPEC.md per module | ⬜ Todo | Created before each module |
| Module build loop | ⬜ Todo | Starts after skills done |

---

## Stack — Locked, Do Not Change

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + Auth + Realtime) |
| DB Abstraction | `src/lib/db/index.ts` — the ONLY import for DB access |
| Validation | Zod — on every form and every server action |
| Data fetching | Server Components (default) + TanStack Query (client) |
| Email | Resend (send) + webhook (receive) |
| Testing | Vitest (unit) + Playwright (E2E) |
| Deploy | Vercel + Supabase Cloud |
| Region | ap-south-1 (Mumbai) |

---

## Rules You Must Never Break

1. **Auth first** — every server action starts with `const user = await getAuthUser()` before anything else
2. **Zod before DB** — always validate input with Zod before any database call
3. **No SDK leakage** — never import `pg`, `@supabase/supabase-js`, `@neondatabase/serverless` in app code — always use `src/lib/db/index.ts`
4. **No duplicate components** — before building any component, check `src/components/shared/` first
5. **No inline DB calls in components** — all queries go through `src/lib/actions/`
6. **Read the skill file first** — before writing any new pattern, read the relevant `.claude/skills/` file
7. **SPEC.md before code** — every module needs a `SPEC.md` before its code starts
8. **Tests in same session** — unit + E2E tests are written in the same session as the feature

---

## Folder Structure — Build To This Exactly

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── contacts/   SPEC.md + page.tsx + [id]/page.tsx + __tests__/
│       ├── leads/      (same pattern)
│       ├── deals/      (same pattern)
│       ├── tickets/    (same pattern)
│       ├── activities/ (same pattern)
│       ├── reports/    (same pattern)
│       └── settings/   (same pattern)
├── components/
│   ├── ui/             ← shadcn auto-generated, never edit
│   ├── shared/         ← reusable components, built ONCE
│   │   ├── DataTable.tsx
│   │   ├── CrudForm.tsx
│   │   ├── ActivityTimeline.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── PriorityDot.tsx
│   │   ├── OwnerSelect.tsx
│   │   ├── TagInput.tsx
│   │   ├── EmptyState.tsx
│   │   ├── PageHeader.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── SearchInput.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── MobileNav.tsx
│   └── modules/
│       ├── deals/      KanbanBoard, KanbanColumn, KanbanCard
│       └── tickets/    TicketThread, ReplyComposer
├── lib/
│   ├── db/             ← ALREADY BUILT — provider abstraction
│   ├── supabase/       client.ts, server.ts, middleware.ts
│   ├── validations/    contact.ts, lead.ts, deal.ts, ticket.ts (Zod schemas)
│   ├── actions/        contacts.ts, leads.ts, deals.ts, tickets.ts
│   └── utils/          cn.ts, format.ts, constants.ts
└── types/
    ├── crm.ts
    └── supabase.ts
```

---

## Skill Files — Read Before Writing Each Pattern

| Skill | When to read |
|-------|-------------|
| `.claude/skills/db-provider/SKILL.md` | Any DB query or server action |
| `.claude/skills/supabase-query.md` | DB reads in server components |
| `.claude/skills/server-action.md` | Any mutation (create/update/delete) |
| `.claude/skills/crud-form.md` | Any create or edit form |
| `.claude/skills/data-table.md` | Any list/table page |
| `.claude/skills/test-unit.md` | Writing Vitest tests |
| `.claude/skills/test-e2e.md` | Writing Playwright tests |
| `.claude/skills/rls-policy.md` | Any new DB table or migration |
| `.claude/skills/error-handling.md` | Error boundaries and action return types |

---

## Module Build Order

Build strictly in this order — each depends on the previous:

1. Auth (login, signup, middleware, getAuthUser helper)
2. Layout shell (Sidebar, TopBar, dashboard layout)
3. Shared components (all of src/components/shared/)
4. Contacts
5. Leads
6. Deals + Kanban (multiple pipelines — pipeline selector on Kanban page)
7. Tickets
8. Activities
9. Email (Resend send + inbound webhook)
10. Reports
11. Settings

---

## Per-Module Build Sequence

For each module above, always follow this exact sequence:
1. Read this file (CLAUDE.md)
2. Read the module SPEC.md (`src/app/(dashboard)/<module>/SPEC.md`)
3. Read relevant skill files
4. Check `src/components/shared/` — reuse what exists
5. Generate `src/lib/validations/<module>.ts` (Zod schema)
6. Generate `src/lib/actions/<module>.ts` (server actions)
7. Generate pages referencing Stitch/Figma design
8. Generate unit tests (Vitest)
9. Generate E2E tests (Playwright)
10. Run `npx vitest run && npx playwright test` — all must pass

---

## Design Reference

Stitch project: "Indigo B2B CRM Dashboard" (ID: `10851584638320860726`)
Screen IDs: see `docs/Stitch Instructions.md`
All screens use: Indigo #4F46E5, Inter font, white surfaces, gray-50 background

---

## Key Decisions (from BRD)

- **Multiple pipelines**: Supported in v1 — pipeline selector dropdown on Deals page
- **CSV import**: Server-side parsing
- **Free plan limits**: 500 contacts, 3 users, 100 deals, 500 emails/month
- **DB provider**: Supabase Cloud (production), Docker local (dev)
- **Region**: ap-south-1

---

## MCP Servers (project-level)

Config: `.mcp.json`
- `stitch` → `https://stitch.googleapis.com/mcp` (design assets)

---

## DevOps Workflow

```
/commit           → stage + conventional commit message
/create-pr        → push + open GitHub PR
/pr-review <N>    → AI reviews PR, posts inline comments
/fix-pr-comments  → auto-fix all open review threads
```

CI runs on every PR: typecheck → lint → unit tests (80% coverage) → build → E2E
Auto-merge: squash when ≥1 human approval + all checks green
