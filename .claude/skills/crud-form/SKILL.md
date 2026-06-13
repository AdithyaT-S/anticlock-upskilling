# Skill: crud-form

Pattern for ALL create/edit forms using react-hook-form + Zod + server actions.
Never build a custom form outside this pattern.

## Pattern

```typescript
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactSchema, type ContactInput } from '@/lib/validations/contact'
import { createContact } from '@/lib/actions/contacts'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ContactFormProps {
  defaultValues?: Partial<ContactInput>
  onSuccess?: () => void
}

export function ContactForm({ defaultValues, onSuccess }: ContactFormProps) {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultValues ?? {
      first_name: '',
      last_name: '',
      email: '',
    },
  })

  async function onSubmit(data: ContactInput) {
    const result = await createContact(data)
    if (result.error) {
      toast.error('Something went wrong')
      return
    }
    toast.success('Contact saved')
    onSuccess?.()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}
```

## Rules

- Always use `zodResolver` — never manual validation
- Always use `Form` / `FormField` / `FormItem` from shadcn — never raw `<input>`
- Always show `toast.success` on success and `toast.error` on failure
- Always disable submit button while `isSubmitting`
- Accept `defaultValues` for edit mode — same component handles create and edit
- Accept `onSuccess` callback — lets parent close a dialog or navigate away
- Never call server actions outside `onSubmit`

## TypeScript gotchas with zodResolver

**Never use `z.coerce` on numeric fields.** `z.coerce.number()` makes the Zod input type `unknown`, which causes `useForm<T>` + `zodResolver` type mismatches ("Type 'unknown' is not assignable to type 'number'"). Use `z.number()` instead and handle the DOM value in `onChange`:
```typescript
// ✅ Correct
onChange={(e) => field.onChange(isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)}

// ❌ Wrong — z.coerce breaks react-hook-form types
score: z.coerce.number().min(0).max(100)
```

**Shared field components across create/edit forms.** When create and edit use different schemas (one requires `contact_id`, the other doesn't), define a shared base type and cast once:
```typescript
type SharedFields = Omit<CreateInput, 'contact_id'>  // fields common to both
type SharedForm = UseFormReturn<SharedFields>

// In each typed form, cast once:
const sharedForm = form as unknown as SharedForm

// Pass to all shared field components without duplication:
<StatusField form={sharedForm} />
<ScoreField  form={sharedForm} />
```

**`ConfirmDialog.onConfirm` requires `() => Promise<void>`.** Make delete handlers `async`:
```typescript
async function handleDelete() { ... }  // ✅
function handleDelete() { ... }        // ❌ Type '() => void' not assignable
```
