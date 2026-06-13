# Command: /generate-tests

**Usage**: `/generate-tests {ModuleName}`
**Example**: `/generate-tests Contacts`

Reads SPEC.md ACs and implemented code, produces Vitest unit tests + Playwright E2E tests.
Every AC gets a test. No AC is untested.

---

## Steps

### Step 0 — Pre-flight
Verify these exist:
- `specs/{module}/SPEC.md`
- `src/lib/validations/{module}.ts`
- `src/lib/actions/{module}.ts`

If actions or validations are missing: stop and say "Run /implement-module {ModuleName} first."

### Step 1 — Read context (once)
- `specs/{module}/SPEC.md` — ACs + test cases sections
- `src/lib/validations/{module}.ts`
- `src/lib/actions/{module}.ts`
- `.claude/skills/test-unit/SKILL.md`
- `.claude/skills/test-e2e/SKILL.md`

### Step 2 — Unit tests
Produce: `src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts`

Per action, write: schema valid, schema invalid, auth guard, success path, error path, one test per BR-XX.

Mock setup (required at top of every unit test file):
```typescript
vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

Tag each test with its AC for auditability:
```typescript
// AC-03: Given a duplicate email, when create is called, then return error
it('returns error for duplicate email', async () => { ... })
```

### Step 3 — E2E tests
Produce: `src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts`

One test per critical flow: create, list/search, detail, edit, delete.
Always use the auth fixture — never log in manually:
```typescript
import { test, expect } from '@/tests/fixtures/auth'
```

### Step 4 — Update TASKS.md
Mark Tests column ✅ Done for this module.

### Step 5 — Summary
```
✅ Tests generated: {ModuleName}
Unit: src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts — {N} cases, {N} ACs
E2E:  src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts — {N} flows
Run: npx vitest run && npx playwright test
```

---

## Rules

- Every AC must have at least one test — no exceptions
- Unit tests mock `@/lib/db` and `@/lib/auth` — never hit real DB
- E2E tests use auth fixture — never call `/login` manually
- Soft delete: assert SQL has `deleted_at`, not `DELETE FROM`
- Mentally trace through each test — it must logically pass before writing
