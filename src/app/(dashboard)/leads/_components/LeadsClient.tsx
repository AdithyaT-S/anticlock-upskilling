'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/DataTable'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { LeadDetailPanel } from './LeadDetailPanel'
import { makeColumns } from '../columns'
import type { LeadWithContact, OrgMember } from '@/lib/actions/leads'
import { DB_LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/validations/lead'
import type { Activity } from '@/types/crm'

interface LeadsClientProps {
  leads: LeadWithContact[]
  total: number
  page: number
  pageCount: number
  members: OrgMember[]
  selectedLead: LeadWithContact | null
  selectedLeadActivities: Activity[]
}

export function LeadsClient({
  leads,
  total,
  page,
  pageCount,
  members,
  selectedLead,
  selectedLeadActivities,
}: LeadsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const statusFilter = searchParams.get('status') ?? ''
  const ownerFilter = searchParams.get('owner_id') ?? ''
  const selectedId = searchParams.get('id') ?? ''

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSortChange(column: string, dir: 'asc' | 'desc') {
    updateParams({ sort: column, dir })
  }

  function handleRowClick(lead: LeadWithContact) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('id', lead.id)
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleClosePanel() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleDeleted = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('id')
    router.push(`${pathname}?${params.toString()}`)
    router.refresh()
  }, [pathname, router, searchParams])

  const columns = useMemo(() => makeColumns(handleDeleted), [handleDeleted])

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        subtitle={`${total.toLocaleString()} lead${total !== 1 ? 's' : ''}`}
        actions={
          <Button size="sm" asChild>
            <Link href="/leads/new">
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Lead
            </Link>
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={statusFilter || 'all'}
          onValueChange={(v) => updateParams({ status: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {DB_LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={ownerFilter || 'all'}
          onValueChange={(v) => updateParams({ owner_id: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        pageCount={pageCount}
        page={page}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        isLoading={isPending}
        onRowClick={handleRowClick}
        emptyState={
          <EmptyState
            title="No leads found"
            description={
              statusFilter || ownerFilter
                ? 'Try adjusting your filters.'
                : 'Add your first lead to start tracking your pipeline.'
            }
            action={
              !statusFilter && !ownerFilter
                ? { label: 'Add Lead', href: '/leads/new' }
                : undefined
            }
          />
        }
      />

      {/* Slide-over detail panel */}
      {selectedLead && selectedId === selectedLead.id && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={handleClosePanel}
            aria-hidden
          />
          <LeadDetailPanel
            lead={selectedLead}
            activities={selectedLeadActivities}
            onClose={handleClosePanel}
          />
        </>
      )}
    </div>
  )
}
