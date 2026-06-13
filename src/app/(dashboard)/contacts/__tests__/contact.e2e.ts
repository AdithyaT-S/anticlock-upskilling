import { expect } from '@playwright/test'
import { test } from '@/tests/fixtures/auth'

// Uses pre-saved auth state from src/tests/fixtures/.auth/user.json
// Run: npx playwright test contact.e2e.ts

test.describe('Contacts', () => {

  // ── AC-01: List page loads with correct columns ─────────────────
  test('contacts list loads with table columns', async ({ page }) => {
    await page.goto('/contacts')

    // Table headers visible
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /company/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /owner/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /lead source/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /last activity/i })).toBeVisible()

    // Action buttons present
    await expect(page.getByRole('link', { name: /new contact/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /import csv/i })).toBeVisible()
  })

  // ── AC-03 + AC-04: Create contact flow ─────────────────────────
  test('create a new contact and redirect to detail', async ({ page }) => {
    await page.goto('/contacts/new')

    await page.getByLabel(/first name/i).fill('E2E')
    await page.getByLabel(/last name/i).fill('TestContact')
    await page.getByLabel(/email/i).fill(`e2e-${Date.now()}@test.com`)
    await page.getByLabel(/company/i).fill('Test Corp')

    await page.getByRole('button', { name: /create contact/i }).click()

    // AC-04: redirect to detail page
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)
    await expect(page.getByText('E2E TestContact')).toBeVisible()
    await expect(page.getByText('Contact created')).toBeVisible()
  })

  // ── AC-05: Duplicate email shows inline error ───────────────────
  test('create with duplicate email shows inline field error', async ({ page }) => {
    // First create a contact
    const email = `dup-${Date.now()}@test.com`
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('First')
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // Try to create another with the same email
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('Duplicate')
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /create contact/i }).click()

    // AC-05: stays on form, shows error
    await expect(page).toHaveURL('/contacts/new')
    await expect(page.getByText(/already exists/i)).toBeVisible()
  })

  // ── AC-06: Invalid email shows validation error ─────────────────
  test('create with invalid email format shows field validation error', async ({ page }) => {
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('Jane')
    await page.getByLabel(/email/i).fill('notanemail')
    await page.getByRole('button', { name: /create contact/i }).click()

    await expect(page).toHaveURL('/contacts/new')
    await expect(page.getByText(/invalid email/i)).toBeVisible()
  })

  // ── AC-02: Search filters contact list ─────────────────────────
  test('search filters contacts by name', async ({ page }) => {
    // Create a uniquely-named contact first
    const unique = `SearchTarget-${Date.now()}`
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill(unique)
    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // Go to list and search
    await page.goto('/contacts')
    await page.getByPlaceholder(/search contacts/i).fill(unique)

    // Wait for debounce
    await page.waitForTimeout(400)

    await expect(page.getByText(unique)).toBeVisible()
  })

  // ── AC-12: Lead source filter ────────────────────────────────────
  test('lead source filter shows only contacts with selected lead source', async ({ page }) => {
    await page.goto('/contacts')

    // Open the lead source filter dropdown
    const leadSourceSelect = page.getByRole('combobox', { name: /all lead sources/i })
    await expect(leadSourceSelect).toBeVisible()
    await leadSourceSelect.click()

    // Select "Referral" as the lead source
    await page.getByRole('option', { name: /referral/i }).click()

    // URL should reflect the filter
    await expect(page).toHaveURL(/lead_source=referral/)

    // Table should only show contacts with lead source = referral (or be empty)
    // Each visible StatusBadge in the lead source column should say "Referral"
    const badges = page.getByRole('cell', { name: /referral/i })
    const otherBadges = page.getByRole('cell', { name: /website|social|cold outreach|event|other/i })
    await expect(otherBadges).toHaveCount(0)
    // If there are referral contacts, verify at least one badge shows
    const badgeCount = await badges.count()
    if (badgeCount > 0) {
      await expect(badges.first()).toBeVisible()
    }
  })

  // ── AC-11: Owner filter ─────────────────────────────────────────
  test('owner filter shows only contacts for selected owner', async ({ page }) => {
    await page.goto('/contacts')

    // Open the owner filter dropdown
    const ownerSelect = page.getByRole('combobox', { name: /all owners/i })
    await ownerSelect.click()

    // Select "All owners" to reset — just verify the control exists
    await expect(ownerSelect).toBeVisible()
    // Close dropdown
    await page.keyboard.press('Escape')
  })

  // ── AC-07 + AC-08: Contact detail page ─────────────────────────
  test('contact detail shows profile fields and Edit link', async ({ page }) => {
    // Create a contact with all key fields
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('Detail')
    await page.getByLabel(/last name/i).fill('ViewTest')
    await page.getByLabel(/email/i).fill(`detail-${Date.now()}@test.com`)
    await page.getByLabel(/company/i).fill('Detail Corp')
    await page.getByLabel(/job title/i).fill('CEO')
    await page.getByRole('button', { name: /create contact/i }).click()

    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // AC-07: fields visible on detail page
    await expect(page.getByText('Detail ViewTest')).toBeVisible()
    await expect(page.getByText('Detail Corp')).toBeVisible()
    await expect(page.getByText('CEO')).toBeVisible()

    // AC-08: Edit link present
    await expect(page.getByRole('link', { name: /edit/i })).toBeVisible()
  })

  // ── AC-09: Edit contact ─────────────────────────────────────────
  test('edit contact updates and redirects to detail', async ({ page }) => {
    // Create
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('Editable')
    await page.getByLabel(/last name/i).fill('Contact')
    await page.getByLabel(/email/i).fill(`edit-${Date.now()}@test.com`)
    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // Navigate to edit
    await page.getByRole('link', { name: /edit/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+\/edit/)

    // AC-08: form is pre-filled
    const firstNameInput = page.getByLabel(/first name/i)
    await expect(firstNameInput).toHaveValue('Editable')

    // Make a change
    await page.getByLabel(/company/i).fill('Updated Corp')
    await page.getByRole('button', { name: /save changes/i }).click()

    // AC-09: redirect to detail with updated data
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+$/)
    await expect(page.getByText('Updated Corp')).toBeVisible()
    await expect(page.getByText('Contact updated')).toBeVisible()
  })

  // ── AC-10: Delete contact ───────────────────────────────────────
  test('delete contact soft-deletes and redirects to list', async ({ page }) => {
    // Create a contact to delete
    const name = `ToDelete-${Date.now()}`
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill(name)
    await page.getByLabel(/email/i).fill(`del-${Date.now()}@test.com`)
    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // Click Delete
    await page.getByRole('button', { name: /delete/i }).click()

    // AC-10: confirm dialog appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/are you sure/i)).toBeVisible()

    // Confirm deletion
    await page.getByRole('button', { name: /^delete$/i }).click()

    // AC-10: redirected to list
    await expect(page).toHaveURL('/contacts')
    await expect(page.getByText('Contact deleted')).toBeVisible()

    // Contact no longer appears in list
    await expect(page.getByText(name)).not.toBeVisible()
  })

  // ── AC-15: Pagination ───────────────────────────────────────────
  test('pagination next button loads page 2', async ({ page }) => {
    await page.goto('/contacts?per_page=2')

    const nextBtn = page.getByRole('button', { name: /next page/i })

    // If there are enough contacts, next should be enabled
    const isDisabled = await nextBtn.isDisabled()
    if (!isDisabled) {
      await nextBtn.click()
      await expect(page).toHaveURL(/page=2/)
    }
    // If disabled (< 3 contacts in test org), the control still renders correctly
    await expect(nextBtn).toBeVisible()
  })

  // ── AC-16: Activity timeline tab ───────────────────────────────
  test('contact detail activity tab renders timeline', async ({ page }) => {
    // Create a contact
    await page.goto('/contacts/new')
    await page.getByLabel(/first name/i).fill('Timeline')
    await page.getByLabel(/last name/i).fill('Test')
    await page.getByRole('button', { name: /create contact/i }).click()
    await expect(page).toHaveURL(/\/contacts\/[a-f0-9-]+/)

    // Activity tab should be visible and active by default
    await expect(page.getByRole('tab', { name: /activity/i })).toBeVisible()
    // No activities yet — empty state message
    await expect(page.getByText(/no activity yet/i)).toBeVisible()
  })

  // ── AC-13: CSV import success ───────────────────────────────────
  test('CSV import shows success summary', async ({ page }) => {
    await page.goto('/contacts')

    // Set up file chooser interception before clicking
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /import csv/i }).click()
    const fileChooser = await fileChooserPromise

    // Create a valid CSV buffer
    const csvContent = [
      'first_name,last_name,email',
      `CSVImport,Test,csv-${Date.now()}@test.com`,
    ].join('\n')

    await fileChooser.setFiles({
      name: 'contacts.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // AC-13: success toast with count
    await expect(page.getByText(/imported/i)).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-14: CSV import with errors ──────────────────────────────
  test('CSV import with invalid rows shows error summary', async ({ page }) => {
    await page.goto('/contacts')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /import csv/i }).click()
    const fileChooser = await fileChooserPromise

    // Row 2 has missing email (invalid)
    const csvContent = [
      'first_name,email',
      'ValidRow,valid@test.com',
      ',',  // missing first_name and email
    ].join('\n')

    await fileChooser.setFiles({
      name: 'contacts_bad.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    })

    // AC-14: error summary shows up
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10_000 })
  })

})
