import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getContacts, getOrgMembers } from '@/lib/actions/contacts'
import { ContactsClient } from './_components/ContactsClient'

interface Props {
  searchParams: {
    q?: string
    owner_id?: string
    lead_source?: string
    page?: string
    per_page?: string
  }
}

export default async function ContactsPage({ searchParams }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [contactsResult, membersResult] = await Promise.all([
    getContacts(searchParams),
    getOrgMembers(),
  ])

  if (contactsResult.error) throw new Error('Failed to load contacts')

  const { contacts, total, page, per_page, pageCount } = contactsResult.data!
  const members = membersResult.data ?? []

  return (
    <ContactsClient
      contacts={contacts}
      total={total}
      page={page}
      per_page={per_page}
      pageCount={pageCount}
      members={members}
    />
  )
}
