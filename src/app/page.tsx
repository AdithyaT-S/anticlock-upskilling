import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Placeholder — will become redirect('/contacts') once Contacts module is built
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {session.user.name}
        </h1>
        <p className="mt-2 text-gray-500">Your CRM dashboard is coming soon.</p>
      </div>
    </div>
  )
}
