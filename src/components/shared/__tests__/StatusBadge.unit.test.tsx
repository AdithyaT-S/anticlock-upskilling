// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  // AC-09: StatusBadge renders correct colour for "Closed Won"
  it('renders emerald classes for "Closed Won"', () => {
    const { container } = render(<StatusBadge status="Closed Won" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-emerald-100', 'text-emerald-700')
    expect(badge).toHaveTextContent('Closed Won')
  })

  it('renders indigo classes for "New"', () => {
    const { container } = render(<StatusBadge status="New" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-indigo-100', 'text-indigo-700')
  })

  it('renders red classes for "Closed Lost"', () => {
    const { container } = render(<StatusBadge status="Closed Lost" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-red-100', 'text-red-700')
  })

  it('renders amber classes for "Negotiation"', () => {
    const { container } = render(<StatusBadge status="Negotiation" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-700')
  })

  // BR-03: Unknown status → gray badge with raw value
  it('renders gray fallback for unknown status', () => {
    const { container } = render(<StatusBadge status="Weird Status" />)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700')
    expect(badge).toHaveTextContent('Weird Status')
  })
})
