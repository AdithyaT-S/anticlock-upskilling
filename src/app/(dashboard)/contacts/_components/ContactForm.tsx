'use client'

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CrudForm } from '@/components/shared/CrudForm'
import { OwnerSelect } from '@/components/shared/OwnerSelect'
import { TagInput } from '@/components/shared/TagInput'
import { contactSchema, type ContactInput, DB_LEAD_SOURCES, LEAD_SOURCE_LABELS } from '@/lib/validations/contact'
import { createContact, updateContact, type OrgMember } from '@/lib/actions/contacts'

interface ContactFormProps {
  contactId?: string
  defaultValues?: Partial<ContactInput>
  members: OrgMember[]
}

export function ContactForm({ contactId, defaultValues, members }: ContactFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name:   '',
      last_name:    '',
      email:        '',
      phone:        '',
      company:      '',
      job_title:    '',
      lead_source:  undefined,
      owner_id:     undefined,
      tags:         [] as string[],
      custom_fields:{} as Record<string, unknown>,
      ...defaultValues,
    },
  })

  const ownerUsers = members.map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.email,
    avatarUrl: m.avatar_url ?? undefined,
  }))

  async function onSubmit(data: ContactInput) {
    startTransition(async () => {
      const result = contactId
        ? await updateContact(contactId, data)
        : await createContact(data)

      if (result.error) {
        if ('fieldErrors' in result.error) {
          Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
            form.setError(field as keyof ContactInput, { message: messages?.[0] })
          })
        } else {
          toast.error((result.error as { message: string }).message)
        }
        return
      }

      toast.success(contactId ? 'Contact updated' : 'Contact created')
      if (result.data) {
        router.push(`/contacts/${result.data.id}`)
      } else {
        router.push('/contacts')
      }
    })
  }

  const isEdit = Boolean(contactId)

  return (
    <CrudForm
      title={isEdit ? 'Edit Contact' : 'New Contact'}
      description={isEdit ? 'Update the contact details below.' : 'Fill in the details to create a new contact.'}
      form={form}
      onSubmit={onSubmit}
      isPending={isPending}
      submitLabel={isEdit ? 'Save changes' : 'Create contact'}
      cancelHref={isEdit ? `/contacts/${contactId}` : '/contacts'}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name <span className="text-red-500">*</span></FormLabel>
              <FormControl><Input placeholder="Jane" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl><Input placeholder="Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl><Input type="tel" placeholder="+91 98765 43210" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="job_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job title</FormLabel>
              <FormControl><Input placeholder="Head of Sales" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="lead_source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead source</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(v) => field.onChange(v || undefined)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DB_LEAD_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>
                      {LEAD_SOURCE_LABELS[src]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="owner_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <OwnerSelect
                  value={field.value ?? null}
                  onChange={(v) => field.onChange(v ?? undefined)}
                  users={ownerUsers}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tags</FormLabel>
            <FormControl>
              <TagInput
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder="Add tag and press Enter..."
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </CrudForm>
  )
}
