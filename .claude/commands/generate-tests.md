# Command: /generate-tests

**Usage**: `/generate-tests {ModuleName}`
**Example**: `/generate-tests Contacts`

---

## What this command does

Reads the SPEC.md acceptance criteria and the implemented code, then generates
unit tests (Vitest) and E2E tests (Playwright). Every AC gets a test. No AC is untested.

---

## Steps

### Step 0 — Pre-flight
Verify these exist:
- `src/app/(dashboard)/{module}/SPEC.md`
- `src/lib/validations/{module}.ts`
- `src/lib/actions/{module}.ts`

If actions or validations are missing: stop and say "Run /implement-module {ModuleName} first."

### Step 1 — Read context
Read (load once):
- `src/app/(dashboard)/{module}/SPEC.md` — acceptance criteria + test cases sections
- `src/lib/validations/{module}.ts` — schema to test
- `src/lib/actions/{module}.ts` — actions to test
- `.claude/skills/test-unit/SKILL.md`
- `.claude/skills/test-e2e/SKILL.md`

### Step 2 — Unit tests
Produce: `src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts`

Map each AC from the SPEC to at least one test case:
- Schema validation: valid input, each invalid input case
- Auth guard: returns error when `getAuthUser()` returns null
- Success path: mock `queryForOrg`, assert return shape
- Error path: mock `queryForOrg` throws, assert graceful return
- Business rules (BR-01, BR-02...): one test per rule

Mock pattern (from skill):
```typescript
vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

### Step 3 — E2E tests
Produce: `src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts`

Map each critical user flow from SPEC to one E2E test:
- Create flow: fill form → submit → assert redirect + success toast
- List/search flow: navigate to list → search → assert results
- Detail view: click row → assert detail page loads
- Edit flow: open edit → change field → submit → assert updated
- Delete flow: click delete → confirm dialog → assert removed from list

Always use the auth fixture:
```typescript
import { test, expect } from '@/tests/fixtures/auth'
```

### Step 4 — Summary
```
✅ Tests generated: {ModuleName}

Unit tests: src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts
  {count} test cases covering {count} ACs

E2E tests: src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts
  {count} test cases covering {count} user flows

Run: npx vitest run && npx playwright test
```

---

## Rules

- Every AC from the SPEC must have at least one test — no exceptions
- Unit tests mock `@/lib/db` and `@/lib/auth` — never hit real DB
- E2E tests use the auth fixture — never manually log in inside a test
- Soft delete tests must assert SQL contains `deleted_at`, not `DELETE FROM`
- Run `npx vitest run` mentally trace through — tests must pass logically before writing
