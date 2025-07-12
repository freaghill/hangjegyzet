'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Book,
  Mic,
  FileText,
  Users,
  Plug,
  Shield,
  CreditCard,
  Code,
  ChevronRight,
  Home,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon?: React.ReactNode
  items?: NavItem[]
}

const navigation: NavItem[] = [
  {
    title: 'Kezdőlap',
    href: '/docs',
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: 'Alapok',
    icon: <Book className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'Kezdő útmutató', href: '/docs/getting-started' },
      { title: 'Alapfogalmak', href: '/docs/concepts' },
      { title: 'Gyors kezdés', href: '/docs/quickstart' },
    ],
  },
  {
    title: 'Funkciók',
    icon: <Mic className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'Meeting rögzítése', href: '/docs/recording' },
      { title: 'Átírás és feldolgozás', href: '/docs/transcription' },
      { title: 'Csapatmunka', href: '/docs/collaboration' },
      { title: 'Exportálás', href: '/docs/export' },
      { title: 'Elemzések', href: '/docs/analytics' },
    ],
  },
  {
    title: 'Integrációk',
    icon: <Plug className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'Áttekintés', href: '/docs/integrations' },
      { title: 'Naptár szinkron', href: '/docs/integrations/calendar' },
      { title: 'Webhookok', href: '/docs/integrations/webhooks' },
      { title: 'Zapier', href: '/docs/integrations/zapier' },
    ],
  },
  {
    title: 'Biztonság',
    icon: <Shield className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'Biztonság és adatvédelem', href: '/docs/security' },
      { title: 'GDPR megfelelőség', href: '/docs/security/gdpr' },
      { title: 'Hozzáférés kezelés', href: '/docs/security/access' },
    ],
  },
  {
    title: 'Számlázás',
    icon: <CreditCard className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'Csomagok és árak', href: '/docs/billing' },
      { title: 'Előfizetés kezelése', href: '/docs/billing/subscription' },
      { title: 'Számlák és nyugták', href: '/docs/billing/invoices' },
    ],
  },
  {
    title: 'Fejlesztőknek',
    icon: <Code className="h-4 w-4" />,
    href: '#',
    items: [
      { title: 'API Referencia', href: '/docs/api' },
      { title: 'SDK-k', href: '/docs/api/sdks' },
      { title: 'Példák', href: '/docs/api/examples' },
    ],
  },
]

interface DocsSidebarProps {
  currentSlug?: string
}

export function DocsSidebar({ currentSlug }: DocsSidebarProps) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-8 space-y-2">
      {navigation.map((section) => (
        <div key={section.title}>
          {section.href === '#' ? (
            // Section header
            <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-gray-900">
              {section.icon}
              {section.title}
            </div>
          ) : (
            // Direct link
            <Link
              href={section.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === section.href
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {section.icon}
              {section.title}
            </Link>
          )}

          {/* Sub items */}
          {section.items && (
            <div className="ml-7 space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-1.5 text-sm rounded-md transition-colors",
                    pathname === item.href
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                >
                  {item.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Help section */}
      <div className="pt-8 mt-8 border-t">
        <h4 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Segítség
        </h4>
        <div className="space-y-1">
          <Link
            href="/changelog"
            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            Újdonságok
          </Link>
          <Link
            href="/support"
            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            Támogatás
          </Link>
          <Link
            href="https://status.hangjegyzet.ai"
            target="_blank"
            className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            API státusz
          </Link>
        </div>
      </div>
    </nav>
  )
}