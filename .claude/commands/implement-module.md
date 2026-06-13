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

### Step 2 — Zod validation schema
Produce: `src/lib/validations/{module}.ts`
- One schema per form (create + update schemas if different)
- Export inferred TypeScript types alongside each schema
- Every SPEC field must appear in the schema

### Step 3 — Server actions
Produce: `src/lib/actions/{module}.ts`
- Pattern: `getAuthUser()` → Zod parse → `queryForOrg()` → `revalidatePath()`
- One function per mutation AC; one per list/detail read

### Step 4 — Shared components
List `src/components/shared/`. For each component the SPEC needs:
- Exists → import it, never rebuild
- Missing → build it in `src/components/shared/` (never in the module folder)

### Step 5 — Pages
Produce in `src/app/(dashboard)/{module}/` (only pages listed in SPEC):
- `page.tsx` — list page (Server Component)
- `[id]/page.tsx` — detail page
- `new/page.tsx` — create form (if in SPEC)
- `[id]/edit/page.tsx` — edit form (if in SPEC)
- `error.tsx` + `loading.tsx`

Match the Stitch screen layout exactly.

### Step 6 — TypeScript types
Add new types to `src/types/crm.ts` — never overwrite existing entries.

### Step 7 — Update TASKS.md
Mark Build column ✅ Done for this module.

### Step 8 — Summary
```
✅ {ModuleName} implemented

Files created: <list>
Shared components added: <list or none>

Next: /generate-tests {ModuleName}
```

---

## Rules

- `getAuthUser()` is always line 1 of every server action
- `queryForOrg()` from `@/lib/db` — never provider SDKs
- Zod parse before any DB call — no exceptions
- Never rebuild a component that exists in `src/components/shared/`
- Pages only fetch + render — no business logic inline
- Match Stitch layout exactly — never freestyle UI
