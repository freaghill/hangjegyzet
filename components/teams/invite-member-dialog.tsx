'use client'

import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Shield, Settings, Users, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { TeamRole } from '@/lib/teams/types'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId: string
  onSuccess?: () => void
}

export function InviteMemberDialog({ 
  open, 
  onOpenChange,
  teamId,
  onSuccess 
}: InviteMemberDialogProps) {
  const [isInviting, setIsInviting] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as TeamRole,
    message: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim()) {
      toast.error('Az email cím kötelező')
      return
    }

    setIsInviting(true)

    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send invitation')
      }
      
      toast.success('Meghívó sikeresen elküldve')
      onOpenChange(false)
      onSuccess?.()
      
      // Reset form
      setFormData({
        email: '',
        role: 'member',
        message: ''
      })
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error(error instanceof Error ? error.message : 'Hiba történt a meghívó küldése során')
    } finally {
      setIsInviting(false)
    }
  }

  const getRoleDescription = (role: TeamRole) => {
    const descriptions = {
      owner: 'Teljes hozzáférés, csapat törlése és minden beállítás módosítása',
      admin: 'Tagok kezelése, meetingek és beállítások módosítása',
      member: 'Meetingek létrehozása, szerkesztése és megosztása',
      viewer: 'Csak megtekintési jogosultság'
    }
    return descriptions[role]
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Új tag meghívása</DialogTitle>
            <DialogDescription>
              Küldjön email meghívót új csapattag hozzáadásához
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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
                disabled={isInviting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">
                Szerepkör <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as TeamRole })}
                disabled={isInviting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['owner', 'admin', 'member', 'viewer'] as TeamRole[]).map((role) => {
                    const Icon = getRoleIcon(role)
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>
                            {role === 'owner' && 'Tulajdonos'}
                            {role === 'admin' && 'Adminisztrátor'}
                            {role === 'member' && 'Tag'}
                            {role === 'viewer' && 'Megtekintő'}
                          </span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getRoleDescription(formData.role)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Személyes üzenet (opcionális)
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Üdvözlő üzenet vagy további információk..."
                rows={3}
                disabled={isInviting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isInviting}
            >
              Mégse
            </Button>
            <Button type="submit" disabled={isInviting}>
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Küldés...
                </>
              ) : (
                'Meghívó küldése'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}