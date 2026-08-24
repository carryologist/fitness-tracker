'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Dumbbell, HeartPulse } from 'lucide-react'

const TABS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/freeweights', label: 'Free Weights', icon: Dumbbell },
  { href: '/health', label: 'Health', icon: HeartPulse },
]

export function NavTabs() {
  const pathname = usePathname()

  return (
    <nav
      className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 pr-2 w-fit max-w-full overflow-x-auto"
      aria-label="Sections"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
