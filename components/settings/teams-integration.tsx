'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Video, Users, Calendar, Check, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TeamsIntegration {
  id: string
  user_id: string
  organization_id: string
  expires_at: string
  created_at: string
  updated_at: string
}

export function TeamsIntegrationSettings() {
  const [integration, setIntegration] = useState<TeamsIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadIntegration()
  }, [])

  const loadIntegration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('teams_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (!error && data) {
        setIntegration(data)
      }
    } catch (error) {
      console.error('Error loading Teams integration:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const connectTeams = async () => {
    setIsConnecting(true)
    try {
      // Redirect to Teams OAuth flow
      window.location.href = '/api/integrations/teams/auth'
    } catch (error) {
      console.error('Error connecting Teams:', error)
      toast.error('Nem sikerült kapcsolódni a Microsoft Teams-hez')
      setIsConnecting(false)
    }
  }

  const disconnectTeams = async () => {
    if (!integration) return

    setIsDisconnecting(true)
    try {
      const { error } = await supabase
        .from('teams_integrations')
        .delete()
        .eq('id', integration.id)

      if (error) throw error

      setIntegration(null)
      toast.success('Microsoft Teams integráció sikeresen eltávolítva')
    } catch (error) {
      console.error('Error disconnecting Teams:', error)
      toast.error('Nem sikerült eltávolítani a Teams integrációt')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const syncMeetings = async () => {
    try {
      toast.loading('Meetingek szinkronizálása...')
      
      const response = await fetch('/api/integrations/teams/sync', {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()
      toast.dismiss()
      toast.success(`${result.synced} meeting sikeresen szinkronizálva`)
    } catch (error) {
      console.error('Sync error:', error)
      toast.dismiss()
      toast.error('Szinkronizálás sikertelen')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Video className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Microsoft Teams</CardTitle>
              <CardDescription>
                Csatlakozzon Teams meetingekhez és importálja a felvételeket
              </CardDescription>
            </div>
          </div>
          {integration && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Kapcsolódva
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration ? (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Kapcsolódjon Microsoft Teams fiókjához a meetingek és felvételek automatikus importálásához.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Mit tud a Teams integráció?</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Video className="h-4 w-4" />
                  <span>Meeting felvételek automatikus importálása</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>Résztvevők és jelenlét követése</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Naptár események szinkronizálása</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={connectTeams} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kapcsolódás...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Teams kapcsolat létrehozása
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kapcsolat állapota</span>
                <Badge variant="default" className="bg-green-600">Aktív</Badge>
              </div>
              
              <div className="text-sm text-gray-600">
                <p>Kapcsolódva: {new Date(integration.created_at).toLocaleDateString('hu-HU')}</p>
                <p>Token lejár: {new Date(integration.expires_at).toLocaleDateString('hu-HU')}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={syncMeetings}
                  className="flex-1"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Meetingek szinkronizálása
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectTeams}
                  disabled={isDisconnecting}
                  className="text-red-600 hover:bg-red-50"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Leválasztás'
                  )}
                </Button>
              </div>
            </div>

            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                A Teams integráció sikeresen beállítva. Az új meetingek automatikusan importálódnak.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  )
}