import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignupForm from './SignupForm'

export const metadata = { title: 'Create account — FreshCRM' }

export default async function SignupPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')

  return <SignupForm />
}
