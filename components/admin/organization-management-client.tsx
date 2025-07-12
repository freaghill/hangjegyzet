'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Building, 
  Users,
  Clock,
  FileAudio,
  Edit,
  Settings,
  TrendingUp
} from 'lucide-react'
import { format } from 'date-fns'

interface Organization {
  id: string
  name: string
  slug: string
  subscription_tier: 'trial' | 'starter' | 'professional' | 'enterprise'
  subscription_ends_at: string | null
  created_at: string
  userCount: number
  totalMinutes: number
  totalMeetings: number
  billing_data?: any
}

interface OrganizationManagementClientProps {
  initialOrganizations: Organization[]
}

export default function OrganizationManagementClient({ initialOrganizations }: OrganizationManagementClientProps) {
  const [organizations, setOrganizations] = useState(initialOrganizations)
  const [searchTerm, setSearchTerm] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = tierFilter === 'all' || org.subscription_tier === tierFilter
    return matchesSearch && matchesTier
  })

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-red-100 text-red-800'
      case 'professional': return 'bg-orange-100 text-orange-800'
      case 'starter': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSubscriptionStatus = (org: Organization) => {
    if (!org.subscription_ends_at) return 'Active'
    const endDate = new Date(org.subscription_ends_at)
    const now = new Date()
    if (endDate < now) return 'Expired'
    const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 7) return `${daysLeft} days left`
    return 'Active'
  }

  return (
    <div>
      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOrgs.map((org) => (
          <Card key={org.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                <p className="text-sm text-gray-500">ID: {org.id.slice(0, 8)}...</p>
              </div>
              <Badge className={getTierBadgeColor(org.subscription_tier)}>
                {org.subscription_tier}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{org.userCount} users</span>
              </div>
              <div className="flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{org.totalMeetings} meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{org.totalMinutes} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{getSubscriptionStatus(org)}</span>
              </div>
            </div>

            {org.subscription_ends_at && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Subscription ends: {format(new Date(org.subscription_ends_at), 'MMM d, yyyy')}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-xs text-gray-500">
                Created {format(new Date(org.created_at), 'MMM d, yyyy')}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4 mr-1" />
                  Settings
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredOrgs.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No organizations found matching your criteria</p>
          </div>
        </Card>
      )}
    </div>
  )
}