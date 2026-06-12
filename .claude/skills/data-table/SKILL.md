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
import { Contact } from '@/types/crm'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const columns: ColumnDef<Contact>[] = [
  {
    accessorKey: 'first_name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">
            {row.original.first_name[0]}{row.original.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <Link href={`/contacts/${row.original.id}`} className="font-medium hover:underline">
          {row.original.first_name} {row.original.last_name}
        </Link>
      </div>
    ),
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

## Rules

- DataTable handles sort, pagination, and search internally — never re-implement these
- Always define columns in a separate `columns.tsx` file in the module folder
- Never build a raw `<table>` in any page component
- Use `StatusBadge` from shared for any status column — never inline badges
- Row click navigation belongs in the `cell` renderer of the name column
