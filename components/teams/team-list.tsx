'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  Plus, 
  Settings, 
  MoreVertical,
  UserPlus,
  LogOut,
  Shield,
  Eye
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useTeam } from '@/lib/teams/team-context'
import { Team, TeamRole } from '@/lib/teams/types'
import { CreateTeamDialog } from './create-team-dialog'
import { toast } from 'sonner'

export function TeamList() {
  const { teams, currentTeam, switchTeam, refreshTeams, isLoading } = useTeam()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const router = useRouter()

  const handleTeamClick = async (team: Team) => {
    await switchTeam(team.id)
    router.push(`/teams/${team.slug}`)
  }

  const handleLeaveTeam = async (team: Team) => {
    if (!confirm(`Biztosan ki szeretne lépni a "${team.name}" csapatból?`)) {
      return
    }

    try {
      const response = await fetch(`/api/teams/${team.id}/leave`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to leave team')

      toast.success('Sikeresen kilépett a csapatból')
      await refreshTeams()
    } catch (error) {
      toast.error('Hiba történt a kilépés során')
    }
  }

  const getRoleBadge = (role: TeamRole) => {
    const config = {
      owner: { label: 'Tulajdonos', variant: 'default' as const, icon: Shield },
      admin: { label: 'Admin', variant: 'secondary' as const, icon: Settings },
      member: { label: 'Tag', variant: 'outline' as const, icon: Users },
      viewer: { label: 'Megtekintő', variant: 'outline' as const, icon: Eye }
    }[role]

    const Icon = config.icon
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Csapataim</h2>
            <p className="text-gray-600 mt-1">
              Kezelje csapatait és tagságait
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Új csapat
          </Button>
        </div>

        {teams.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Még nincs csapata
              </h3>
              <p className="text-gray-600 mb-4">
                Hozzon létre egy új csapatot vagy várjon meghívásra
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Első csapat létrehozása
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card 
                key={team.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentTeam?.id === team.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1"
                      onClick={() => handleTeamClick(team)}
                    >
                      <CardTitle className="text-lg">
                        {team.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {team.member_count} {team.member_count === 1 ? 'tag' : 'tag'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(team.current_user_role!)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/teams/${team.slug}`)
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Megnyitás
                          </DropdownMenuItem>
                          {['owner', 'admin'].includes(team.current_user_role!) && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/teams/${team.slug}/settings`)
                                }}
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Beállítások
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/teams/${team.slug}/members`)
                                }}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Tagok kezelése
                              </DropdownMenuItem>
                            </>
                          )}
                          {team.current_user_role !== 'owner' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLeaveTeam(team)
                                }}
                                className="text-red-600"
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Kilépés
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent
                  onClick={() => handleTeamClick(team)}
                >
                  {team.description ? (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {team.description}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      Nincs leírás
                    </p>
                  )}
                  {currentTeam?.id === team.id && (
                    <Badge variant="secondary" className="mt-3">
                      Aktív csapat
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refreshTeams}
      />
    </>
  )
}