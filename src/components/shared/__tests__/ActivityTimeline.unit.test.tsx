// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ActivityTimeline } from '../ActivityTimeline'
import type { Activity } from '@/types/crm'

const makeActivity = (type: Activity['type']): Activity => ({
  id: `act-${type}`,
  org_id: 'org-1',
  type,
  title: `${type} activity`,
  description: null,
  contact_id: null,
  lead_id: null,
  deal_id: null,
  ticket_id: null,
  user_id: 'user-1',
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
})

describe('ActivityTimeline', () => {
  // AC-07: ActivityTimeline renders correct icon per type
  it('renders the call icon container for a call activity', () => {
    render(<ActivityTimeline activities={[makeActivity('call')]} />)
    expect(screen.getByLabelText('call')).toBeInTheDocument()
  })

  it('renders the email icon container for an email activity', () => {
    render(<ActivityTimeline activities={[makeActivity('email')]} />)
    expect(screen.getByLabelText('email')).toBeInTheDocument()
  })

  it('renders the task icon container for a task activity', () => {
    render(<ActivityTimeline activities={[makeActivity('task')]} />)
    expect(screen.getByLabelText('task')).toBeInTheDocument()
  })

  it('renders the activity title', () => {
    render(<ActivityTimeline activities={[makeActivity('note')]} />)
    expect(screen.getByText('note activity')).toBeInTheDocument()
  })

  // AC-08: ActivityTimeline shows skeleton when loading
  it('shows skeleton items when isLoading is true', () => {
    const { container } = render(<ActivityTimeline activities={[]} isLoading />)
    // shadcn Skeleton renders divs with animate-pulse class
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
    // no activity text should appear
    expect(screen.queryByText('No activity yet.')).not.toBeInTheDocument()
  })

  it('renders aria-label on the loading container', () => {
    render(<ActivityTimeline activities={[]} isLoading />)
    expect(screen.getByLabelText('Loading activities')).toBeInTheDocument()
  })

  it('shows "No activity yet." when activities is empty and not loading', () => {
    render(<ActivityTimeline activities={[]} />)
    expect(screen.getByText('No activity yet.')).toBeInTheDocument()
  })
})
