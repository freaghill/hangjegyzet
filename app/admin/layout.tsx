import { checkAdminAuth } from '@/lib/admin/auth'
import Link from 'next/link'
import { 
  LayoutDashboard, 
  Users, 
  Building, 
  BarChart3, 
  CreditCard,
  Activity,
  Settings
} from 'lucide-react'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await checkAdminAuth()

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/organizations', label: 'Organizations', icon: Building },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/billing', label: 'Billing', icon: CreditCard },
    { href: '/admin/system', label: 'System Health', icon: Activity },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Portal</h1>
          <p className="text-sm text-gray-400 mt-1">HangJegyzet</p>
        </div>
        
        <nav className="mt-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-6 py-3 hover:bg-gray-800 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
            Back to App
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}