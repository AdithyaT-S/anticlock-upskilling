// @vitest-environment jsdom
import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '../DataTable'

type Row = { name: string; email: string }

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name', enableSorting: true },
  { accessorKey: 'email', header: 'Email' },
]

const mockData: Row[] = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
]

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  const defaults = {
    columns,
    data: mockData,
    pageCount: 1,
    page: 1,
    onPageChange: vi.fn(),
  }
  return render(<DataTable<Row> {...defaults} {...props} />)
}

describe('DataTable', () => {
  // AC-01: DataTable renders skeleton rows while loading
  it('shows skeleton cells when isLoading is true', () => {
    const { container } = renderTable({ isLoading: true, data: [] })
    // 5 skeleton rows × 2 columns = 10 skeleton elements
    const skeletons = container.querySelectorAll('td')
    expect(skeletons).toHaveLength(10) // 5 rows × 2 cols
    // data rows should not be present
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  // AC-02: DataTable renders empty state when data is empty
  it('shows empty state when data is empty and not loading', () => {
    renderTable({ data: [] })
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('renders custom emptyState node when provided', () => {
    renderTable({
      data: [],
      emptyState: <div>Custom empty state</div>,
    })
    expect(screen.getByText('Custom empty state')).toBeInTheDocument()
  })

  it('renders data rows when data is provided', () => {
    renderTable()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  // AC-03: DataTable sort triggers callback
  it('calls onSortChange when a sortable column header is clicked', async () => {
    const onSortChange = vi.fn()
    renderTable({ onSortChange })
    await userEvent.click(screen.getByRole('button', { name: /name/i }))
    expect(onSortChange).toHaveBeenCalledWith('name', 'asc')
  })

  it('toggles sort direction on second click', async () => {
    const onSortChange = vi.fn()
    renderTable({ onSortChange })
    const nameHeader = screen.getByRole('button', { name: /name/i })
    await userEvent.click(nameHeader)
    await userEvent.click(nameHeader)
    expect(onSortChange).toHaveBeenLastCalledWith('name', 'desc')
  })

  // AC-04: DataTable pagination triggers callback
  it('calls onPageChange with page + 1 when Next is clicked', async () => {
    const onPageChange = vi.fn()
    renderTable({ pageCount: 3, page: 1, onPageChange })
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables Prev button on first page', () => {
    renderTable({ pageCount: 3, page: 1 })
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  })

  it('disables Next button on last page', () => {
    renderTable({ pageCount: 3, page: 3 })
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  // BR-06: pageCount = 0 → hide pagination
  it('hides pagination controls when pageCount is 0', () => {
    renderTable({ pageCount: 0 })
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })
})
