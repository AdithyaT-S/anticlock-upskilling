import { Phone, Mail, FileText, CheckSquare, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'
import type { Activity } from '@/types/crm'

interface ActivityTimelineProps {
  activities: Activity[]
  isLoading?: boolean
}

const iconMap = {
  call:    { Icon: Phone,       bg: 'bg-blue-100 text-blue-600' },
  email:   { Icon: Mail,        bg: 'bg-indigo-100 text-indigo-600' },
  note:    { Icon: FileText,    bg: 'bg-gray-100 text-gray-600' },
  task:    { Icon: CheckSquare, bg: 'bg-green-100 text-green-600' },
  meeting: { Icon: Calendar,    bg: 'bg-purple-100 text-purple-600' },
} as const


export function ActivityTimeline({ activities, isLoading = false }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4" aria-label="Loading activities">
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
    )
  }

  if (activities.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">No activity yet.</p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-gray-200" aria-hidden />
      <ul className="space-y-0">
        {activities.map((activity) => {
          const config = iconMap[activity.type as keyof typeof iconMap] ?? iconMap.note
          const { Icon, bg } = config
          return (
            <li key={activity.id} className="flex gap-3 relative pb-5 last:pb-0">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                  bg
                )}
                aria-label={activity.type}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                {activity.description && (
                  <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(activity.occurred_at)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
