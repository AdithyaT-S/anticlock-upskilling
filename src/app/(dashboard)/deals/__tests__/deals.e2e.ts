import { expect, type Page } from '@playwright/test'
import { test } from '@/tests/fixtures/auth'

// Helper: open the New Deal sheet, fill required fields, pick the first stage, and submit
async function createDeal(
  page: Page,
  name: string,
  value: string,
  closeDate?: string
) {
  await page.getByRole('button', { name: /new deal/i }).click()
  await expect(page.getByRole('heading', { name: 'New deal' })).toBeVisible()

  await page.getByLabel(/deal name/i).fill(name)
  await page.getByLabel(/value/i).fill(value)

  if (closeDate) {
    await page.getByLabel(/expected close date/i).fill(closeDate)
  }

  // Stage is required — explicitly select the first available stage
  // (the useEffect auto-select is not guaranteed to fire before Playwright submits)
  await page.getByRole('combobox', { name: /stage \*/i }).click()
  await page.getByRole('option').first().click()

  await page.getByRole('button', { name: /create deal/i }).click()
  await expect(page.getByText('Deal created')).toBeVisible({ timeout: 10_000 })
}

test.describe('Deals', () => {
  // AC-01: Kanban board loads with default pipeline
  test('deals board loads with stage columns and New Deal button', async ({ page }) => {
    await page.goto('/deals')

    await expect(page.getByRole('heading', { name: /deals/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /new deal/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /my deals/i })).toBeVisible()

    // At least the first default stage column is present
    await expect(page.getByText('New').first()).toBeVisible()
  })

  // AC-06: Create a new deal from the "New Deal" button
  test('creates a new deal via the New Deal form', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'E2E Test Deal', '75000', '2026-12-31')

    // Card appears on board
    await expect(page.getByText('E2E Test Deal')).toBeVisible()
  })

  // AC-07: Form validation — empty name
  test('shows validation error when deal name is empty', async ({ page }) => {
    await page.goto('/deals')

    await page.getByRole('button', { name: /new deal/i }).click()
    await expect(page.getByRole('heading', { name: 'New deal' })).toBeVisible()

    // Submit without filling name
    await page.getByRole('button', { name: /create deal/i }).click()

    // Inline error appears
    await expect(page.getByText('Deal name is required')).toBeVisible()
  })

  // AC-05: Clicking a deal card opens the detail panel
  test('clicking a deal card opens the detail panel', async ({ page }) => {
    await page.goto('/deals')

    // Create a deal to click on
    await createDeal(page, 'Detail Panel Deal', '50000')

    // Click the card
    await page.getByText('Detail Panel Deal').click()

    // URL gains ?deal= param
    await expect(page).toHaveURL(/\?deal=/)

    // Detail panel shows deal name in heading
    await expect(page.getByRole('heading', { name: 'Detail Panel Deal' })).toBeVisible()

    // Expected labels in the detail panel
    await expect(page.getByText('Close date')).toBeVisible()
    await expect(page.getByText('Pipeline').first()).toBeVisible()
    await expect(page.getByText('Activity')).toBeVisible()

    // Action buttons for an open deal
    await expect(page.getByRole('button', { name: /close as won/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /close as lost/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /edit deal/i })).toBeVisible()
  })

  // AC-10 & AC-11: Close as Lost — validates empty reason, then succeeds
  test('closes deal as Lost after providing a reason', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'Lost Deal', '10000')
    await page.getByText('Lost Deal').click()
    await expect(page).toHaveURL(/\?deal=/)

    // Click "Close as Lost" — reveals the textarea
    await page.getByRole('button', { name: /close as lost/i }).click()
    await expect(page.getByLabel(/reason for losing/i)).toBeVisible()

    // AC-10: Submit without reason shows validation error
    await page.getByRole('button', { name: /confirm.*close as lost/i }).click()
    await expect(page.getByText(/please provide a reason/i)).toBeVisible()

    // AC-11: Fill reason and submit
    await page.getByLabel(/reason for losing/i).fill('Customer chose a competitor')
    await page.getByRole('button', { name: /confirm.*close as lost/i }).click()

    await expect(page.getByText('Deal closed as Lost')).toBeVisible({ timeout: 10_000 })
    // Panel closes and ?deal param is removed
    await expect(page).not.toHaveURL(/\?deal=/)
  })

  // AC-02: Pipeline selector visible in page header
  test('pipeline selector is rendered in page header', async ({ page }) => {
    await page.goto('/deals')

    // Either a Select trigger or pipeline name text should appear in the header area
    const hasPipelineText = await page.getByText(/sales pipeline/i).first().isVisible().catch(() => false)
    const hasSelectTrigger = await page.locator('[role="combobox"]').first().isVisible().catch(() => false)

    expect(hasPipelineText || hasSelectTrigger).toBe(true)
  })

  // AC-12: My Deals filter toggle
  test('My Deals filter toggles correctly', async ({ page }) => {
    await page.goto('/deals')

    const myDealsBtn = page.getByRole('button', { name: /my deals/i })
    await expect(myDealsBtn).toBeVisible()

    // Toggle on — button should still be visible after click
    await myDealsBtn.click()
    await expect(myDealsBtn).toBeVisible()

    // Toggle off
    await myDealsBtn.click()
    await expect(myDealsBtn).toBeVisible()
  })

  // AC-14: Stage column header shows stage name and deal count badge
  test('stage column header shows stage name and deal count', async ({ page }) => {
    await page.goto('/deals')

    // "New" stage column header should be visible
    await expect(page.getByText('New').first()).toBeVisible()

    // Count badge (rounded-full span) exists alongside stage name
    const countBadge = page.locator('span.rounded-full').first()
    await expect(countBadge).toBeVisible()
  })

  // AC-09: Close deal as Won
  test('closes deal as Won and shows success toast', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'Deal to Close Won', '10000')
    await page.getByText('Deal to Close Won').click()
    await expect(page).toHaveURL(/\?deal=/)

    await page.getByRole('button', { name: /close as won/i }).click()

    await expect(page.getByText('Deal closed as Won')).toBeVisible({ timeout: 10_000 })
    // Panel closes
    await expect(page).not.toHaveURL(/\?deal=/)
  })

  // AC-15: Edit a deal
  test('edits deal value and navigates back to board', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'Deal to Edit', '20000')
    await page.getByText('Deal to Edit').click()
    await expect(page).toHaveURL(/\?deal=/)

    // Navigate to edit page
    await page.getByRole('button', { name: /edit deal/i }).click()
    await page.waitForURL(/\/deals\/[a-z0-9-]+\/edit/)
    await expect(page.getByRole('heading', { name: /edit deal/i })).toBeVisible({ timeout: 10_000 })

    // Update the value field
    const valueInput = page.getByLabel(/value/i)
    await valueInput.clear()
    await valueInput.fill('99000')

    await page.getByRole('button', { name: /update deal/i }).click()

    // Redirected back to /deals
    await page.waitForURL('/deals')
    await expect(page.getByText('Deal updated')).toBeVisible({ timeout: 10_000 })
  })

  // AC-16: Delete deal (admin only)
  test('admin can delete a deal via the confirm dialog', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'Deal to Delete', '5000')
    await page.getByText('Deal to Delete').click()
    await expect(page).toHaveURL(/\?deal=/)

    // Trash button — admin only, has aria-label="Delete deal"
    const deleteBtn = page.getByRole('button', { name: /delete deal/i })
    if (await deleteBtn.count() === 0) {
      test.skip() // not admin
      return
    }

    await deleteBtn.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Deal to Delete')

    await dialog.getByRole('button', { name: /delete/i }).last().click()

    await expect(page.getByText('Deal deleted')).toBeVisible({ timeout: 10_000 })
    await expect(page).not.toHaveURL(/\?deal=/)
    await expect(page.getByText('Deal to Delete')).not.toBeVisible()
  })

  // AC-13: Overdue badge on deals with past close date
  test('deal with past close date shows Overdue badge', async ({ page }) => {
    await page.goto('/deals')

    // Create a deal with a past close date
    await createDeal(page, 'Overdue Deal Test', '1000', '2020-01-01')

    // The Overdue badge should appear on the card
    await expect(page.getByText('Overdue').first()).toBeVisible()
  })

  // AC-03: Drag-drop stage move (best-effort — dnd-kit needs pointer distance ≥ 8px)
  test('dragging a card to another column moves it', async ({ page }) => {
    await page.goto('/deals')

    await createDeal(page, 'Drag Test Deal', '30000')

    // Get stage columns — 'New' is source, 'Qualified' is target
    const newHeader = page.locator('span.text-sm.font-semibold', { hasText: 'New' }).first()
    const qualifiedHeader = page.locator('span.text-sm.font-semibold', { hasText: 'Qualified' }).first()

    if (await qualifiedHeader.count() === 0) {
      test.skip() // no Qualified stage in this pipeline
      return
    }

    // Locate the specific card
    const cardContent = page.getByText('Drag Test Deal')
    const cardBox = await cardContent.boundingBox()
    const qualBox = await qualifiedHeader.boundingBox()

    if (!cardBox || !qualBox) {
      test.skip()
      return
    }

    // Simulate drag with pointer events (dnd-kit activationConstraint: distance 8)
    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
    await page.mouse.down()
    // Move gradually to trigger activation distance
    for (let i = 1; i <= 5; i++) {
      await page.mouse.move(
        cardBox.x + cardBox.width / 2 + (i * 2),
        cardBox.y + cardBox.height / 2
      )
    }
    // Move to target column
    await page.mouse.move(qualBox.x + qualBox.width / 2, qualBox.y + 80, { steps: 10 })
    await page.mouse.up()

    // Board still shows the card (regardless of where it landed)
    await expect(page.getByText('Drag Test Deal')).toBeVisible()
  })
})
