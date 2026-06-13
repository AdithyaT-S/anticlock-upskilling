import { cn } from '@/lib/utils/cn'

type Priority = 'low' | 'medium' | 'high' | 'urgent'

interface PriorityDotProps {
  priority: Priority
  showLabel?: boolean
}

const dotColor: Record<Priority, string> = {
  low:    'bg-gray-400',
  medium: 'bg-amber-400',
  high:   'bg-orange-500',
  urgent: 'bg-red-600',
}

export function PriorityDot({ priority, showLabel = false }: PriorityDotProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn('w-2 h-2 rounded-full flex-shrink-0', dotColor[priority])}
        aria-label={priority}
      />
      {showLabel && (
        <span className="text-sm text-gray-700 capitalize">{priority}</span>
      )}
    </div>
  )
}
