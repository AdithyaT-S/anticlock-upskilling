# FreshCRM — Claude Code Master Context

Read this file fully before doing anything in this project.
Then read `TASKS.md` to understand current build progress and what's next.

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
| Stitch Designs | ✅ Done | `docs/Stitch Instructions.md` — 8 screens ready |
| CLAUDE.md | ✅ Done | This file |
| Skill files | ✅ Done | `src/lib/db/index.ts` |
| Commands | ✅ Done | `.claude/commands/` — 4 commands |
| Agents | ✅ Done | `agents/` — 4 agents |
| App scaffold | ⬜ Todo | `npx create-next-app` not yet run |
| Module build loop | ⬜ Todo | One module at a time: spec → build → test → PR |

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
9. **Stitch before UI** — always fetch the Stitch screen via MCP before writing any page or component

---

## Commands — Use These For Every Module

| Command | When to use |
|---------|------------|
| `/create-spec {Module}` | Before building — generates SPEC.md from Stitch + BRD |
| `/implement-module {Module}` | After spec is reviewed — builds validation + actions + pages |
| `/generate-tests {Module}` | After implementation — writes unit + E2E tests from SPEC ACs |
| `/review-module {Module}` | After tests — checks code vs SPEC, reports issues |
| `/commit` | After review passes — conventional commit message |
| `/create-pr` | After commit — opens GitHub PR with full description |
| `/pr-review <N>` | Automated — AI reviews PR inline |
| `/fix-pr-comments` | After AI review — auto-fixes open threads |

Command definitions: `.claude/commands/`

---

## Agents — Loaded by Commands Automatically

| Agent | File | Role |
|-------|------|------|
| Spec Writer | `agents/spec-writer.md` | Writes SPEC.md — user stories, ACs, permissions |
| UI Builder | `agents/ui-builder.md` | Builds pages + components matching Stitch screen |
| Actions Builder | `agents/actions-builder.md` | Builds Zod schemas + server actions |
| Test Writer | `agents/test-writer.md` | Writes Vitest + Playwright tests from ACs |

---

## Module Build Workflow (One Module At A Time)

```
/create-spec {Module}
    ↓ review SPEC.md
/implement-module {Module}
    ↓
/generate-tests {Module}
    ↓
/review-module {Module}
    ↓ fix any issues
/commit
    ↓
/create-pr
    ↓ AI review + human approval → auto-merge
```

**Never spec all modules upfront.** Each module's spec depends on what was built before it.
Spec + build one module at a time in this order:

1. Auth
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

## Skill Files — Read Before Writing Each Pattern

| Skill | When to read |
|-------|-------------|
| `.claude/skills/db-provider/SKILL.md` | Any DB query or server action |
| `.claude/skills/db-query/SKILL.md` | DB reads in server components |
| `.claude/skills/server-action/SKILL.md` | Any mutation (create/update/delete) |
| `.claude/skills/crud-form/SKILL.md` | Any create or edit form |
| `.claude/skills/data-table/SKILL.md` | Any list/table page |
| `.claude/skills/test-unit/SKILL.md` | Writing Vitest unit tests |
| `.claude/skills/test-e2e/SKILL.md` | Writing Playwright E2E tests |
| `.claude/skills/rls-policy/SKILL.md` | Any new DB table or migration |
| `.claude/skills/error-handling/SKILL.md` | Error boundaries and action return types |
| `.claude/skills/stitch-design/SKILL.md` | Fetch Stitch screen before building any UI |

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

## Design Reference

Stitch project: "Indigo B2B CRM Dashboard" (ID: `10851584638320860726`)
MCP config: `.mcp.json` → `https://stitch.googleapis.com/mcp`
Screen IDs: see `docs/Stitch Instructions.md` and `.claude/skills/stitch-design/SKILL.md`
All screens use: Indigo #4F46E5, Inter font, white surfaces, gray-50 background

---

## Key Decisions (from BRD)

- **Multiple pipelines**: Supported in v1 — pipeline selector dropdown on Deals page
- **CSV import**: Server-side parsing
- **Free plan limits**: 500 contacts, 3 users, 100 deals, 500 emails/month
- **DB provider**: Docker local (dev) → Supabase Cloud / AWS RDS (production)
- **Region**: ap-south-1

---

## MCP Servers (project-level)

Config: `.mcp.json`
- `stitch` → `https://stitch.googleapis.com/mcp` (design assets — API key in .mcp.json, gitignored)

---

## DevOps

CI runs on every PR: typecheck → lint → unit tests (80% coverage) → build → E2E
Auto-merge: squash when ≥1 human approval + all checks green
