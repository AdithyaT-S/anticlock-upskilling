'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Upload, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/DataTable'
import { SearchInput } from '@/components/shared/SearchInput'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { columns } from '../columns'
import type { ContactWithOwner, OrgMember, ImportResult } from '@/lib/actions/contacts'
import { importContactsCSV } from '@/lib/actions/contacts'
import { DB_LEAD_SOURCES, LEAD_SOURCE_LABELS } from '@/lib/validations/contact'

interface ContactsClientProps {
  contacts: ContactWithOwner[]
  total: number
  page: number
  per_page: number
  pageCount: number
  members: OrgMember[]
}

export function ContactsClient({
  contacts,
  total,
  page,
  pageCount,
  members,
}: ContactsClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    params.delete('page') // reset to page 1 on filter/search change
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSearch = useCallback(
    (value: string) => updateParams({ q: value }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname]
  )

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(newPage))
    router.push(`${pathname}?${params.toString()}`)
  }

  function handleSortChange(column: string, dir: 'asc' | 'desc') {
    updateParams({ sort: column, dir })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.set('file', file)

    startTransition(async () => {
      const result = await importContactsCSV(formData)
      if (result.error) {
        toast.error(result.error.message)
      } else if (result.data) {
        setImportResult(result.data)
        toast.success(`${result.data.imported} contacts imported`)
        router.refresh()
      }
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const ownerFilter = searchParams.get('owner_id') ?? ''
  const leadSourceFilter = searchParams.get('lead_source') ?? ''
  const searchValue = searchParams.get('q') ?? ''

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        subtitle={`${total.toLocaleString()} contact${total !== 1 ? 's' : ''}`}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Import CSV file"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button size="sm" asChild>
              <Link href="/contacts/new">
                <UserPlus className="w-4 h-4 mr-2" />
                New Contact
              </Link>
            </Button>
          </>
        }
      />

      {/* Import result summary */}
      {importResult && importResult.errors.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-1">
          <p className="font-medium text-amber-800">
            {importResult.imported} imported · {importResult.skipped} skipped ·{' '}
            {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}
          </p>
          <ul className="list-disc pl-4 text-amber-700 space-y-0.5">
            {importResult.errors.slice(0, 5).map((e) => (
              <li key={e.row}>
                {e.row > 0 ? `Row ${e.row}: ` : ''}{e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={searchValue}
          onChange={handleSearch}
          placeholder="Search contacts..."
        />

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

        <Select
          value={leadSourceFilter || 'all'}
          onValueChange={(v) => updateParams({ lead_source: v === 'all' ? undefined : v })}
        >
          <SelectTrigger className="w-44 text-sm">
            <SelectValue placeholder="All lead sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All lead sources</SelectItem>
            {DB_LEAD_SOURCES.map((src) => (
              <SelectItem key={src} value={src}>
                {LEAD_SOURCE_LABELS[src]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={contacts}
        pageCount={pageCount}
        page={page}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        isLoading={isPending}
        emptyState={
          <EmptyState
            title="No contacts found"
            description={
              searchValue || ownerFilter || leadSourceFilter
                ? 'Try adjusting your filters.'
                : 'Add your first contact to get started.'
            }
            action={
              !searchValue && !ownerFilter && !leadSourceFilter
                ? { label: 'New Contact', href: '/contacts/new' }
                : undefined
            }
          />
        }
      />
    </div>
  )
}
