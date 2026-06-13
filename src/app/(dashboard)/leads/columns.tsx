'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { LeadWithContact } from '@/lib/actions/leads'
import { deleteLead } from '@/lib/actions/leads'
import { LEAD_STATUS_LABELS } from '@/lib/validations/lead'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'

function initials(first: string | null, last: string | null) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function scoreColorClass(score: number): string {
  if (score >= 70) return 'text-green-600 font-semibold'
  if (score >= 40) return 'text-yellow-600 font-semibold'
  return 'text-red-600 font-semibold'
}

function ActionsCell({ lead, onDeleted }: { lead: LeadWithContact; onDeleted: () => void }) {
  const [open, setOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteLead(lead.id)
      if (result.error) {
        toast.error(result.error.message)
      } else {
        toast.success('Lead deleted')
        onDeleted()
      }
    })
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/leads/${lead.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onSelect={() => { setOpen(false); setDeleteOpen(true) }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete lead"
        description={`Delete the lead for ${lead.contact_first_name} ${lead.contact_last_name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </>
  )
}

export function makeColumns(onDeleted: () => void): ColumnDef<LeadWithContact>[] {
  return [
    {
      accessorKey: 'contact_first_name',
      header: 'Name & Company',
      enableSorting: true,
      cell: ({ row }) => {
        const l = row.original
        return (
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                {initials(l.contact_first_name, l.contact_last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 leading-tight">
                {l.contact_first_name} {l.contact_last_name}
              </p>
              {l.contact_company && (
                <p className="text-xs text-gray-500 truncate">{l.contact_company}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => {
        const label = LEAD_STATUS_LABELS[row.original.status as keyof typeof LEAD_STATUS_LABELS] ?? row.original.status
        return <StatusBadge status={label} />
      },
    },
    {
      accessorKey: 'score',
      header: 'Score',
      enableSorting: true,
      cell: ({ row }) => (
        <span className={scoreColorClass(row.original.score)}>
          {row.original.score}
        </span>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">{row.original.source ?? '—'}</span>
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
      accessorKey: 'last_activity_at',
      header: 'Last Activity',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-sm text-gray-500">
          {relativeTime(row.original.last_activity_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      cell: ({ row }) => <ActionsCell lead={row.original} onDeleted={onDeleted} />,
    },
  ]
}
