# Skill: test-e2e

Pattern for ALL Playwright E2E tests. One file per critical user flow.
Uses the auth fixture — never manually log in inside a test.

## Auth fixture (src/tests/fixtures/auth.ts)

```typescript
import { test as base, expect } from '@playwright/test'

type Fixtures = {
  authenticatedOrg: { orgId: string; userId: string }
}

export const test = base.extend<Fixtures>({
  authenticatedOrg: async ({ page }, use) => {
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    await use({ orgId: 'test-org', userId: 'test-user' })
  },
})

export { expect }
```

## Pattern

```typescript
import { test, expect } from '@/tests/fixtures/auth'

test.describe('Contacts', () => {
  test('create a new contact', async ({ page, authenticatedOrg }) => {
    await page.goto('/contacts/new')

    await page.fill('[name="first_name"]', 'Priya')
    await page.fill('[name="last_name"]', 'Sharma')
    await page.fill('[name="email"]', 'priya@testcrm.com')
    await page.selectOption('[name="lead_source"]', 'website')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/)
    await expect(page.getByText('Priya Sharma')).toBeVisible()
    await expect(page.getByText('Contact saved')).toBeVisible()
  })

  test('search filters the contact list', async ({ page, authenticatedOrg }) => {
    await page.goto('/contacts')
    await page.fill('[placeholder="Search..."]', 'priya')
    await expect(page.getByText('Priya Sharma')).toBeVisible()
  })

  test('edit a contact', async ({ page, authenticatedOrg }) => {
    await page.goto('/contacts')
    await page.getByText('Priya Sharma').click()
    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/)
    await page.getByRole('link', { name: 'Edit' }).click()
    await page.fill('[name="company"]', 'Acme Corp')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Contact saved')).toBeVisible()
  })

  test('delete a contact shows confirmation then removes it', async ({ page, authenticatedOrg }) => {
    await page.goto('/contacts')
    await page.getByText('Priya Sharma').click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByRole('dialog')).toBeVisible() // confirm dialog
    await page.getByRole('button', { name: 'Confirm' }).click()
    await expect(page).toHaveURL('/contacts')
    await expect(page.getByText('Priya Sharma')).not.toBeVisible()
  })
})
```

## Rules

- Always use the `auth` fixture — never call `/login` manually inside tests
- Test the full flow a real user would take — not just API calls
- Assert both URL changes and visible text/toasts
- One `describe` block per module, one `test` per user flow
- Critical flows per module: create, list/search, detail view, edit, delete
- E2E uses real DB (test org) — no mocks
- Run with `npx playwright test` — all must pass before merging
