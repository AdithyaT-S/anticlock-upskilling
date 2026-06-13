import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getOrgMembers } from '@/lib/actions/contacts'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ContactForm } from '../_components/ContactForm'

export default async function NewContactPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/contacts')

  const membersResult = await getOrgMembers()
  const members = membersResult.data ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/contacts">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <PageHeader title="New Contact" />
      </div>
      <ContactForm members={members} />
    </div>
  )
}
