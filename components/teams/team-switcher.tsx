'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  Plus, 
  Check,
  Users,
  Settings,
  UserPlus
} from 'lucide-react'
import { useTeam } from '@/lib/teams/team-context'
import { useRouter } from 'next/navigation'
import { CreateTeamDialog } from './create-team-dialog'

export function TeamSwitcher() {
  const { currentTeam, teams, switchTeam, refreshTeams } = useTeam()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const router = useRouter()

  const handleTeamSwitch = async (teamId: string) => {
    await switchTeam(teamId)
    router.refresh()
  }

  const handleCreateTeam = () => {
    setShowCreateDialog(true)
  }

  const getTeamInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!currentTeam) {
    return (
      <Button
        variant="outline"
        onClick={handleCreateTeam}
        className="w-full justify-start"
      >
        <Plus className="h-4 w-4 mr-2" />
        Csapat létrehozása
      </Button>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={currentTeam.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getTeamInitials(currentTeam.name)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{currentTeam.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[260px]">
          <DropdownMenuLabel>Csapatok</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => handleTeamSwitch(team.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={team.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {getTeamInitials(team.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.member_count} tag
                    </span>
                  </div>
                </div>
                {team.id === currentTeam.id && (
                  <Check className="h-4 w-4" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => router.push(`/teams/${currentTeam.slug}/settings`)}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Csapat beállítások
          </DropdownMenuItem>
          
          {['owner', 'admin'].includes(currentTeam.current_user_role!) && (
            <DropdownMenuItem
              onClick={() => router.push(`/teams/${currentTeam.slug}/members`)}
              className="cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Tagok kezelése
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleCreateTeam}
            className="cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Új csapat létrehozása
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => router.push('/teams')}
            className="cursor-pointer"
          >
            <Users className="h-4 w-4 mr-2" />
            Összes csapat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refreshTeams}
      />
    </>
  )
}