'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { KanbanBoard } from '@/components/modules/deals/KanbanBoard'
import { DealForm } from './DealForm'
import { DealDetailPanel } from './DealDetailPanel'
import { getDeal } from '@/lib/actions/deals'
import { cn } from '@/lib/utils/cn'
import type { Pipeline, PipelineStage, DealWithRelations } from '@/types/crm'
import type { DealDetail, OrgMember, ContactOption } from '@/lib/actions/deals'

interface DealsClientProps {
  pipelines: Pipeline[]
  stages: PipelineStage[]
  initialDeals: DealWithRelations[]
  currentPipelineId: string
  currentUserId: string
  isAdmin: boolean
  members: OrgMember[]
  contacts: ContactOption[]
}

export function DealsClient({
  pipelines,
  stages,
  initialDeals,
  currentPipelineId,
  currentUserId,
  isAdmin,
  members,
  contacts,
}: DealsClientProps) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const dealParam  = searchParams.get('deal')
  const [filterMyDeals, setFilterMyDeals] = useState(false)

  // Form sheet state
  const [formOpen, setFormOpen]           = useState(false)
  const [formDefaultStageId, setFormDefaultStageId] = useState<string | undefined>()

  // Detail panel state
  const [detailDeal, setDetailDeal]       = useState<DealDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Open deal detail when ?deal= param is set
  useEffect(() => {
    if (!dealParam) {
      setDetailDeal(null)
      return
    }
    setDetailLoading(true)
    getDeal(dealParam).then((result) => {
      setDetailLoading(false)
      if (result.data) setDetailDeal(result.data)
    })
  }, [dealParam])

  function openDealDetail(deal: DealWithRelations) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('deal', deal.id)
    router.push(`${pathname}?${params.toString()}`)
  }

  function closeDealDetail() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('deal')
    router.push(`${pathname}?${params.toString()}`)
    setDetailDeal(null)
  }

  function handlePipelineChange(pipelineId: string) {
    const params = new URLSearchParams()
    params.set('pipeline', pipelineId)
    router.push(`${pathname}?${params.toString()}`)
  }

  const openFormForStage = useCallback((stageId: string) => {
    setFormDefaultStageId(stageId)
    setFormOpen(true)
  }, [])

  const openNewDeal = useCallback(() => {
    setFormDefaultStageId(undefined)
    setFormOpen(true)
  }, [])

  const currentPipeline = pipelines.find((p) => p.id === currentPipelineId)
  const currentStages   = stages.filter((s) => s.pipeline_id === currentPipelineId)

  const formDefaultValues = formDefaultStageId
    ? { pipeline_id: currentPipelineId, stage_id: formDefaultStageId }
    : { pipeline_id: currentPipelineId }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Deals</h1>

          {pipelines.length > 1 && (
            <Select value={currentPipelineId} onValueChange={handlePipelineChange}>
              <SelectTrigger className="w-44 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {pipelines.length === 1 && currentPipeline && (
            <span className="text-sm text-gray-500">{currentPipeline.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterMyDeals((v) => !v)}
            className={cn(
              'text-sm',
              filterMyDeals && 'bg-indigo-50 border-indigo-300 text-indigo-700'
            )}
          >
            <Filter className="w-4 h-4 mr-1.5" />
            My Deals
          </Button>

          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={openNewDeal}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <KanbanBoard
        stages={currentStages}
        initialDeals={initialDeals}
        onCardClick={openDealDetail}
        onAddDeal={openFormForStage}
        filterMyDeals={filterMyDeals}
        currentUserId={currentUserId}
      />

      {/* New deal form sheet */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New deal</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <DealForm
              pipelines={pipelines}
              allStages={stages}
              members={members}
              contacts={contacts}
              defaultValues={formDefaultValues}
              onSuccess={() => {
                setFormOpen(false)
                router.refresh()
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Deal detail panel */}
      <Sheet open={Boolean(dealParam)} onOpenChange={(open) => { if (!open) closeDealDetail() }}>
        <SheetContent className="w-full sm:max-w-lg p-0 overflow-hidden flex flex-col">
          {detailLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {detailDeal && !detailLoading && (
            <DealDetailPanel
              deal={detailDeal}
              isAdmin={isAdmin}
              onClose={closeDealDetail}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
