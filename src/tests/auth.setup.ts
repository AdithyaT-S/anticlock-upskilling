import { test as setup } from '@playwright/test'
import { adminUser } from '@/tests/fixtures/auth'
import fs from 'fs'
import path from 'path'

const AUTH_FILE = 'src/tests/fixtures/.auth/user.json'

setup('generate admin auth session', async ({ page }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  // Attempt signup first (creates the user + org if they don't exist)
  await page.goto('/signup')
  await page.fill('[name="full_name"]', adminUser.full_name)
  await page.fill('[name="org_name"]', adminUser.org_name)
  await page.fill('[name="email"]', adminUser.email)
  await page.fill('[name="password"]', adminUser.password)
  await page.click('button[type="submit"]')

  // Wait briefly for either redirect (success) or error (user exists)
  await page.waitForTimeout(2000)

  const stillOnSignup = page.url().includes('/signup')

  if (stillOnSignup) {
    // User already exists — log in instead
    await page.goto('/login')
    await page.fill('[name="email"]', adminUser.email)
    await page.fill('[name="password"]', adminUser.password)
    await page.click('button[type="submit"]')

    // Wait for redirect off login page
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 15_000 })
  }

  // Save storage state (cookies + localStorage = NextAuth session)
  await page.context().storageState({ path: AUTH_FILE })
})
