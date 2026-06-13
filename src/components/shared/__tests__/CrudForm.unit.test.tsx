// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { CrudForm } from '../CrudForm'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

function TestForm({
  onSubmit = vi.fn(),
  isPending = false,
  cancelHref,
}: {
  onSubmit?: ReturnType<typeof vi.fn>
  isPending?: boolean
  cancelHref?: string
}) {
  const form = useForm<{ name: string }>({ defaultValues: { name: '' } })
  return (
    <CrudForm
      title="Test Form"
      form={form}
      onSubmit={onSubmit}
      isPending={isPending}
      cancelHref={cancelHref}
    >
      <input {...form.register('name')} aria-label="name" />
    </CrudForm>
  )
}

describe('CrudForm', () => {
  // AC-05: CrudForm disables submit while pending
  it('disables submit button and shows spinner when isPending is true', () => {
    render(<TestForm isPending />)
    const submit = screen.getByRole('button', { name: /save/i })
    expect(submit).toBeDisabled()
    expect(submit.querySelector('svg')).toBeInTheDocument()
  })

  it('submit button is enabled when isPending is false', () => {
    render(<TestForm />)
    expect(screen.getByRole('button', { name: /save/i })).not.toBeDisabled()
  })

  // AC-06: CrudForm calls onSubmit with form values
  it('calls onSubmit when form is submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<TestForm onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('name'), 'Acme Corp')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Acme Corp' }),
      expect.anything()
    )
  })

  it('renders title', () => {
    render(<TestForm />)
    expect(screen.getByText('Test Form')).toBeInTheDocument()
  })

  it('renders Cancel link when cancelHref is provided', () => {
    render(<TestForm cancelHref="/contacts" />)
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/contacts')
  })

  it('does not render Cancel link when cancelHref is absent', () => {
    render(<TestForm />)
    expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument()
  })
})
