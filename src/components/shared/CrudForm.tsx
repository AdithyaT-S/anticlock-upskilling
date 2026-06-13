'use client'

import { ReactNode } from 'react'
import { FieldValues, UseFormReturn } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface CrudFormProps<T extends FieldValues> {
  title: string
  description?: string
  form: UseFormReturn<T>
  onSubmit: (values: T) => Promise<void>
  isPending?: boolean
  submitLabel?: string
  cancelHref?: string
  children: ReactNode
}

export function CrudForm<T extends FieldValues>({
  title,
  description,
  form,
  onSubmit,
  isPending = false,
  submitLabel = 'Save',
  cancelHref,
  children,
}: CrudFormProps<T>) {
  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {children}
          <div className="flex items-center gap-3 pt-2">
            {cancelHref && (
              <Link
                href={cancelHref}
                className="text-sm text-gray-500 hover:text-gray-700 underline-offset-4 hover:underline"
              >
                Cancel
              </Link>
            )}
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitLabel}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  )
}
