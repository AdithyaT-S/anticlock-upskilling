import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getAuthUser } from '@/lib/auth'
import { getContact, getOrgMembers } from '@/lib/actions/contacts'
import { ContactDetail } from './_components/ContactDetail'

interface Props {
  params: { id: string }
}

export default async function ContactDetailPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [result, membersResult] = await Promise.all([
    getContact(params.id),
    getOrgMembers(),
  ])

  if (result.error) {
    if ((result.error as { message: string }).message === 'Contact not found') notFound()
    throw new Error((result.error as { message: string }).message)
  }

  const { contact, activities, dealsCount } = result.data!
  const members = membersResult.data ?? []
  const canEdit = user.role !== 'viewer'

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contacts">
            <ArrowLeft className="w-4 h-4 mr-1" />
            All contacts
          </Link>
        </Button>
      </div>
      <ContactDetail
        contact={contact}
        activities={activities}
        canEdit={canEdit}
        members={members}
        dealsCount={dealsCount}
      />
    </div>
  )
}
