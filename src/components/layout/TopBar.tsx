'use client'

import { useState } from 'react'
import { Bell, Menu } from 'lucide-react'
import { MobileNav } from './MobileNav'

interface TopBarProps {
  user: { name: string; email: string; role: string }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function TopBar({ user }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        {/* Mobile: hamburger */}
        <button
          className="md:hidden text-gray-500 hover:text-gray-700"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        {/* Desktop: spacer */}
        <div className="hidden md:block" />

        {/* Right: notifications + user */}
        <div className="flex items-center gap-4">
          <button
            className="text-gray-400 hover:text-gray-600"
            aria-label="Notifications"
          >
            <Bell size={20} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600">
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </header>

      <MobileNav user={user} open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  )
}
