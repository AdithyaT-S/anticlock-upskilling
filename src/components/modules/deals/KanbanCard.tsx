'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { cn } from '@/lib/utils/cn'
import { getInitials, formatCurrency } from '@/lib/utils/format'
import type { DealWithRelations } from '@/types/crm'

interface KanbanCardProps {
  deal: DealWithRelations
  onClick: () => void
}

function isOverdue(closeDate: string | null): boolean {
  if (!closeDate) return false
  return new Date(closeDate) < new Date(new Date().toDateString())
}

export function KanbanCard({ deal, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:   deal.id,
    data: { deal },
    disabled: deal.status !== 'open',
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging ? 0.5 : 1,
  }

  const overdue = isOverdue(deal.close_date)
  const contactName = deal.contact_first_name
    ? `${deal.contact_first_name} ${deal.contact_last_name ?? ''}`.trim()
    : null
  const displayName = contactName ?? deal.contact_company ?? null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow',
        deal.status !== 'open' && 'opacity-75',
        isDragging && 'rotate-1 shadow-lg'
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          className="text-gray-300 hover:text-gray-500 mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
          aria-label="Drag deal"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Card content — clickable */}
        <button
          className="flex-1 text-left min-w-0"
          onClick={onClick}
        >
          <p className="text-sm font-medium text-gray-900 truncate">{deal.name}</p>

          {displayName && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{displayName}</p>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-sm font-semibold text-indigo-600">
              {formatCurrency(deal.value, deal.currency)}
            </span>

            {deal.owner_name && (
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarFallback className="text-[10px] bg-indigo-100 text-indigo-700">
                  {getInitials(deal.owner_name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {deal.close_date && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  overdue ? 'text-red-600' : 'text-gray-400'
                )}
              >
                <Calendar className="w-3 h-3" />
                <span>{new Date(deal.close_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            )}

            {overdue && deal.status === 'open' && (
              <StatusBadge status="Overdue" />
            )}
            {deal.status === 'won' && (
              <StatusBadge status="Won" />
            )}
            {deal.status === 'lost' && (
              <StatusBadge status="Lost" />
            )}
          </div>
        </button>
      </div>
    </div>
  )
}
