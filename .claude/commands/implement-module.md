---
model: sonnet
---

# Command: /implement-module

**Usage**: `/implement-module {ModuleName}`
**Example**: `/implement-module Contacts`

Builds all application code for a module: Zod schema → server actions → pages → shared components.
Does NOT write tests — run `/generate-tests {ModuleName}` after this.

---

## Steps

### Step 0 — Pre-flight
- Confirm branch is `feat/{module-kebab}`, not `main`. If on main, branch off first.
- Read `TASKS.md` — confirm module is not 🔒 blocked; mark Build as 🔄 In Progress.
- Verify `specs/{module}/SPEC.md` exists. If missing: stop and say "Run /create-spec {ModuleName} first."
- Verify `src/lib/db/index.ts` exists.

### Step 1 — Load context (read once, never re-read)

Always read:
- `specs/{module}/SPEC.md`
- `.claude/skills/server-action/SKILL.md`
- `.claude/skills/db-query/SKILL.md`
- `.claude/skills/error-handling/SKILL.md`

Read only if SPEC has create/edit forms:
- `.claude/skills/crud-form/SKILL.md`

Read only if SPEC has a list/table page:
- `.claude/skills/data-table/SKILL.md`

Read only if SPEC has UI pages (almost always):
- `.claude/skills/stitch-design/SKILL.md`
- Then fetch the Stitch screen via MCP `get_screen` for this module.

### Step 2 — Audit existing shared utilities (BEFORE writing any code)

Check what already exists — never redefine:

**`src/lib/utils/format.ts`** exports:
- `getInitials(firstName, lastName?)` — avatar initials from first+last or full-name string
- `formatDate(date)` — `15 Jan 2026`
- `formatDateTime(date)` — `15 Jan 2026, 09:30 AM`
- `formatCurrency(amount, currency?)` — full currency format
- `formatCurrencyShort(amount)` — compact: `₹75K`, `$1.2M`
- `formatRelativeTime(date)` — `5m ago`, `2h ago`, `3d ago`
- `scoreColorClass(score)` — color class only; add font weight separately at call site
- `truncate(str, maxLength)` — string truncation

**`src/lib/utils/activity.ts`** exports:
- `DbActivityRow` — interface for raw DB activity rows
- `ACTIVITY_TITLES` — `{ call: 'Call logged', email: 'Email sent', ... }`
- `mapToActivity(row, orgId, entity)` — maps DB row → `Activity` type

**`src/lib/actions/contacts.ts`** exports (canonical type sources):
- `OrgMember` — `{ id, full_name, email, avatar_url }`
- `ContactOption` — `{ id, first_name, last_name, email, company }`

**`src/components/shared/`** — check every component here before building anything new:
`DataTable`, `CrudForm`, `ActivityTimeline`, `StatusBadge`, `PriorityDot`, `OwnerSelect`,
`TagInput`, `EmptyState`, `PageHeader`, `ConfirmDialog`, `SearchInput`

### Step 3 — Zod validation schema
Produce: `src/lib/validations/{module}.ts`
- One schema per form (create + update schemas if different)
- Export inferred TypeScript types alongside each schema
- Every SPEC field must appear in the schema
- Use `z.string().uuid()` for foreign-key ID fields

### Step 4 — Server actions
Produce: `src/lib/actions/{module}.ts`
- Pattern: `getAuthUser()` → Zod parse → `queryForOrg()` → `revalidatePath()`
- One function per mutation AC; one per list/detail read
- Import `OrgMember`, `ContactOption` from `@/lib/actions/contacts` — never redefine
- Import `DbActivityRow`, `mapToActivity` from `@/lib/utils/activity` — never redefine
- Re-export imported types if consumers of this action file need them:
  ```typescript
  import type { OrgMember, ContactOption } from '@/lib/actions/contacts'
  export type { OrgMember, ContactOption }
  ```
- **Parameter numbering in paginated queries**: do NOT increment `idx` between a count query and the main query — both start from the same base params array (see server-action SKILL.md).

### Step 5 — Shared components
List `src/components/shared/`. For each component the SPEC needs:
- Exists → import it, never rebuild
- Missing → build it in `src/components/shared/` (never in the module folder)

### Step 6 — Pages
Produce in `src/app/(dashboard)/{module}/` (only pages listed in SPEC):
- `page.tsx` — list page (Server Component)
- `[id]/page.tsx` — detail page
- `new/page.tsx` — create form (if in SPEC)
- `[id]/edit/page.tsx` — edit form (if in SPEC)
- `error.tsx` + `loading.tsx`

Match the Stitch screen layout exactly.

### Step 7 — TypeScript types
Add new types to `src/types/crm.ts` — never overwrite existing entries.

### Step 8 — Update TASKS.md
Mark Build column ✅ Done for this module.

### Step 9 — Summary
```
✅ {ModuleName} implemented

Files created: <list>
Shared utils used: <list from format.ts / activity.ts>
Shared components used: <list or none>
New shared components added: <list or none>

Next: /generate-tests {ModuleName}
```

---

## Rules

- `getAuthUser()` is always line 1 of every server action
- `queryForOrg()` from `@/lib/db` — never provider SDKs
- Zod parse before any DB call — no exceptions
- Never rebuild a component that exists in `src/components/shared/`
- Never define `getInitials`, `formatCurrency`, `formatDate`, `formatRelativeTime`, `scoreColorClass` locally — use `@/lib/utils/format`
- Never define `DbActivityRow`, `ACTIVITY_TITLES`, `mapToActivity` locally — use `@/lib/utils/activity`
- Never define `OrgMember` or `ContactOption` — import from `@/lib/actions/contacts`
- Pages only fetch + render — no business logic inline
- Match Stitch layout exactly — never freestyle UI
