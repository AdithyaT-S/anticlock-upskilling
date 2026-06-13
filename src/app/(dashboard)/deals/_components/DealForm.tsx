'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { OwnerSelect } from '@/components/shared/OwnerSelect'
import { createDeal, updateDeal } from '@/lib/actions/deals'
import { dealSchema, type DealInput } from '@/lib/validations/deal'
import type { Pipeline, PipelineStage } from '@/types/crm'
import type { OrgMember, ContactOption } from '@/lib/actions/deals'

interface DealFormProps {
  dealId?: string
  defaultValues?: Partial<DealInput>
  pipelines: Pipeline[]
  allStages: PipelineStage[]
  members: OrgMember[]
  contacts: ContactOption[]
  onSuccess?: () => void
}

export function DealForm({
  dealId,
  defaultValues,
  pipelines,
  allStages,
  members,
  contacts,
  onSuccess,
}: DealFormProps) {
  const isEdit = Boolean(dealId)

  const form = useForm<DealInput>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name:        '',
      pipeline_id: pipelines[0]?.id ?? '',
      stage_id:    '',
      value:       0,
      currency:    'INR',
      close_date:  null,
      contact_id:  null,
      owner_id:    null,
      ...defaultValues,
    },
  })

  const selectedPipelineId = form.watch('pipeline_id')
  const stagesForPipeline = allStages.filter((s) => s.pipeline_id === selectedPipelineId)

  // When pipeline changes, reset stage_id to first stage of new pipeline
  useEffect(() => {
    const currentStageId = form.getValues('stage_id')
    const validForPipeline = stagesForPipeline.some((s) => s.id === currentStageId)
    if (!validForPipeline && stagesForPipeline.length > 0) {
      form.setValue('stage_id', stagesForPipeline[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPipelineId])

  const ownerUsers = members.map((m) => ({
    id:       m.id,
    name:     m.full_name,
    email:    m.email,
    avatarUrl: m.avatar_url ?? undefined,
  }))

  async function onSubmit(data: DealInput) {
    const result = isEdit
      ? await updateDeal(dealId!, data)
      : await createDeal(data)

    if (result.error) {
      if ('fieldErrors' in result.error) {
        Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
          form.setError(field as keyof DealInput, { message: (messages as string[])?.[0] })
        })
      } else {
        toast.error(result.error.message)
      }
      return
    }

    toast.success(isEdit ? 'Deal updated' : 'Deal created')
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Deal name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Enterprise ERP Suite" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pipeline */}
        <FormField
          control={form.control}
          name="pipeline_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pipeline *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Stage */}
        <FormField
          control={form.control}
          name="stage_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage *</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={stagesForPipeline.length === 0}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {stagesForPipeline.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Value + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={field.value}
                    onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Close date */}
        <FormField
          control={form.control}
          name="close_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected close date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact */}
        {contacts.length > 0 && (
          <FormField
            control={form.control}
            name="contact_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Linked contact</FormLabel>
                <Select value={field.value ?? ''} onValueChange={(v) => field.onChange(v || null)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No contact linked" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No contact</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                        {c.company ? ` · ${c.company}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Owner */}
        <FormField
          control={form.control}
          name="owner_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner</FormLabel>
              <FormControl>
                <OwnerSelect
                  value={field.value ?? null}
                  onChange={field.onChange}
                  users={ownerUsers}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : isEdit ? 'Update deal' : 'Create deal'}
        </Button>
      </form>
    </Form>
  )
}
