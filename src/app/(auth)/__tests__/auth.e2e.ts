import { test, expect } from '@playwright/test'
import { adminUser } from '@/tests/fixtures/auth'

// Auth E2E — tests run against a live Next.js server + real DB
// Run: npx playwright test src/app/\(auth\)/__tests__/auth.e2e.ts

const uniqueEmail = () => `test-${Date.now()}@e2e.test`

test.describe('Auth', () => {

  // ── AC-01: Successful signup ────────────────────────────────────
  test('full signup flow lands on dashboard (AC-01)', async ({ page }) => {
    const email = uniqueEmail()
    await page.goto('/signup')

    await page.fill('[name="full_name"]', 'Test User')
    await page.fill('[name="org_name"]', 'Test Org')
    await page.fill('[name="email"]', email)
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // After signup + auto sign-in → redirected to /
    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })

  // ── AC-02: Duplicate email on signup ────────────────────────────
  test('signup with duplicate email shows error toast (AC-02)', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('[name="full_name"]', adminUser.full_name)
    await page.fill('[name="org_name"]', adminUser.org_name)
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')

    await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL('/signup')
  })

  // ── AC-03: Invalid fields show inline errors ────────────────────
  test('signup with missing password shows inline error (AC-03)', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('[name="full_name"]', 'Jane')
    await page.fill('[name="org_name"]', 'Acme')
    await page.fill('[name="email"]', 'jane@acme.com')
    // password left empty
    await page.click('button[type="submit"]')

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
    await expect(page).toHaveURL('/signup')
  })

  // ── AC-04: Successful login ─────────────────────────────────────
  test('login with valid credentials redirects to dashboard (AC-04)', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/', { timeout: 10_000 })
  })

  // ── AC-05: Wrong credentials ────────────────────────────────────
  test('login with wrong password shows generic error toast (AC-05)', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL('/login')
  })

  // ── AC-06: Unauthenticated dashboard access ─────────────────────
  test('visiting / while logged out redirects to /login (AC-06)', async ({ page }) => {
    // No prior auth — fresh browser context
    await page.goto('/')
    await expect(page).toHaveURL('/login', { timeout: 5_000 })
  })

  // ── AC-07: Authenticated user redirected from auth pages ────────
  test('visiting /login while authenticated redirects to / (AC-07)', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Sign in first
    await page.goto('/login')
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    // Now try to visit /login again — should redirect away
    await page.goto('/login')
    await expect(page).toHaveURL('/')

    await context.close()
  })

  // ── AC-08: Logout clears session ───────────────────────────────
  test('sign out clears session and lands on /login (AC-08)', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    // Sign in
    await page.goto('/login')
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    // Sign out via NextAuth endpoint
    await page.goto('/api/auth/signout')
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL('/login', { timeout: 5_000 })

    // Confirm session is cleared
    await page.goto('/')
    await expect(page).toHaveURL('/login')

    await context.close()
  })

  // ── AC-09: Session persists on refresh ─────────────────────────
  test('page refresh keeps user logged in (AC-09)', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/login')
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/', { timeout: 10_000 })

    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page).not.toHaveURL('/login')

    await context.close()
  })
})
