'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Team, TeamRole, hasPermission } from './types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TeamContextValue {
  currentTeam: Team | null
  teams: Team[]
  isLoading: boolean
  switchTeam: (teamId: string) => Promise<void>
  refreshTeams: () => Promise<void>
  checkPermission: (permission: string) => boolean
  userRole: TeamRole | null
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      // Fetch user's teams
      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select(`
          role,
          team:teams(*)
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (error) throw error

      if (teamMembers && teamMembers.length > 0) {
        // Fetch member counts
        const teamIds = teamMembers.map(tm => tm.team.id)
        const { data: memberCounts } = await supabase
          .from('team_members')
          .select('team_id')
          .in('team_id', teamIds)

        const countMap = memberCounts?.reduce((acc: any, m: any) => {
          acc[m.team_id] = (acc[m.team_id] || 0) + 1
          return acc
        }, {}) || {}

        const teamsWithRoles = teamMembers.map(tm => ({
          ...tm.team,
          current_user_role: tm.role,
          member_count: countMap[tm.team.id] || 0
        }))

        setTeams(teamsWithRoles)

        // Set current team from localStorage or first team
        const savedTeamId = localStorage.getItem('currentTeamId')
        const savedTeam = teamsWithRoles.find(t => t.id === savedTeamId)
        
        if (savedTeam) {
          setCurrentTeam(savedTeam)
        } else if (teamsWithRoles.length > 0) {
          setCurrentTeam(teamsWithRoles[0])
          localStorage.setItem('currentTeamId', teamsWithRoles[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const switchTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (team) {
      setCurrentTeam(team)
      localStorage.setItem('currentTeamId', teamId)
      router.refresh()
    }
  }

  const refreshTeams = async () => {
    await loadTeams()
  }

  const checkPermission = (permission: string): boolean => {
    if (!currentTeam?.current_user_role) return false
    return hasPermission(currentTeam.current_user_role, permission)
  }

  const value: TeamContextValue = {
    currentTeam,
    teams,
    isLoading,
    switchTeam,
    refreshTeams,
    checkPermission,
    userRole: currentTeam?.current_user_role || null
  }

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider')
  }
  return context
}

// Hook for checking permissions
export function usePermission(permission: string): boolean {
  const { checkPermission } = useTeam()
  return checkPermission(permission)
}

// Hook for requiring permission (redirects if no permission)
export function useRequirePermission(permission: string, redirectTo = '/') {
  const hasPermission = usePermission(permission)
  const router = useRouter()

  useEffect(() => {
    if (!hasPermission) {
      router.push(redirectTo)
    }
  }, [hasPermission, redirectTo, router])

  return hasPermission
}