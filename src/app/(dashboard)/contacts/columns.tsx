import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { ContactWithOwner } from '@/lib/actions/contacts'
import { LEAD_SOURCE_LABELS } from '@/lib/validations/contact'
import { getInitials, formatRelativeTime } from '@/lib/utils/format'

export const columns: ColumnDef<ContactWithOwner>[] = [
  {
    accessorKey: 'first_name',
    header: 'Name',
    enableSorting: true,
    cell: ({ row }) => {
      const c = row.original
      return (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
              {getInitials(c.first_name, c.last_name)}
            </AvatarFallback>
          </Avatar>
          <Link
            href={`/contacts/${c.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600 hover:underline underline-offset-4"
          >
            {c.first_name} {c.last_name}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) =>
      row.original.email ? (
        <a
          href={`mailto:${row.original.email}`}
          className="text-gray-600 hover:text-indigo-600 text-sm"
        >
          {row.original.email}
        </a>
      ) : (
        <span className="text-gray-400 text-sm">—</span>
      ),
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">{row.original.company ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'owner_name',
    header: 'Owner',
    enableSorting: false,
    cell: ({ row }) => {
      const name = row.original.owner_name
      if (!name) return <span className="text-gray-400 text-sm">Unassigned</span>
      return (
        <div className="flex items-center gap-1.5">
          <Avatar className="h-5 w-5 flex-shrink-0">
            <AvatarFallback className="text-[10px]">{name[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700">{name}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'lead_source',
    header: 'Lead Source',
    enableSorting: false,
    cell: ({ row }) => {
      const src = row.original.lead_source
      if (!src) return <span className="text-gray-400 text-sm">—</span>
      const label = LEAD_SOURCE_LABELS[src as keyof typeof LEAD_SOURCE_LABELS] ?? src
      return <StatusBadge status={label} />
    },
  },
  {
    accessorKey: 'last_activity_at',
    header: 'Last Activity',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm text-gray-500">
        {row.original.last_activity_at ? formatRelativeTime(row.original.last_activity_at) : '—'}
      </span>
    ),
  },
]
