// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PriorityDot } from '../PriorityDot'

describe('PriorityDot', () => {
  // AC-10: PriorityDot renders correct colour for "urgent"
  it('renders bg-red-600 for urgent priority', () => {
    const { container } = render(<PriorityDot priority="urgent" />)
    const dot = container.querySelector('span')!
    expect(dot).toHaveClass('bg-red-600')
  })

  it('renders bg-gray-400 for low priority', () => {
    const { container } = render(<PriorityDot priority="low" />)
    const dot = container.querySelector('span')!
    expect(dot).toHaveClass('bg-gray-400')
  })

  it('renders bg-amber-400 for medium priority', () => {
    const { container } = render(<PriorityDot priority="medium" />)
    const dot = container.querySelector('span')!
    expect(dot).toHaveClass('bg-amber-400')
  })

  it('renders bg-orange-500 for high priority', () => {
    const { container } = render(<PriorityDot priority="high" />)
    const dot = container.querySelector('span')!
    expect(dot).toHaveClass('bg-orange-500')
  })

  // AC-11: PriorityDot shows label when showLabel is true
  it('shows label text when showLabel is true', () => {
    render(<PriorityDot priority="high" showLabel />)
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('does not show label text when showLabel is false (default)', () => {
    render(<PriorityDot priority="high" />)
    expect(screen.queryByText('high')).not.toBeInTheDocument()
  })
})
