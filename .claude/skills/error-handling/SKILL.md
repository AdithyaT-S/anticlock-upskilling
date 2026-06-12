# Skill: error-handling

Consistent error handling across server actions, pages, and components.

## Server action return shape

All server actions return one of these shapes — never throw to the client:

```typescript
// Success with data
return { data: contact }

// Success with no data
return { success: true }

// Validation error
return { error: parsed.error.flatten() }

// Generic error
return { error: { message: 'Something went wrong' } }
```

Type it explicitly:
```typescript
type ActionResult<T> =
  | { data: T; error?: never }
  | { error: { message: string } | ReturnType<ZodError['flatten']>; data?: never }
```

## Client-side error handling

```typescript
async function onSubmit(data: ContactInput) {
  const result = await createContact(data)

  if (result.error) {
    if ('fieldErrors' in result.error) {
      // Zod field errors — set on form
      Object.entries(result.error.fieldErrors).forEach(([field, messages]) => {
        form.setError(field as keyof ContactInput, { message: messages?.[0] })
      })
    } else {
      toast.error(result.error.message)
    }
    return
  }

  toast.success('Contact saved')
}
```

## Page-level error boundary

```typescript
// src/app/(dashboard)/contacts/error.tsx
'use client'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function ContactsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-sm text-muted-foreground">Something went wrong loading contacts.</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  )
}
```

## Loading state (page-level)

```typescript
// src/app/(dashboard)/contacts/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function ContactsLoading() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
```

## Rules

- Server actions never throw to the client — always return `{ error }` or `{ data }`
- Every module route group gets an `error.tsx` and `loading.tsx`
- Toast for generic errors, form field errors for validation failures
- Log errors server-side (`console.error`) but never expose stack traces to the client
- DB errors: catch in the action, return `{ error: { message: 'Failed to save' } }` — never expose raw SQL errors
