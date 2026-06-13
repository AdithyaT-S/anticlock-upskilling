# Skill: data-table

`src/components/shared/DataTable.tsx` is the ONLY table component in the project.
Never create another table. Use this for ALL list pages.

## Usage in a page

```typescript
import { DataTable } from '@/components/shared/DataTable'
import { columns } from './columns'
import { getContacts } from '@/lib/actions/contacts'
import { getAuthUser } from '@/lib/auth'

export default async function ContactsPage() {
  const user = await getAuthUser()
  const contacts = await getContacts(user.orgId, user.id)

  return <DataTable columns={columns} data={contacts} searchKey="email" />
}
```

## Column definition (columns.tsx — one file per module)

```typescript
import { ColumnDef } from '@tanstack/react-table'
import type { Contact } from '@/types/crm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getInitials, formatRelativeTime } from '@/lib/utils/format'  // ← always use shared utils

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: 'first_name',
    header: 'Name',
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">
              {getInitials(c.first_name, c.last_name)}
            </AvatarFallback>
          </Avatar>
          <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">
            {c.first_name} {c.last_name}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'company',
    header: 'Company',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'last_activity_at',
    header: 'Last Activity',
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">
        {row.original.last_activity_at ? formatRelativeTime(row.original.last_activity_at) : '—'}
      </span>
    ),
  },
]
```

## DataTable component props

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  searchKey?: string        // enables built-in search on this column
  isLoading?: boolean       // shows skeleton rows
}
```

## Shared format utilities for columns

These already exist in `@/lib/utils/format` — import them, never redefine:

| Function | Use for |
|----------|---------|
| `getInitials(first, last?)` | Avatar fallback — first+last or full-name string |
| `formatRelativeTime(date)` | Last activity, last updated, created_at columns |
| `formatDate(date)` | Close date, due date — renders `15 Jan 2026` |
| `formatDateTime(date)` | Timestamps with time — renders `15 Jan 2026, 09:30 AM` |
| `formatCurrency(amount, currency?)` | Deal value, invoice amount |
| `formatCurrencyShort(amount)` | Column/header totals — renders `₹75K`, `$1.2M` |
| `scoreColorClass(score)` | Lead score color — returns only the color class, add font weight separately |

## Rules

- DataTable handles sort, pagination, and search internally — never re-implement these
- Always define columns in a separate `columns.tsx` file in the module folder
- Never build a raw `<table>` in any page component
- Use `StatusBadge` from shared for any status column — never inline badges
- Row click navigation belongs in the `cell` renderer of the name column
- Never define `initials()`, `relativeTime()`, `scoreColorClass()` locally — use `@/lib/utils/format`
