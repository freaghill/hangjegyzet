'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, User, Globe, Lock, Eye, Edit, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { SharePermission, Team } from '@/lib/teams/types'
import { useTeam } from '@/lib/teams/team-context'

interface ShareMeetingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  meetingTitle: string
  onSuccess?: () => void
}

export function ShareMeetingDialog({ 
  open, 
  onOpenChange,
  meetingId,
  meetingTitle,
  onSuccess 
}: ShareMeetingDialogProps) {
  const { teams } = useTeam()
  const [isSharing, setIsSharing] = useState(false)
  const [shareType, setShareType] = useState<'user' | 'team'>('user')
  const [formData, setFormData] = useState({
    email: '',
    teamId: '',
    permission: 'view' as SharePermission
  })
  const [existingShares, setExistingShares] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      loadExistingShares()
    }
  }, [open, meetingId])

  const loadExistingShares = async () => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/shares`)
      if (response.ok) {
        const data = await response.json()
        setExistingShares(data)
      }
    } catch (error) {
      console.error('Error loading shares:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (shareType === 'user' && !formData.email.trim()) {
      toast.error('Az email cím kötelező')
      return
    }
    
    if (shareType === 'team' && !formData.teamId) {
      toast.error('Válasszon egy csapatot')
      return
    }

    setIsSharing(true)

    try {
      const body: any = {
        meeting_id: meetingId,
        permission: formData.permission
      }

      if (shareType === 'user') {
        body.user_email = formData.email
      } else {
        body.team_id = formData.teamId
      }

      const response = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to share meeting')
      }
      
      toast.success('Meeting sikeresen megosztva')
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setFormData({
        email: '',
        teamId: '',
        permission: 'view'
      })
    } catch (error) {
      console.error('Error sharing meeting:', error)
      toast.error(error instanceof Error ? error.message : 'Hiba történt a megosztás során')
    } finally {
      setIsSharing(false)
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove share')

      toast.success('Megosztás sikeresen eltávolítva')
      loadExistingShares()
    } catch (error) {
      toast.error('Hiba történt az eltávolítás során')
    }
  }

  const getPermissionIcon = (permission: SharePermission) => {
    const icons = {
      view: Eye,
      comment: MessageSquare,
      edit: Edit
    }
    return icons[permission]
  }

  const getPermissionLabel = (permission: SharePermission) => {
    const labels = {
      view: 'Megtekintés',
      comment: 'Megtekintés és kommentelés',
      edit: 'Teljes szerkesztés'
    }
    return labels[permission]
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Meeting megosztása</DialogTitle>
          <DialogDescription>
            "{meetingTitle}" megosztása másokkal
          </DialogDescription>
        </DialogHeader>

        <Tabs value={shareType} onValueChange={(v) => setShareType(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Felhasználó
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Csapat
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit}>
            <TabsContent value="user" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email cím <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="pelda@email.hu"
                  disabled={isSharing}
                />
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team">
                  Csapat <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.teamId}
                  onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                  disabled={isSharing}
                >
                  <SelectTrigger id="team">
                    <SelectValue placeholder="Válasszon csapatot" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{team.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {team.member_count} tag
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <div className="space-y-2 mt-4">
              <Label>Jogosultság</Label>
              <RadioGroup
                value={formData.permission}
                onValueChange={(value) => setFormData({ ...formData, permission: value as SharePermission })}
                disabled={isSharing}
              >
                {(['view', 'comment', 'edit'] as SharePermission[]).map((permission) => {
                  const Icon = getPermissionIcon(permission)
                  return (
                    <div key={permission} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                      <RadioGroupItem value={permission} id={permission} />
                      <Label htmlFor={permission} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{getPermissionLabel(permission)}</span>
                        </div>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSharing}
              >
                Mégse
              </Button>
              <Button type="submit" disabled={isSharing}>
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Megosztás...
                  </>
                ) : (
                  'Megosztás'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>

        {/* Existing shares */}
        {existingShares.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Jelenlegi megosztások</h4>
            <div className="space-y-2">
              {existingShares.map((share) => {
                const Icon = getPermissionIcon(share.permission)
                return (
                  <div key={share.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      {share.team ? (
                        <>
                          <Users className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{share.team.name}</p>
                            <p className="text-sm text-gray-500">Csapat</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <User className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="font-medium">{share.user?.email}</p>
                            <p className="text-sm text-gray-500">
                              {share.user?.full_name || 'Felhasználó'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Icon className="h-3 w-3" />
                        {getPermissionLabel(share.permission)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveShare(share.id)}
                        className="text-red-600"
                      >
                        Eltávolítás
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}