'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  Key, 
  CreditCard, 
  Puzzle,
  BookOpen,
  FileText
} from 'lucide-react'

const settingsNavigation = [
  {
    name: 'API Keys',
    href: '/settings/api',
    icon: Key,
  },
  {
    name: 'Billing',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    name: 'Integrations',
    href: '/settings/integrations',
    icon: Puzzle,
  },
  {
    name: 'Templates',
    href: '/settings/templates',
    icon: FileText,
  },
  {
    name: 'Vocabulary',
    href: '/settings/vocabulary',
    icon: BookOpen,
  },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>
      
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {settingsNavigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                    pathname === item.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}