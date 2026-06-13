import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { getAuthUser } from '@/lib/auth'
import { getContact, getOrgMembers } from '@/lib/actions/contacts'
import { ContactForm } from '../../_components/ContactForm'
import type { ContactInput } from '@/lib/validations/contact'

interface Props {
  params: { id: string }
}

export default async function EditContactPage({ params }: Props) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect(`/contacts/${params.id}`)

  const [contactResult, membersResult] = await Promise.all([
    getContact(params.id),
    getOrgMembers(),
  ])

  if (contactResult.error) {
    if ((contactResult.error as { message: string }).message === 'Contact not found') notFound()
    throw new Error((contactResult.error as { message: string }).message)
  }

  const { contact } = contactResult.data!
  const members = membersResult.data ?? []

  const defaultValues: Partial<ContactInput> = {
    first_name:   contact.first_name,
    last_name:    contact.last_name,
    email:        contact.email ?? '',
    phone:        contact.phone ?? '',
    company:      contact.company ?? '',
    job_title:    contact.job_title ?? '',
    lead_source:  contact.lead_source as ContactInput['lead_source'] ?? undefined,
    owner_id:     contact.owner_id ?? undefined,
    tags:         contact.tags,
    custom_fields:contact.custom_fields,
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/contacts/${params.id}`}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <PageHeader title="Edit Contact" />
      </div>
      <ContactForm
        contactId={params.id}
        defaultValues={defaultValues}
        members={members}
      />
    </div>
  )
}
