'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ActivityTimeline } from '@/components/shared/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { OwnerSelect } from '@/components/shared/OwnerSelect'
import { TagInput } from '@/components/shared/TagInput'
import { deleteContact, updateContact, type ContactWithOwner, type OrgMember } from '@/lib/actions/contacts'
import { LEAD_SOURCE_LABELS, type ContactInput } from '@/lib/validations/contact'
import type { Activity } from '@/types/crm'

interface ContactDetailProps {
  contact: ContactWithOwner & { owner_avatar_url?: string | null }
  activities: Activity[]
  canEdit: boolean
  members: OrgMember[]
  dealsCount: number
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function ContactDetail({ contact, activities, canEdit, members, dealsCount }: ContactDetailProps) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isUpdating, startUpdateTransition] = useTransition()

  const ownerUsers = members.map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    avatarUrl: m.avatar_url ?? undefined,
  }))

  function buildPayload(overrides: Partial<ContactInput>) {
    return {
      first_name:    contact.first_name,
      last_name:     contact.last_name ?? '',
      email:         contact.email ?? '',
      phone:         contact.phone ?? '',
      company:       contact.company ?? '',
      job_title:     contact.job_title ?? '',
      lead_source:   contact.lead_source as ContactInput['lead_source'] ?? undefined,
      owner_id:      contact.owner_id ?? undefined,
      tags:          contact.tags,
      custom_fields: contact.custom_fields,
      ...overrides,
    }
  }

  function handleOwnerChange(newOwnerId: string | null) {
    startUpdateTransition(async () => {
      const result = await updateContact(contact.id, buildPayload({ owner_id: newOwnerId ?? undefined }))
      if (result.error) toast.error((result.error as { message: string }).message)
      else router.refresh()
    })
  }

  function handleTagsChange(newTags: string[]) {
    startUpdateTransition(async () => {
      const result = await updateContact(contact.id, buildPayload({ tags: newTags }))
      if (result.error) toast.error((result.error as { message: string }).message)
      else router.refresh()
    })
  }

  async function handleDelete() {
    startTransition(async () => {
      const result = await deleteContact(contact.id)
      if (result.error) {
        toast.error((result.error as { message: string }).message)
        return
      }
      toast.success('Contact deleted')
      router.push('/contacts')
    })
  }

  const leadSourceLabel = contact.lead_source
    ? LEAD_SOURCE_LABELS[contact.lead_source as keyof typeof LEAD_SOURCE_LABELS] ?? contact.lead_source
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* ── Left: main content ─────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Contact header card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 flex-shrink-0">
                <AvatarFallback className="text-xl bg-indigo-100 text-indigo-700">
                  {initials(contact.first_name, contact.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {contact.first_name} {contact.last_name}
                </h1>
                {(contact.company || contact.job_title) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[contact.job_title, contact.company].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 hover:underline">
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="text-sm text-gray-600 hover:underline">
                      {contact.phone}
                    </a>
                  )}
                  {leadSourceLabel && <StatusBadge status={leadSourceLabel} />}
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/contacts/${contact.id}/edit`}>
                    <Pencil className="w-4 h-4 mr-1.5" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Activity tabs */}
        <div className="rounded-lg border bg-white">
          <Tabs defaultValue="activity">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-6 pt-2">
              <TabsTrigger value="activity" className="pb-2">Activity</TabsTrigger>
              <TabsTrigger value="emails" className="pb-2">Emails</TabsTrigger>
              <TabsTrigger value="files" className="pb-2">Files</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="p-6">
              <ActivityTimeline activities={activities} />
            </TabsContent>
            <TabsContent value="emails" className="p-6">
              <p className="text-sm text-gray-500 text-center py-8">Email threads — coming soon.</p>
            </TabsContent>
            <TabsContent value="files" className="p-6">
              <p className="text-sm text-gray-500 text-center py-8">Files — coming soon.</p>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Right: sidebar ──────────────────────────────────────────── */}
      <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
        <div className="rounded-lg border bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">About contact</h3>
          <dl className="space-y-3">

            {/* Owner — inline editable for admin/member */}
            <div>
              <dt className="text-xs text-gray-500 mb-1">Owner</dt>
              <dd>
                {canEdit ? (
                  <OwnerSelect
                    value={contact.owner_id ?? null}
                    onChange={handleOwnerChange}
                    users={ownerUsers}
                    disabled={isUpdating}
                  />
                ) : contact.owner_name ? (
                  <div className="flex items-center gap-1.5 text-sm text-gray-900">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {contact.owner_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {contact.owner_name}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unassigned</span>
                )}
              </dd>
            </div>
            <Separator />

            {/* Tags — inline editable for admin/member */}
            <div>
              <dt className="text-xs text-gray-500 mb-1">Tags</dt>
              <dd>
                {canEdit ? (
                  <TagInput
                    value={contact.tags}
                    onChange={handleTagsChange}
                    placeholder="Add tag..."
                  />
                ) : contact.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No tags</span>
                )}
              </dd>
            </div>
            <Separator />

            {contact.lead_source && (
              <>
                <div>
                  <dt className="text-xs text-gray-500 mb-0.5">Lead source</dt>
                  <dd><StatusBadge status={leadSourceLabel!} /></dd>
                </div>
                <Separator />
              </>
            )}

            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Associated deals</dt>
              <dd className="text-sm text-gray-700">{dealsCount}</dd>
            </div>
            <Separator />

            <div>
              <dt className="text-xs text-gray-500 mb-0.5">Created</dt>
              <dd className="text-sm text-gray-700">
                {new Date(contact.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Custom fields */}
        {Object.keys(contact.custom_fields).length > 0 && (
          <div className="rounded-lg border bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Custom fields</h3>
            <dl className="space-y-3">
              {Object.entries(contact.custom_fields).map(([key, val]) => (
                <div key={key}>
                  <dt className="text-xs text-gray-500 capitalize mb-0.5">{key.replace(/_/g, ' ')}</dt>
                  <dd className="text-sm text-gray-700">{String(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </aside>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete contact"
        description={`Are you sure you want to delete ${contact.first_name} ${contact.last_name}? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  )
}
