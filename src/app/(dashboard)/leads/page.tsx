import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getLeads, getLead } from '@/lib/actions/leads'
import { getOrgMembers } from '@/lib/actions/contacts'
import { LeadsClient } from './_components/LeadsClient'

interface Props {
  searchParams: {
    status?: string
    owner_id?: string
    page?: string
    per_page?: string
    id?: string
  }
}

export default async function LeadsPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [leadsResult, membersResult] = await Promise.all([
    getLeads(searchParams),
    getOrgMembers(),
  ])

  if (leadsResult.error) throw new Error('Failed to load leads')

  const { leads, total, page, pageCount } = leadsResult.data!
  const members = membersResult.data ?? []

  let selectedLead = null
  let selectedLeadActivities: import('@/types/crm').Activity[] = []

  if (searchParams.id) {
    const detailResult = await getLead(searchParams.id)
    if (detailResult.data) {
      selectedLead = detailResult.data.lead
      selectedLeadActivities = detailResult.data.activities
    }
  }

  return (
    <LeadsClient
      leads={leads}
      total={total}
      page={page}
      pageCount={pageCount}
      members={members}
      selectedLead={selectedLead}
      selectedLeadActivities={selectedLeadActivities}
    />
  )
}
