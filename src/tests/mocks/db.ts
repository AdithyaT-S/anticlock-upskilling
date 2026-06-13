import { vi } from 'vitest'

export const mockQuery = vi.fn()
export const mockTransaction = vi.fn()

export const mockDb = {
  query: mockQuery,
  transaction: mockTransaction,
}

vi.mock('@/lib/db', () => ({
  query: mockQuery,
  transaction: mockTransaction,
}))

export function resetDbMocks() {
  mockQuery.mockReset()
  mockTransaction.mockReset()
}
