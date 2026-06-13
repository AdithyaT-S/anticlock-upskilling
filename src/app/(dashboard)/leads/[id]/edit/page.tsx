import { redirect, notFound } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getLead } from '@/lib/actions/leads'
import { getOrgMembers } from '@/lib/actions/contacts'
import { EditLeadForm } from '../../_components/LeadForm'

interface Props {
  params: { id: string }
}

export default async function EditLeadPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/leads')

  const [leadResult, membersResult] = await Promise.all([
    getLead(params.id),
    getOrgMembers(),
  ])

  if (leadResult.error) notFound()

  const { lead } = leadResult.data!

  if (lead.converted_at) redirect('/leads')

  return (
    <EditLeadForm
      leadId={lead.id}
      defaultValues={{
        status: lead.status as 'new' | 'contacted' | 'qualified' | 'lost',
        score: lead.score,
        source: lead.source as 'website' | 'referral' | 'cold_outreach' | 'social' | 'event' | 'other' | undefined,
        owner_id: lead.owner_id ?? undefined,
        notes: lead.notes ?? '',
        contact_first_name: lead.contact_first_name,
        contact_last_name: lead.contact_last_name,
        contact_company: lead.contact_company,
      }}
      members={membersResult.data ?? []}
    />
  )
}
