// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchInput } from '../SearchInput'

describe('SearchInput', () => {
  // AC-22: SearchInput debounces onChange
  it('does not call onChange immediately on keystroke', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} debounceMs={300} />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'foo' } })

    // onChange should not have been called yet (within debounce window)
    expect(onChange).not.toHaveBeenCalled()

    // advance past debounce
    act(() => { vi.advanceTimersByTime(300) })
    expect(onChange).toHaveBeenCalledWith('foo')
    vi.useRealTimers()
  })

  it('calls onChange once after debounce even with rapid input', async () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} debounceMs={300} />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'f' } })
    fireEvent.change(input, { target: { value: 'fo' } })
    fireEvent.change(input, { target: { value: 'foo' } })

    act(() => { vi.advanceTimersByTime(300) })

    // only called once with final value
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('foo')
    vi.useRealTimers()
  })

  // AC-23: SearchInput clear button resets value
  it('shows clear button when value is non-empty and clicking it calls onChange("")', async () => {
    const onChange = vi.fn()
    render(<SearchInput value="foo" onChange={onChange} />)

    const clearBtn = screen.getByRole('button', { name: 'Clear search' })
    expect(clearBtn).toBeInTheDocument()

    await userEvent.click(clearBtn)
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('does not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Find contacts..." />)
    expect(screen.getByPlaceholderText('Find contacts...')).toBeInTheDocument()
  })
})
