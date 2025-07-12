'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  MoreVertical, 
  UserX, 
  UserCheck,
  Edit,
  Mail 
} from 'lucide-react'
import { format } from 'date-fns'

interface User {
  id: string
  name: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
  organizations?: {
    id: string
    name: string
    subscription_tier: string
    subscription_ends_at: string | null
  }
}

interface UserManagementClientProps {
  initialUsers: User[]
}

export default function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const [users, setUsers] = useState(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.organizations?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-blue-100 text-blue-800'
      case 'member': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'enterprise': return 'bg-red-100 text-red-800'
      case 'professional': return 'bg-orange-100 text-orange-800'
      case 'starter': return 'bg-green-100 text-green-800'
      case 'trial': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users or organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4 font-medium text-gray-900">User</th>
                <th className="text-left p-4 font-medium text-gray-900">Organization</th>
                <th className="text-left p-4 font-medium text-gray-900">Role</th>
                <th className="text-left p-4 font-medium text-gray-900">Subscription</th>
                <th className="text-left p-4 font-medium text-gray-900">Joined</th>
                <th className="text-left p-4 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-gray-900">{user.name || 'Unnamed User'}</p>
                      <p className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-900">{user.organizations?.name || 'No Organization'}</p>
                  </td>
                  <td className="p-4">
                    <Badge className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    {user.organizations && (
                      <div>
                        <Badge className={getTierBadgeColor(user.organizations.subscription_tier)}>
                          {user.organizations.subscription_tier}
                        </Badge>
                        {user.organizations.subscription_ends_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Ends: {format(new Date(user.organizations.subscription_ends_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-600">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No users found matching your criteria
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}