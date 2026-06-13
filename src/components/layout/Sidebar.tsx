'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Briefcase,
  Ticket,
  Activity,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/leads', label: 'Leads', icon: TrendingUp },
  { href: '/deals', label: 'Deals', icon: Briefcase },
  { href: '/tickets', label: 'Tickets', icon: Ticket },
  { href: '/activities', label: 'Activities', icon: Activity },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
]

interface SidebarProps {
  user: { name: string; email: string; role: string }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-indigo-600">FreshCRM</span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              isActive(href, exact)
                ? 'bg-indigo-50 text-indigo-600 font-medium'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom group — settings, user info, sign out */}
      <div className="border-t border-gray-200 px-3 py-4 space-y-1">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
            isActive('/settings')
              ? 'bg-indigo-50 text-indigo-600 font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          )}
        >
          <Settings size={18} />
          Settings
        </Link>

        <div className="px-3 py-2">
          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
