// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../ConfirmDialog'

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Delete contact',
    description: 'This action cannot be undone.',
    onConfirm: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }
  return render(<ConfirmDialog {...defaults} {...props} />)
}

describe('ConfirmDialog', () => {
  // AC-20: ConfirmDialog calls onConfirm when confirmed
  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderDialog({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  // AC-21: ConfirmDialog disables buttons while pending
  it('disables both buttons when isPending is true', () => {
    renderDialog({ isPending: true })
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('shows a spinner on the confirm button when isPending', () => {
    renderDialog({ isPending: true })
    // Loader2 renders an SVG inside the confirm button
    const confirmBtn = screen.getByRole('button', { name: /delete/i })
    expect(confirmBtn.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders custom confirmLabel', () => {
    renderDialog({ confirmLabel: 'Remove' })
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  // BR-07: confirm button must be destructive variant
  it('confirm button has destructive variant class', () => {
    renderDialog()
    const confirmBtn = screen.getByRole('button', { name: 'Delete' })
    // shadcn destructive variant adds bg-destructive
    expect(confirmBtn).toHaveClass('bg-destructive')
  })
})
