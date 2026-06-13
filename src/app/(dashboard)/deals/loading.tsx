import { Skeleton } from '@/components/ui/skeleton'

export default function DealsLoading() {
  return (
    <div className="flex-1 bg-gray-50 px-6 py-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-9 w-44" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Kanban column skeletons */}
      <div className="flex gap-4 overflow-x-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-[280px] max-w-[280px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="bg-gray-100 rounded-lg p-2 space-y-2 min-h-[120px]">
              {Array.from({ length: i === 0 ? 3 : i === 1 ? 2 : 1 }).map((_, j) => (
                <div key={j} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between mt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
