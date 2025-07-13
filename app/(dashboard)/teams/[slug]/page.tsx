'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  FileText, 
  Settings as SettingsIcon,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react'
import { TeamMembers } from '@/components/teams/team-members'
import { Team } from '@/lib/teams/types'
import { usePermission } from '@/lib/teams/team-context'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function TeamPage() {
  const params = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMeetings: 0,
    sharedMeetings: 0,
    totalDuration: 0,
    activeMembers: 0
  })
  const canManageTeam = usePermission('team.update')
  const canManageMembers = usePermission('member.invite')
  const supabase = createClient()

  useEffect(() => {
    loadTeamData()
  }, [params.slug])

  const loadTeamData = async () => {
    try {
      // Find team by slug
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', params.slug)
        .single()

      if (teamsError || !teams) {
        toast.error('Csapat nem található')
        return
      }

      // Get current user's role
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teams.id)
        .eq('user_id', user?.id)
        .single()

      // Get member count
      const { count: memberCount } = await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teams.id)

      setTeam({
        ...teams,
        current_user_role: member?.role,
        member_count: memberCount || 0
      })

      // Load team statistics
      await loadTeamStats(teams.id)
    } catch (error) {
      console.error('Error loading team:', error)
      toast.error('Hiba történt a csapat betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  const loadTeamStats = async (teamId: string) => {
    try {
      // Get team meetings count
      const { count: meetingsCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      // Get shared meetings count
      const { count: sharedCount } = await supabase
        .from('meeting_shares')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      // Get total duration
      const { data: meetings } = await supabase
        .from('meetings')
        .select('duration_seconds')
        .eq('team_id', teamId)

      const totalDuration = meetings?.reduce(
        (sum, m) => sum + (m.duration_seconds || 0), 
        0
      ) || 0

      // Get active members (members who created meetings)
      const { data: activeMemberData } = await supabase
        .from('meetings')
        .select('user_id')
        .eq('team_id', teamId)

      const uniqueActiveMembers = new Set(activeMemberData?.map(m => m.user_id) || [])

      setStats({
        totalMeetings: meetingsCount || 0,
        sharedMeetings: sharedCount || 0,
        totalDuration: Math.floor(totalDuration / 60), // Convert to minutes
        activeMembers: uniqueActiveMembers.size
      })
    } catch (error) {
      console.error('Error loading team stats:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Csapat nem található</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{team.name}</h1>
        {team.description && (
          <p className="text-gray-600 mt-2">{team.description}</p>
        )}
        <div className="flex items-center gap-4 mt-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {team.member_count} tag
          </Badge>
          {team.current_user_role && (
            <Badge>
              {team.current_user_role === 'owner' && 'Tulajdonos'}
              {team.current_user_role === 'admin' && 'Admin'}
              {team.current_user_role === 'member' && 'Tag'}
              {team.current_user_role === 'viewer' && 'Megtekintő'}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Meetingek</p>
                <p className="text-2xl font-bold">{stats.totalMeetings}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Megosztott</p>
                <p className="text-2xl font-bold">{stats.sharedMeetings}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Össz. idő</p>
                <p className="text-2xl font-bold">{stats.totalDuration}p</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aktív tagok</p>
                <p className="text-2xl font-bold">{stats.activeMembers}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tagok
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Meetingek
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Aktivitás
          </TabsTrigger>
          {canManageTeam && (
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              Beállítások
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members">
          <TeamMembers 
            teamId={team.id} 
            canManageMembers={canManageMembers}
          />
        </TabsContent>

        <TabsContent value="meetings">
          <Card>
            <CardHeader>
              <CardTitle>Csapat meetingek</CardTitle>
              <CardDescription>
                A csapat által létrehozott és megosztott meetingek
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hamarosan elérhető...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Aktivitás</CardTitle>
              <CardDescription>
                Csapat aktivitás és események
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hamarosan elérhető...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {canManageTeam && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Csapat beállítások</CardTitle>
                <CardDescription>
                  Csapat információk és beállítások kezelése
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Hamarosan elérhető...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}