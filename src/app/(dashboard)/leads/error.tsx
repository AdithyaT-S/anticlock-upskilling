'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <p className="text-sm text-muted-foreground">Something went wrong loading leads.</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  )
}
