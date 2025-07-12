import { getAdminStats } from '@/lib/admin/auth'
import { Card } from '@/components/ui/card'
import { 
  Users, 
  Building, 
  FileAudio, 
  CreditCard,
  Clock,
  TrendingUp
} from 'lucide-react'

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  const statCards = [
    {
      title: 'Total Users',
      value: stats.usersCount.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Organizations',
      value: stats.orgsCount.toLocaleString(),
      icon: Building,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Meetings',
      value: stats.meetingsCount.toLocaleString(),
      icon: FileAudio,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Active Subscriptions',
      value: stats.activeSubscriptions.toLocaleString(),
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Minutes This Month',
      value: stats.monthlyMinutes.toLocaleString(),
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Meetings This Month',
      value: stats.monthlyMeetings.toLocaleString(),
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100'
    }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your platform&apos;s performance and health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Activity feed coming soon...</p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Status</span>
              <span className="text-sm font-medium text-green-600">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database</span>
              <span className="text-sm font-medium text-green-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Storage</span>
              <span className="text-sm font-medium text-green-600">Available</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}