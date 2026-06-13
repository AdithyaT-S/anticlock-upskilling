# Command: /review-module

**Usage**: `/review-module {ModuleName}`
**Example**: `/review-module Contacts`

---

## What this command does

Checks the implemented code against the SPEC.md. Verifies every AC is covered by a test,
every rule from CLAUDE.md is followed, and the Stitch design is matched. Reports pass/fail.

---

## Steps

### Step 1 — Read context
Read:
- `specs/{module}/SPEC.md`
- `CLAUDE.md` (rules section)
- `src/lib/validations/{module}.ts`
- `src/lib/actions/{module}.ts`
- `src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts`
- `src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts`
- All page files in `src/app/(dashboard)/{module}/`

### Step 2 — Check CLAUDE.md rules compliance

| Rule | Check |
|------|-------|
| Auth first | Every server action calls `getAuthUser()` before anything else |
| Zod before DB | Every mutation validates with Zod before calling `queryForOrg()` |
| No SDK leakage | No imports of `pg`, `@supabase/supabase-js`, `@neondatabase/serverless` |
| No duplicate components | No components built that exist in `src/components/shared/` |
| No inline DB in components | Pages and components import from `src/lib/actions/` only |
| Soft delete | Delete actions set `deleted_at`, never `DELETE FROM` |

### Step 3 — Check SPEC coverage

For each AC in the SPEC:
- [ ] AC has a corresponding unit test
- [ ] AC has a corresponding E2E test (for user-facing flows)
- [ ] AC is implemented in the actions/pages

For each business rule (BR-XX):
- [ ] Rule is enforced in the server action
- [ ] Rule has a unit test

### Step 4 — Check design compliance
- Fetch Stitch screen using MCP `get_screen`
- Compare layout to implemented page
- Check: sidebar present, topbar present, correct indigo color, DataTable used for lists

### Step 5 — Report

```
## Review Report: {ModuleName}

### CLAUDE.md Rules
✅ Auth guard: all actions start with getAuthUser()
✅ Zod validation: present before all DB calls
❌ ISSUE: contacts/page.tsx imports @supabase/supabase-js directly

### SPEC Coverage
✅ AC-01: covered by unit test contacts.unit.test.ts:42
✅ AC-02: covered by E2E test contacts.e2e.ts:18
❌ AC-05: no test found

### Design Compliance
✅ DataTable used for contacts list
✅ Indigo primary color matches Stitch screen
❌ Search bar missing — present in Stitch screen, not in implementation

### Verdict
❌ CHANGES REQUIRED — fix 3 issues above, then re-run /review-module {ModuleName}
```

If all checks pass:
```
### Verdict
✅ APPROVED — run /create-pr to open a pull request
```

### On approval — update TASKS.md
- Mark PR column as ⬜ (ready to PR) for this module
- Check if any 🔒 blocked modules are now unblocked — if so, change their Spec column from 🔒 to ⬜
  Example: Contacts approved → unlock Leads Spec ⬜ and Tickets Spec ⬜

---

## Rules

- Report every issue found — do not skip minor ones
- Do not auto-fix issues — report only, let the developer fix then re-review
- A module is only approved when ALL checks pass
- After approval, next step is always `/create-pr`
