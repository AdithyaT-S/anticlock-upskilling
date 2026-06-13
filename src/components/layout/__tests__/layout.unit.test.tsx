// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock next/navigation
const mockPathname = vi.fn(() => '/')
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

// Mock next/link — render as plain <a>
vi.mock('next/link', () => ({
  default: ({ href, children, className, onClick }: any) => (
    <a href={href} className={className} onClick={onClick}>{children}</a>
  ),
}))

// Mock next-auth/react
const mockSignOut = vi.fn()
vi.mock('next-auth/react', () => ({
  signOut: (opts: any) => mockSignOut(opts),
}))

// Mock MobileNav (tested separately)
vi.mock('../MobileNav', () => ({
  MobileNav: () => null,
}))

import { Sidebar } from '../Sidebar'
import { TopBar } from '../TopBar'

const testUser = { name: 'Alex Rivera', email: 'alex@example.com', role: 'admin' }

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue('/')
  })

  // AC-01: All nav items rendered
  it('renders all 8 nav items (Dashboard, Contacts, Leads, Deals, Tickets, Activities, Reports, Settings)', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Contacts')).toBeInTheDocument()
    expect(screen.getByText('Leads')).toBeInTheDocument()
    expect(screen.getByText('Deals')).toBeInTheDocument()
    expect(screen.getByText('Tickets')).toBeInTheDocument()
    expect(screen.getByText('Activities')).toBeInTheDocument()
    expect(screen.getByText('Reports')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  // AC-02: Active class on matching nav item
  it('applies active styles to Contacts when pathname is /contacts', () => {
    mockPathname.mockReturnValue('/contacts')
    render(<Sidebar />)
    const contactsLink = screen.getByText('Contacts').closest('a')
    expect(contactsLink?.className).toMatch(/bg-indigo-50/)
    expect(contactsLink?.className).toMatch(/text-indigo-600/)
  })

  // AC-02: Inactive items do not have active styles
  it('does not apply active styles to non-current nav items', () => {
    mockPathname.mockReturnValue('/contacts')
    render(<Sidebar />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink?.className).not.toMatch(/bg-indigo-50/)
  })

  // AC-03: Root path — only Dashboard highlighted, not others
  it('highlights only Dashboard on pathname /', () => {
    mockPathname.mockReturnValue('/')
    render(<Sidebar />)

    const dashboardLink = screen.getByText('Dashboard').closest('a')
    const contactsLink = screen.getByText('Contacts').closest('a')

    expect(dashboardLink?.className).toMatch(/bg-indigo-50/)
    expect(contactsLink?.className).not.toMatch(/bg-indigo-50/)
  })

  // BR-03: Exact match for root — /contacts should NOT highlight Dashboard
  it('does not highlight Dashboard when pathname is /contacts (exact match enforced)', () => {
    mockPathname.mockReturnValue('/contacts')
    render(<Sidebar />)
    const dashboardLink = screen.getByText('Dashboard').closest('a')
    expect(dashboardLink?.className).not.toMatch(/bg-indigo-50/)
  })

  // AC-08: Sub-path /contacts/123 highlights Contacts
  it('highlights Contacts when pathname is /contacts/123 (startsWith match)', () => {
    mockPathname.mockReturnValue('/contacts/abc-123')
    render(<Sidebar />)
    const contactsLink = screen.getByText('Contacts').closest('a')
    expect(contactsLink?.className).toMatch(/bg-indigo-50/)
  })

  // AC-05: Sign out button calls signOut
  it('calls signOut with /login callbackUrl when sign out is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByText('Sign out'))
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/login' })
  })
})

describe('TopBar', () => {
  beforeEach(() => vi.clearAllMocks())

  // AC-04: TopBar shows logged-in user name
  it('displays user name from props', () => {
    render(<TopBar user={testUser} />)
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
  })

  // AC-04: TopBar shows role
  it('displays user role', () => {
    render(<TopBar user={testUser} />)
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  // BR-01 (name fallback): renders initials from user name
  it('renders correct initials for the avatar', () => {
    render(<TopBar user={testUser} />)
    // "Alex Rivera" → "AR"
    expect(screen.getByText('AR')).toBeInTheDocument()
  })

  // Edge case: single-word name produces single initial
  it('handles single-word name gracefully', () => {
    render(<TopBar user={{ ...testUser, name: 'Alex' }} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })
})
