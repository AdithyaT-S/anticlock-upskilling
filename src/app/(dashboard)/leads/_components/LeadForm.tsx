'use client'

import { useState, useTransition } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Check, ChevronsUpDown, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { OwnerSelect } from '@/components/shared/OwnerSelect'
import { PageHeader } from '@/components/shared/PageHeader'
import { cn } from '@/lib/utils/cn'
import {
  leadSchema,
  leadUpdateSchema,
  DB_LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadInput,
  type LeadUpdateInput,
  type SharedLeadFields,
} from '@/lib/validations/lead'
import { DB_LEAD_SOURCES, LEAD_SOURCE_LABELS } from '@/lib/validations/contact'
import { createLead, updateLead, type ContactOption, type OrgMember } from '@/lib/actions/leads'

// ── Shared field components ──────────────────────────────────────────
// All accept UseFormReturn<SharedLeadFields>; callers cast once at the call site.

type SharedForm = UseFormReturn<SharedLeadFields>

function StatusField({ form }: { form: SharedForm }) {
  return (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {DB_LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function ScoreField({ form }: { form: SharedForm }) {
  return (
    <FormField
      control={form.control}
      name="score"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Score (0–100)</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              max={100}
              value={field.value ?? 0}
              onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function SourceField({ form }: { form: SharedForm }) {
  return (
    <FormField
      control={form.control}
      name="source"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Source</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
            </FormControl>
            <SelectContent>
              {DB_LEAD_SOURCES.map((src) => (
                <SelectItem key={src} value={src}>{LEAD_SOURCE_LABELS[src]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function OwnerField({ form, members }: { form: SharedForm; members: OrgMember[] }) {
  const users = members.map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    avatarUrl: m.avatar_url ?? undefined,
  }))

  return (
    <FormField
      control={form.control}
      name="owner_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Owner</FormLabel>
          <FormControl>
            <OwnerSelect
              value={field.value ?? null}
              onChange={(val) => field.onChange(val ?? undefined)}
              users={users}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function NotesField({ form }: { form: SharedForm }) {
  return (
    <FormField
      control={form.control}
      name="notes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Notes</FormLabel>
          <FormControl>
            <textarea
              rows={4}
              maxLength={5000}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              placeholder="Add notes about this lead..."
              value={field.value ?? ''}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

function FormActions({ isPending, isCreate, onCancel }: { isPending: boolean; isCreate: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : isCreate ? 'Create Lead' : 'Save Changes'}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
    </div>
  )
}

// ── CreateLeadForm ───────────────────────────────────────────────────

interface CreateLeadFormProps {
  contacts: ContactOption[]
  members: OrgMember[]
}

export function CreateLeadForm({ contacts, members }: CreateLeadFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [contactOpen, setContactOpen] = useState(false)

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: 'new', score: 0 },
  })

  const sharedForm = form as unknown as SharedForm
  const selectedContactId = form.watch('contact_id')
  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  function onSubmit(data: LeadInput) {
    startTransition(async () => {
      const result = await createLead(data)
      if (result.error) {
        if ('fieldErrors' in result.error) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            form.setError(field as keyof LeadInput, { message: msgs?.[0] })
          })
        } else {
          toast.error(result.error.message)
        }
        return
      }
      toast.success('Lead created')
      router.push(`/leads?id=${result.data!.id}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 -mb-4">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>
      <PageHeader title="New Lead" />

      <div className="max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Contact picker — create only */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Contact <span className="text-red-500">*</span></FormLabel>
                  <Popover open={contactOpen} onOpenChange={setContactOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between font-normal', !field.value && 'text-gray-400')}
                        >
                          {selectedContact
                            ? `${selectedContact.first_name} ${selectedContact.last_name}${selectedContact.company ? ` · ${selectedContact.company}` : ''}`
                            : 'Select a contact'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search contacts..." />
                        <CommandList>
                          <CommandEmpty>No contacts found.</CommandEmpty>
                          <CommandGroup>
                            {contacts.map((c) => (
                              <CommandItem
                                key={c.id}
                                value={`${c.first_name} ${c.last_name} ${c.company ?? ''}`}
                                onSelect={() => { field.onChange(c.id); setContactOpen(false) }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm font-medium">{c.first_name} {c.last_name}</span>
                                  {c.company && <span className="text-xs text-gray-500">{c.company}</span>}
                                </div>
                                <Check className={cn('ml-auto h-4 w-4', field.value === c.id ? 'opacity-100' : 'opacity-0')} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <StatusField form={sharedForm} />
            <ScoreField  form={sharedForm} />
            <SourceField form={sharedForm} />
            <OwnerField  form={sharedForm} members={members} />
            <NotesField  form={sharedForm} />
            <FormActions isPending={isPending} isCreate onCancel={() => router.push('/leads')} />
          </form>
        </Form>
      </div>
    </div>
  )
}

// ── EditLeadForm ─────────────────────────────────────────────────────

interface EditLeadFormProps {
  leadId: string
  defaultValues: LeadUpdateInput & {
    contact_first_name?: string | null
    contact_last_name?: string | null
    contact_company?: string | null
  }
  members: OrgMember[]
}

export function EditLeadForm({ leadId, defaultValues, members }: EditLeadFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<LeadUpdateInput>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {
      status:   defaultValues.status,
      score:    defaultValues.score,
      source:   defaultValues.source,
      owner_id: defaultValues.owner_id,
      notes:    defaultValues.notes ?? '',
    },
  })

  const sharedForm = form as unknown as SharedForm

  function onSubmit(data: LeadUpdateInput) {
    startTransition(async () => {
      const result = await updateLead(leadId, data)
      if (result.error) {
        if ('fieldErrors' in result.error) {
          Object.entries(result.error.fieldErrors).forEach(([field, msgs]) => {
            form.setError(field as keyof LeadUpdateInput, { message: msgs?.[0] })
          })
        } else {
          toast.error(result.error.message)
        }
        return
      }
      toast.success('Lead updated')
      router.push(`/leads?id=${leadId}`)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 -mb-4">
        <Link href="/leads" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </div>
      <PageHeader title="Edit Lead" />

      <div className="max-w-xl">
        {/* Read-only contact — cannot change after creation */}
        <div className="mb-5 space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Contact</label>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {defaultValues.contact_first_name} {defaultValues.contact_last_name}
            {defaultValues.contact_company && (
              <span className="text-gray-400"> · {defaultValues.contact_company}</span>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <StatusField form={sharedForm} />
            <ScoreField  form={sharedForm} />
            <SourceField form={sharedForm} />
            <OwnerField  form={sharedForm} members={members} />
            <NotesField  form={sharedForm} />
            <FormActions isPending={isPending} isCreate={false} onCancel={() => router.push('/leads')} />
          </form>
        </Form>
      </div>
    </div>
  )
}
