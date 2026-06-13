'use server'

import { queryForOrg } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import type { Pipeline, PipelineStage } from '@/types/crm'

const DEFAULT_STAGES = [
  { name: 'New',         position: 0, probability: 10 },
  { name: 'Qualified',   position: 1, probability: 30 },
  { name: 'Proposal',    position: 2, probability: 60 },
  { name: 'Negotiation', position: 3, probability: 80 },
  { name: 'Closed Won',  position: 4, probability: 100 },
  { name: 'Closed Lost', position: 5, probability: 0 },
]

export async function getPipelines() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const pipelines = await queryForOrg<Pipeline>(
    user.orgId,
    user.id,
    `SELECT id, org_id, name, is_default, created_at
     FROM pipelines
     WHERE org_id = $1
     ORDER BY is_default DESC, name ASC`,
    [user.orgId]
  )

  return { data: pipelines }
}

export async function getPipelineWithStages(pipelineId: string) {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const [pipeline] = await queryForOrg<{ id: string }>(
    user.orgId,
    user.id,
    `SELECT id FROM pipelines WHERE id = $1 AND org_id = $2`,
    [pipelineId, user.orgId]
  )
  if (!pipeline) return { error: { message: 'Pipeline not found' } }

  const stages = await queryForOrg<PipelineStage>(
    user.orgId,
    user.id,
    `SELECT id, pipeline_id, name, position, probability, created_at
     FROM pipeline_stages
     WHERE pipeline_id = $1
     ORDER BY position ASC`,
    [pipelineId]
  )

  return { data: stages }
}

export async function getAllStagesForOrg() {
  const user = await getAuthUser()
  if (!user) return { error: { message: 'Unauthorized' } }

  const stages = await queryForOrg<PipelineStage>(
    user.orgId,
    user.id,
    `SELECT ps.id, ps.pipeline_id, ps.name, ps.position, ps.probability, ps.created_at
     FROM pipeline_stages ps
     JOIN pipelines p ON p.id = ps.pipeline_id
     WHERE p.org_id = $1
     ORDER BY ps.pipeline_id, ps.position ASC`,
    [user.orgId]
  )

  return { data: stages }
}

export async function ensureDefaultPipeline(): Promise<{ pipelineId: string; stages: PipelineStage[] }> {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')

  const existing = await queryForOrg<{ id: string; is_default: boolean }>(
    user.orgId,
    user.id,
    `SELECT id, is_default FROM pipelines WHERE org_id = $1 ORDER BY is_default DESC, created_at ASC`,
    [user.orgId]
  )

  let pipelineId: string

  if (existing.length > 0) {
    pipelineId = existing[0].id
  } else {
    const [pipeline] = await queryForOrg<{ id: string }>(
      user.orgId,
      user.id,
      `INSERT INTO pipelines (org_id, name, is_default) VALUES ($1, $2, true) RETURNING id`,
      [user.orgId, 'Sales Pipeline']
    )
    pipelineId = pipeline.id

    for (const stage of DEFAULT_STAGES) {
      await queryForOrg(
        user.orgId,
        user.id,
        `INSERT INTO pipeline_stages (pipeline_id, name, position, probability)
         VALUES ($1, $2, $3, $4)`,
        [pipelineId, stage.name, stage.position, stage.probability]
      )
    }
  }

  const stages = await queryForOrg<PipelineStage>(
    user.orgId,
    user.id,
    `SELECT id, pipeline_id, name, position, probability, created_at
     FROM pipeline_stages
     WHERE pipeline_id = $1
     ORDER BY position ASC`,
    [pipelineId]
  )

  return { pipelineId, stages }
}
