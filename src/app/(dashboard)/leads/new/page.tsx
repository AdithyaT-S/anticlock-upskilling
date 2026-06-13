import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getContactsForPicker } from '@/lib/actions/leads'
import { getOrgMembers } from '@/lib/actions/contacts'
import { CreateLeadForm } from '../_components/LeadForm'

export default async function NewLeadPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/leads')

  const [contactsResult, membersResult] = await Promise.all([
    getContactsForPicker(),
    getOrgMembers(),
  ])

  return (
    <CreateLeadForm
      contacts={contactsResult.data ?? []}
      members={membersResult.data ?? []}
    />
  )
}
