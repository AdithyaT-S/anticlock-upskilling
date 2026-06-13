import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import LoginForm from './LoginForm'

export const metadata = { title: 'Sign in — FreshCRM' }

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/')

  return <LoginForm />
}
