// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from '../EmptyState'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No contacts found" />)
    expect(screen.getByText('No contacts found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Add your first contact." />)
    expect(screen.getByText('Add your first contact.')).toBeInTheDocument()
  })

  // AC-18: EmptyState renders action CTA when action prop is provided
  it('renders action button with href', () => {
    render(
      <EmptyState
        title="No contacts"
        action={{ label: 'New Contact', href: '/contacts/new' }}
      />
    )
    const link = screen.getByRole('link', { name: 'New Contact' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/contacts/new')
  })

  it('renders action button with onClick handler', async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="No contacts"
        action={{ label: 'Create', onClick }}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('renders no action when action prop is absent', () => {
    render(<EmptyState title="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
