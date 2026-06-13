import { Suspense } from 'react'
import { DealsClient } from './_components/DealsClient'
import { ensureDefaultPipeline, getPipelines, getAllStagesForOrg } from '@/lib/actions/pipelines'
import { getDealsForPipeline, getContactOptions, getOrgMembers } from '@/lib/actions/deals'
import { getAuthUser } from '@/lib/auth'

interface DealsPageProps {
  searchParams: { pipeline?: string; deal?: string }
}

export default async function DealsPage({ searchParams }: DealsPageProps) {
  const user = await getAuthUser()
  if (!user) return null

  // Ensure a default pipeline exists for this org
  const { pipelineId: defaultPipelineId } = await ensureDefaultPipeline()

  // Determine which pipeline to show
  const requestedPipelineId = searchParams.pipeline ?? defaultPipelineId

  // Fetch all data in parallel
  const [pipelinesResult, stagesResult, dealsResult, contactsResult, membersResult] =
    await Promise.all([
      getPipelines(),
      getAllStagesForOrg(),
      getDealsForPipeline(requestedPipelineId),
      getContactOptions(),
      getOrgMembers(),
    ])

  const pipelines = pipelinesResult.data ?? []
  const stages    = stagesResult.data ?? []
  const deals     = dealsResult.data ?? []
  const contacts  = contactsResult.data ?? []
  const members   = membersResult.data ?? []

  // If requested pipeline doesn't exist in org, fall back to default
  const validPipelineId = pipelines.some((p) => p.id === requestedPipelineId)
    ? requestedPipelineId
    : defaultPipelineId

  return (
    <div className="flex-1 bg-gray-50 overflow-hidden">
      <div className="h-full px-6 py-6 overflow-x-auto">
        <Suspense>
          <DealsClient
            pipelines={pipelines}
            stages={stages}
            initialDeals={deals}
            currentPipelineId={validPipelineId}
            currentUserId={user.id}
            isAdmin={user.role === 'admin'}
            members={members}
            contacts={contacts}
          />
        </Suspense>
      </div>
    </div>
  )
}
