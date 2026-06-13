import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDeal, getOrgMembers, getContactOptions } from '@/lib/actions/deals'
import { getPipelines, getAllStagesForOrg } from '@/lib/actions/pipelines'
import { DealForm } from '../../_components/DealForm'

interface EditDealPageProps {
  params: { id: string }
}

export default async function EditDealPage({ params }: EditDealPageProps) {
  const [dealResult, pipelinesResult, stagesResult, membersResult, contactsResult] =
    await Promise.all([
      getDeal(params.id),
      getPipelines(),
      getAllStagesForOrg(),
      getOrgMembers(),
      getContactOptions(),
    ])

  if (!dealResult.data || dealResult.error) notFound()

  const deal     = dealResult.data
  const pipelines = pipelinesResult.data ?? []
  const stages    = stagesResult.data ?? []
  const members   = membersResult.data ?? []
  const contacts  = contactsResult.data ?? []

  if (deal.status !== 'open') {
    return (
      <div className="max-w-lg mx-auto px-6 py-10">
        <Link href="/deals" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to deals
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            This deal is closed ({deal.status}) and cannot be edited.
          </p>
        </div>
      </div>
    )
  }

  const defaultValues = {
    name:        deal.name,
    pipeline_id: deal.pipeline_id,
    stage_id:    deal.stage_id,
    value:       deal.value,
    currency:    deal.currency,
    close_date:  deal.close_date ?? null,
    contact_id:  deal.contact_id ?? null,
    owner_id:    deal.owner_id ?? null,
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <Link href="/deals" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to deals
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Edit deal</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <DealForm
          dealId={params.id}
          defaultValues={defaultValues}
          pipelines={pipelines}
          allStages={stages}
          members={members}
          contacts={contacts}
          onSuccess={() => {}}
        />
      </div>
    </div>
  )
}
