# Command: /implement-module

**Usage**: `/implement-module {ModuleName}`
**Example**: `/implement-module Contacts`

---

## What this command does

Reads the approved SPEC.md for a module and builds all application code in sequence:
Zod schema → server actions → page(s) → shared components (if needed).
Does NOT write tests — run `/generate-tests {ModuleName}` after this.

---

## Steps

### Step 0 — Pre-flight check
Verify these exist before writing any code:
- `src/app/(dashboard)/{module}/SPEC.md` — must exist
- `CLAUDE.md` — read it fully
- `src/lib/db/index.ts` — confirm DB abstraction is present

If SPEC.md is missing: stop and say "Run /create-spec {ModuleName} first."

### Step 1 — Read all context (load once, use throughout)
Read these files — do not re-read mid-implementation:
- `src/app/(dashboard)/{module}/SPEC.md`
- `.claude/skills/db-query/SKILL.md`
- `.claude/skills/server-action/SKILL.md`
- `.claude/skills/crud-form/SKILL.md`
- `.claude/skills/data-table/SKILL.md`
- `.claude/skills/error-handling/SKILL.md`
- `.claude/skills/stitch-design/SKILL.md`

Then fetch the Stitch screen for this module using the MCP `get_screen` tool.

### Step 2 — Zod validation schema
Read: SPEC.md sections "Zod Schemas"
Produce: `src/lib/validations/{module}.ts`

- One schema per form (create schema, update schema if different)
- Export inferred TypeScript types alongside schemas
- Every field from the SPEC must be in the schema

### Step 3 — Server actions
Read: SPEC.md section "Server Actions", `.claude/skills/server-action/SKILL.md`
Produce: `src/lib/actions/{module}.ts`

Follow exactly: `getAuthUser()` → Zod parse → `queryForOrg()` → revalidatePath
One function per AC that involves a mutation. One function per list/detail read.

### Step 4 — Check shared components
Read: `src/components/shared/` — list what exists
For each component the SPEC needs:
- If it exists in shared/ → import it, do not rebuild
- If it does NOT exist → build it in `src/components/shared/` (not in the module folder)

### Step 5 — Pages
Read: SPEC.md sections "Routes" and "Pages & Components", Stitch screen from Step 1
Produce pages in `src/app/(dashboard)/{module}/`:
- `page.tsx` — list page (Server Component, uses DataTable)
- `[id]/page.tsx` — detail page (Server Component)
- `new/page.tsx` — create form page (if in SPEC)
- `[id]/edit/page.tsx` — edit form page (if in SPEC)
- `error.tsx` — error boundary
- `loading.tsx` — skeleton loading state

Match Stitch screen layout exactly. Use shared components — never build new ones inline.

### Step 6 — TypeScript types
Produce: `src/types/crm.ts` (add new types, never overwrite existing)

### Step 7 — Summary
```
✅ Implementation complete: {ModuleName}

Files created:
  src/lib/validations/{module}.ts
  src/lib/actions/{module}.ts
  src/app/(dashboard)/{module}/page.tsx
  src/app/(dashboard)/{module}/[id]/page.tsx
  ... (list all)

Shared components added: {list any new ones}

Next step: Run /generate-tests {ModuleName}
```

---

## Rules

- Read skills in Step 1 only — never mid-implementation
- `queryForOrg()` from `@/lib/db` — never Supabase SDK in actions
- `getAuthUser()` is always line 1 of every server action
- Never build a component that already exists in `src/components/shared/`
- Never put business logic in a page component — pages only fetch + render
- Match Stitch layout exactly — never freestyle the UI
