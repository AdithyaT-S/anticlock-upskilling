import { Skeleton } from '@/components/ui/skeleton'

export default function ContactDetailLoading() {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-3 mt-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="w-full lg:w-72">
        <div className="rounded-lg border bg-white p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-36" />
        </div>
      </aside>
    </div>
  )
}
