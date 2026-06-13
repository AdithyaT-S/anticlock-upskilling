'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { formatCurrencyShort } from '@/lib/utils/format'
import { KanbanCard } from './KanbanCard'
import type { DealWithRelations, PipelineStage } from '@/types/crm'

interface KanbanColumnProps {
  stage: PipelineStage
  deals: DealWithRelations[]
  onCardClick: (deal: DealWithRelations) => void
  onAddDeal: (stageId: string) => void
}

export function KanbanColumn({ stage, deals, onCardClick, onAddDeal }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="flex flex-col min-w-[280px] max-w-[280px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-700 truncate">{stage.name}</span>
          <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">{formatCurrencyShort(totalValue)}</span>
          <button
            onClick={() => onAddDeal(stage.id)}
            className="ml-1 text-gray-400 hover:text-indigo-600 transition-colors flex-shrink-0"
            aria-label={`Add deal to ${stage.name}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 flex flex-col gap-2 p-2 rounded-lg min-h-[120px] transition-colors',
          isOver ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' : 'bg-gray-50'
        )}
      >
        {deals.map((deal) => (
          <KanbanCard
            key={deal.id}
            deal={deal}
            onClick={() => onCardClick(deal)}
          />
        ))}
      </div>
    </div>
  )
}
