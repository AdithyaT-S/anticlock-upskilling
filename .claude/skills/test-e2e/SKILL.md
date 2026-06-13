# Skill: test-e2e

Pattern for ALL Playwright E2E tests. One file per critical user flow.
Uses the auth fixture — never manually log in inside a test.

## Auth setup (runs once before all tests)

`src/tests/auth.setup.ts` signs up (or logs in if the user exists) and saves the session to `.auth/user.json`.
It is registered as the `setup` project in `playwright.config.ts` and must run before all other projects.

```typescript
// src/tests/auth.setup.ts
import { test as setup } from '@playwright/test'
import { adminUser } from '@/tests/fixtures/auth'
import fs from 'fs'
import path from 'path'

const AUTH_FILE = 'src/tests/fixtures/.auth/user.json'

setup('generate admin auth session', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/signup')
  await page.fill('[name="full_name"]', adminUser.full_name)
  await page.fill('[name="org_name"]', adminUser.org_name)
  await page.fill('[name="email"]', adminUser.email)
  await page.fill('[name="password"]', adminUser.password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)

  if (page.url().includes('/signup')) {
    // User already exists — log in instead
    await page.goto('/login')
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 15_000 })
  }

  await page.context().storageState({ path: AUTH_FILE })
})
```

## Auth fixture (src/tests/fixtures/auth.ts)

The real fixture loads the saved session via `storageState`. It does NOT provide an `authenticatedOrg` fixture — use only `{ page }` in every test:

```typescript
import { test as base, expect } from '@playwright/test'

export const adminUser = {
  email:     'admin@test-org.com',
  password:  'testpassword123',
  full_name: 'Test Admin',
  org_name:  'Test Org',
}

export const test = base.extend({
  storageState: 'src/tests/fixtures/.auth/user.json',
})

export { expect }
```

## playwright.config.ts

```typescript
projects: [
  { name: 'setup', testMatch: '**/auth.setup.ts' },
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],
  },
]
```

## Pattern

```typescript
import { expect, type Page } from '@playwright/test'
import { test } from '@/tests/fixtures/auth'

// Helper: encapsulate multi-step flows to avoid repetition across tests
async function createContact(page: Page, firstName: string, email: string) {
  await page.goto('/contacts/new')
  await page.fill('[name="first_name"]', firstName)
  await page.fill('[name="email"]', email)
  await page.click('button[type="submit"]')
  await expect(page.getByText('Contact saved')).toBeVisible({ timeout: 10_000 })
}

test.describe('Contacts', () => {
  // AC-06: Create
  test('creates a new contact', async ({ page }) => {
    await page.goto('/contacts/new')
    await page.fill('[name="first_name"]', 'Priya')
    await page.fill('[name="email"]', 'priya@testcrm.com')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Contact saved')).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/)
  })

  // AC-04: Search
  test('search filters the contact list', async ({ page }) => {
    await createContact(page, 'Priya', 'priya@testcrm.com')
    await page.goto('/contacts')
    await page.fill('[placeholder*="Search"]', 'priya')
    await expect(page.getByText('Priya')).toBeVisible()
  })

  // AC-05: Edit
  test('edits a contact', async ({ page }) => {
    await createContact(page, 'Priya', 'priya@testcrm.com')
    await page.goto('/contacts')
    await page.getByText('Priya').click()
    await page.getByRole('link', { name: /edit/i }).click()
    await page.fill('[name="company"]', 'Acme Corp')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Contact saved')).toBeVisible({ timeout: 10_000 })
  })

  // AC-16: Delete
  test('delete shows confirmation then removes record', async ({ page }) => {
    await createContact(page, 'ToDelete', 'del@testcrm.com')
    await page.goto('/contacts')
    await page.getByText('ToDelete').click()
    await page.getByRole('button', { name: /delete/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /confirm|delete/i }).last().click()
    await expect(page.getByText('ToDelete')).not.toBeVisible({ timeout: 10_000 })
  })
})
```

## Shadcn / Radix Select interaction

Shadcn Select is NOT a native `<select>` — `selectOption()` will not work. Use this pattern:

```typescript
// Click the trigger to open the dropdown
await page.getByRole('combobox', { name: /stage \*/i }).click()
// Then click the desired option
await page.getByRole('option', { name: 'New' }).click()

// Or select the first available option when the specific name is unknown:
await page.getByRole('combobox', { name: /stage/i }).click()
await page.getByRole('option').first().click()
```

## Strict mode — avoid ambiguous locators

Playwright throws if a locator matches more than one element. Use scoping or `.first()`:
```typescript
// ❌ Fails if 'Pipeline' appears in header, sidebar, and detail panel
await expect(page.getByText('Pipeline')).toBeVisible()

// ✅ Scope to the element you care about
await expect(page.getByRole('dialog').getByText('Pipeline')).toBeVisible()
// OR
await expect(page.getByText('Pipeline').first()).toBeVisible()
```

## After navigation — wait for content, not just URL

`waitForURL` resolves as soon as the URL matches, before the page finishes rendering. Always assert a visible element after navigation:
```typescript
await page.getByRole('button', { name: /edit/i }).click()
await page.waitForURL(/\/deals\/[a-z0-9-]+\/edit/)
await expect(page.getByRole('heading', { name: /edit deal/i })).toBeVisible({ timeout: 10_000 })
// Now safe to interact with the form
```

## Rules

- Always import `test` from `@/tests/fixtures/auth` — never from `@playwright/test` directly
- Test signatures are `async ({ page })` — there is no `authenticatedOrg` fixture
- Never call `/login` or `/signup` manually inside a test — that's what `auth.setup.ts` is for
- Test the full flow a real user would take — not just API calls
- Assert both URL changes and visible text/toasts
- One `describe` block per module, one `test` per user flow
- Critical flows per module: create, list/search, detail view, edit, delete
- E2E uses real DB (test org) — no mocks
- Run with `npx playwright test` — all must pass before merging
- Install browsers once with `npx playwright install chromium` if tests error with "browser not found"
