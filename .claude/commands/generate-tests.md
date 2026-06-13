---
model: haiku
---

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

Mock setup (required at top of every unit test file):
```typescript
vi.mock('@/lib/db', () => ({ queryForOrg: vi.fn(), query: vi.fn(), transaction: vi.fn() }))
vi.mock('@/lib/auth', () => ({ getAuthUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
```

UUID constants (required when any Zod schema uses `z.string().uuid()`):
```typescript
const ORG_ID  = '00000000-0000-4000-8000-000000000001'
const USER_ID = '00000000-0000-4000-8000-000000000002'
// increment last hex segment for each ID
```

mockUser shape (must include all four fields):
```typescript
const mockUser = {
  id:    USER_ID,
  email: 'admin@test.com',
  orgId: ORG_ID,
  role:  'admin' as const,
}
```

Per action, write: schema valid, schema invalid, auth guard, success path, error path, one test per BR-XX.

When an action makes N calls to `queryForOrg`, chain `mockResolvedValueOnce` N times in order.

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

Test signatures: always `async ({ page })` — there is no `authenticatedOrg` fixture.

Shadcn Select fields: click the trigger, then click the option — never use `selectOption()`.
```typescript
await page.getByRole('combobox', { name: /stage/i }).click()
await page.getByRole('option', { name: 'New' }).click()
```

After navigation: assert visible content, not just URL:
```typescript
await page.waitForURL(/\/deals\/[a-z0-9-]+\/edit/)
await expect(page.getByRole('heading', { name: /edit deal/i })).toBeVisible({ timeout: 10_000 })
```

Strict mode — scope or use `.first()` if text appears in multiple places:
```typescript
// ❌ await expect(page.getByText('Pipeline')).toBeVisible()  // fails if 3 matches
// ✅ await expect(page.getByText('Pipeline').first()).toBeVisible()
```

For delete buttons: use `aria-label` or `getByRole('button', { name: /delete .../i })` — never target by color class.

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
- Unit tests mock `@/lib/db` (all three: queryForOrg, query, transaction) and `@/lib/auth`
- IDs must be valid UUIDs when the schema uses `z.string().uuid()`
- `mockUser` must include `email` and `role: '...' as const` — missing fields cause TypeScript errors
- E2E tests use auth fixture — never call `/login` manually inside a test
- E2E test signatures are `async ({ page })` — no `authenticatedOrg` parameter
- Soft delete: assert SQL has `deleted_at`, not `DELETE FROM`
- Mentally trace through each test — it must logically pass before writing
