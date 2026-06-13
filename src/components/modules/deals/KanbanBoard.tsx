'use client'

import { useState, useCallback, useEffect } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { toast } from 'sonner'
import { KanbanColumn } from './KanbanColumn'
import { moveDealStage } from '@/lib/actions/deals'
import { EmptyState } from '@/components/shared/EmptyState'
import { Briefcase } from 'lucide-react'
import type { DealWithRelations, PipelineStage } from '@/types/crm'

interface KanbanBoardProps {
  stages: PipelineStage[]
  initialDeals: DealWithRelations[]
  onCardClick: (deal: DealWithRelations) => void
  onAddDeal: (stageId: string) => void
  filterMyDeals: boolean
  currentUserId: string
}

export function KanbanBoard({
  stages,
  initialDeals,
  onCardClick,
  onAddDeal,
  filterMyDeals,
  currentUserId,
}: KanbanBoardProps) {
  const [deals, setDeals] = useState<DealWithRelations[]>(initialDeals)

  // Sync when parent re-fetches (pipeline switch reloads page.tsx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDeals(initialDeals) }, [initialDeals])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const displayedDeals = filterMyDeals
    ? deals.filter((d) => d.owner_id === currentUserId)
    : deals

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedDeal = deals.find((d) => d.id === active.id)
    if (!draggedDeal || draggedDeal.status !== 'open') return

    const targetStageId = over.id as string
    if (draggedDeal.stage_id === targetStageId) return

    const targetStage = stages.find((s) => s.id === targetStageId)
    if (!targetStage) return

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        d.id === draggedDeal.id
          ? { ...d, stage_id: targetStageId, stage_name: targetStage.name, stage_position: targetStage.position }
          : d
      )
    )

    const result = await moveDealStage({ deal_id: draggedDeal.id, stage_id: targetStageId })
    if (result.error) {
      toast.error('message' in result.error ? result.error.message : 'Failed to move deal')
      // Revert
      setDeals((prev) =>
        prev.map((d) =>
          d.id === draggedDeal.id ? draggedDeal : d
        )
      )
    }
  }, [deals, stages])

  if (stages.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No stages configured"
        description="Add stages to this pipeline in Settings."
      />
    )
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={displayedDeals.filter((d) => d.stage_id === stage.id)}
            onCardClick={onCardClick}
            onAddDeal={onAddDeal}
          />
        ))}
      </div>
    </DndContext>
  )
}
