// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from '../PageHeader'

describe('PageHeader', () => {
  // AC-19: PageHeader renders title and actions
  it('renders title and actions slot', () => {
    render(
      <PageHeader
        title="Contacts"
        actions={<button>New Contact</button>}
      />
    )
    expect(screen.getByRole('heading', { name: 'Contacts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Contact' })).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Contacts" subtitle="Manage your contacts" />)
    expect(screen.getByText('Manage your contacts')).toBeInTheDocument()
  })

  it('renders without subtitle when not provided', () => {
    render(<PageHeader title="Contacts" />)
    expect(screen.getByRole('heading', { name: 'Contacts' })).toBeInTheDocument()
    // no subtitle element
    const heading = screen.getByRole('heading')
    expect(heading.nextSibling).toBeNull()
  })

  it('renders without actions when not provided', () => {
    const { container } = render(<PageHeader title="Contacts" />)
    // actions wrapper only renders when actions prop given
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})
