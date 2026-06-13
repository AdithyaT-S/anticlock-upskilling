// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OwnerSelect } from '../OwnerSelect'

// Radix UI Popover uses ResizeObserver; cmdk uses scrollIntoView
beforeAll(() => {
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
  Element.prototype.scrollIntoView = vi.fn()
})

const mockUsers = [
  { id: 'user-1', name: 'Alice Johnson', email: 'alice@example.com' },
  { id: 'user-2', name: 'Bob Smith', email: 'bob@example.com' },
]

describe('OwnerSelect', () => {
  // AC-12: OwnerSelect calls onChange with selected user id
  it('calls onChange with user id when a user is selected', async () => {
    const onChange = vi.fn()
    render(<OwnerSelect value={null} onChange={onChange} users={mockUsers} />)

    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Alice Johnson'))
    await userEvent.click(screen.getByText('Alice Johnson'))

    expect(onChange).toHaveBeenCalledWith('user-1')
  })

  // AC-13: OwnerSelect "Unassign" clears selection
  it('calls onChange with null when Unassign is clicked', async () => {
    const onChange = vi.fn()
    render(<OwnerSelect value="user-1" onChange={onChange} users={mockUsers} />)

    await userEvent.click(screen.getByRole('combobox'))
    await waitFor(() => screen.getByText('Unassign'))
    await userEvent.click(screen.getByText('Unassign'))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows placeholder text when no user is selected', () => {
    render(<OwnerSelect value={null} onChange={vi.fn()} users={mockUsers} placeholder="Assign owner" />)
    expect(screen.getByText('Assign owner')).toBeInTheDocument()
  })

  it('shows selected user name in the trigger', () => {
    render(<OwnerSelect value="user-2" onChange={vi.fn()} users={mockUsers} />)
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('shows "No team members found" when search has no matches', async () => {
    render(<OwnerSelect value={null} onChange={vi.fn()} users={[]} />)
    await userEvent.click(screen.getByRole('combobox'))
    const searchInput = await screen.findByPlaceholderText('Search team...')
    await userEvent.type(searchInput, 'zzznomatch')
    await waitFor(() => expect(screen.getByText('No team members found.')).toBeInTheDocument())
  })

  it('is disabled when disabled prop is true', () => {
    render(<OwnerSelect value={null} onChange={vi.fn()} users={mockUsers} disabled />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
