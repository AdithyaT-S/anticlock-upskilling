---
model: haiku
---

# Agent: Test Writer

Writes Vitest unit tests and Playwright E2E tests from SPEC ACs.
Every AC gets a test. No AC is skipped. No test is vague.

Skills: `test-unit/SKILL.md`, `test-e2e/SKILL.md`

---

## Output

### Unit tests (`src/app/(dashboard)/{module}/__tests__/{module}.unit.test.ts`)

One describe block per action. Tests per action:
1. Schema valid — passes with correct input
2. Schema invalid — fails with each required field missing
3. Auth guard — returns error when `getAuthUser()` returns null
4. Success path — mocked `queryForOrg` returns data, assert return shape
5. Business rule tests — one per BR-XX in SPEC

Mock setup (always):
```typescript
vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

### E2E tests (`src/app/(dashboard)/{module}/__tests__/{module}.e2e.ts`)

One test per critical user flow:
- Create: fill form → submit → assert URL + toast
- List + search: load page → type in search → assert filtered results
- Detail: click row → assert detail loads with correct data
- Edit: open edit → change field → submit → assert saved
- Delete: click delete → confirm dialog → assert removed

Always use auth fixture:
```typescript
import { test, expect } from '@/tests/fixtures/auth'
```

---

## AC → Test mapping rule

For every AC in the SPEC, add a comment in the test file:
```typescript
// AC-03: Given a duplicate email, when create is called, then return error
it('returns error for duplicate email', async () => { ... })
```

This makes it auditable — anyone can verify every AC is tested.

---

## Rules

- Unit tests mock `@/lib/db` — never hit real DB
- E2E tests use real DB (test org) — no mocks
- Soft delete: assert SQL contains `deleted_at`, not `DELETE FROM`
- Every `it()` description must state the expected behavior, not the implementation
- After writing, mentally trace through each test — it must logically pass
- Never write a test that always passes regardless of implementation
