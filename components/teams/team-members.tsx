'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OptimizedAvatar } from '@/components/ui/optimized-image'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  UserPlus, 
  Shield, 
  Settings, 
  Users, 
  Eye,
  MoreVertical,
  Mail,
  Trash2,
  ChevronDown
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TeamMember, TeamRole } from '@/lib/teams/types'
import { InviteMemberDialog } from './invite-member-dialog'
import { toast } from 'sonner'

interface TeamMembersProps {
  teamId: string
  canManageMembers: boolean
}

export function TeamMembers({ teamId, canManageMembers }: TeamMembersProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  useEffect(() => {
    loadMembers()
    if (canManageMembers) {
      loadInvitations()
    }
  }, [teamId])

  const loadMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`)
      if (!response.ok) throw new Error('Failed to load members')
      
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error('Error loading members:', error)
      toast.error('Hiba a tagok betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`)
      if (!response.ok) throw new Error('Failed to load invitations')
      
      const data = await response.json()
      setInvitations(data)
    } catch (error) {
      console.error('Error loading invitations:', error)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')

      toast.success('Szerepkör sikeresen frissítve')
      loadMembers()
    } catch (error) {
      toast.error('Hiba a szerepkör frissítésekor')
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Biztosan eltávolítja ${memberName} tagot a csapatból?`)) {
      return
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove member')

      toast.success('Tag sikeresen eltávolítva')
      loadMembers()
    } catch (error) {
      toast.error('Hiba a tag eltávolításakor')
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to revoke invitation')

      toast.success('Meghívó visszavonva')
      loadInvitations()
    } catch (error) {
      toast.error('Hiba a meghívó visszavonásakor')
    }
  }

  const getRoleIcon = (role: TeamRole) => {
    const icons = {
      owner: Shield,
      admin: Settings,
      member: Users,
      viewer: Eye
    }
    return icons[role]
  }

  const getRoleLabel = (role: TeamRole) => {
    const labels = {
      owner: 'Tulajdonos',
      admin: 'Adminisztrátor',
      member: 'Tag',
      viewer: 'Megtekintő'
    }
    return labels[role]
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    return email?.charAt(0).toUpperCase() || '?'
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4 p-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48 mt-2" />
              </div>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {canManageMembers && (
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Csapat tagok</h3>
              <p className="text-sm text-gray-600">
                {members.length} aktív tag
              </p>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Tag meghívása
            </Button>
          </div>
        )}

        {/* Active Members */}
        <div className="space-y-3">
          {members.map((member) => {
            const Icon = getRoleIcon(member.role)
            const isCurrentUser = false // TODO: Get from auth context
            
            return (
              <Card key={member.id}>
                <CardContent className="flex items-center gap-4 p-6">
                  <OptimizedAvatar
                    src={member.user?.avatar_url}
                    alt={member.user?.full_name || member.user?.email || 'Team member'}
                    size="md"
                    fallback={getInitials(member.user?.full_name, member.user?.email)}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {member.user?.full_name || member.user?.email}
                      </p>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          Te
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {member.user?.email}
                    </p>
                  </div>

                  {canManageMembers && !isCurrentUser ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.user_id, value as TeamRole)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Tulajdonos
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Adminisztrátor
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Tag
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Megtekintő
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(
                              member.user_id,
                              member.user?.full_name || member.user?.email || ''
                            )}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eltávolítás
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {getRoleLabel(member.role)}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Pending Invitations */}
        {canManageMembers && invitations.length > 0 && (
          <>
            <div className="pt-4">
              <h4 className="text-md font-medium mb-3">Függő meghívók</h4>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <Card key={invitation.id} className="bg-gray-50">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-600">
                          Meghívva: {new Date(invitation.invited_at).toLocaleDateString('hu-HU')}
                        </p>
                      </div>

                      <Badge variant="outline">
                        {getRoleLabel(invitation.role)}
                      </Badge>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-red-600"
                      >
                        Visszavonás
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <InviteMemberDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        teamId={teamId}
        onSuccess={() => {
          loadMembers()
          loadInvitations()
        }}
      />
    </>
  )
}