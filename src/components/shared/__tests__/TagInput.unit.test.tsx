// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '../TagInput'

describe('TagInput', () => {
  // AC-14: TagInput adds tag on Enter
  it('adds a tag when Enter is pressed', async () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByRole('textbox', { hidden: true })

    await userEvent.type(input, 'enterprise{Enter}')
    expect(onChange).toHaveBeenCalledWith(['enterprise'])
  })

  it('adds a tag when comma is pressed', async () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByRole('textbox', { hidden: true })

    await userEvent.type(input, 'startup,')
    expect(onChange).toHaveBeenCalledWith(['startup'])
  })

  // AC-15: TagInput removes tag on ✕
  it('removes a tag when its remove button is clicked', async () => {
    const onChange = vi.fn()
    render(<TagInput value={['enterprise', 'saas']} onChange={onChange} />)

    const removeBtn = screen.getByRole('button', { name: 'Remove enterprise' })
    await userEvent.click(removeBtn)
    expect(onChange).toHaveBeenCalledWith(['saas'])
  })

  // AC-16: TagInput does not add duplicate tags
  it('does not add a duplicate tag', async () => {
    const onChange = vi.fn()
    render(<TagInput value={['enterprise']} onChange={onChange} />)
    const input = screen.getByRole('textbox', { hidden: true })

    await userEvent.type(input, 'enterprise{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })

  // AC-17: TagInput hides input at maxTags
  it('hides the text input when maxTags is reached', () => {
    render(<TagInput value={['a', 'b', 'c']} onChange={vi.fn()} maxTags={3} />)
    expect(screen.queryByRole('textbox', { hidden: true })).not.toBeInTheDocument()
  })

  it('trims and lowercases tags before adding (BR-04)', async () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    const input = screen.getByRole('textbox', { hidden: true })

    await userEvent.type(input, '  ENTERPRISE  {Enter}')
    expect(onChange).toHaveBeenCalledWith(['enterprise'])
  })

  it('removes last tag on Backspace when input is empty', async () => {
    const onChange = vi.fn()
    render(<TagInput value={['a', 'b']} onChange={onChange} />)
    const input = screen.getByRole('textbox', { hidden: true })

    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(onChange).toHaveBeenCalledWith(['a'])
  })
})
