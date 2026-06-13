import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const name = session?.user.name ?? session?.user.email ?? 'there'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome back, {name}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Your sales overview will appear here once modules are built.
      </p>
    </div>
  )
}
