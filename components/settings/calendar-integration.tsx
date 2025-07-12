'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Calendar, Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface CalendarInfo {
  id: string
  name: string
  primary: boolean
  selected: boolean
}

interface CalendarIntegration {
  id: string
  is_active: boolean
  calendars: CalendarInfo[]
  created_at: string
}

export default function CalendarIntegration() {
  const [integration, setIntegration] = useState<CalendarIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadIntegration()
  }, [])

  const loadIntegration = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('google_calendar_integrations')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading integration:', error)
      }

      setIntegration(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      window.location.href = '/api/integrations/calendar/auth'
    } catch (error) {
      console.error('Error:', error)
      toast.error('Hiba történt a kapcsolódás során')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch('/api/integrations/calendar/auth', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setIntegration(null)
      toast.success('Google Naptár sikeresen leválasztva')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Hiba történt a leválasztás során')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleCalendarToggle = async (calendarId: string, selected: boolean) => {
    if (!integration) return

    const updatedCalendars = integration.calendars.map(cal =>
      cal.id === calendarId ? { ...cal, selected } : cal
    )

    // Update local state immediately for better UX
    setIntegration({
      ...integration,
      calendars: updatedCalendars,
    })

    // Save to backend
    try {
      const response = await fetch('/api/integrations/calendar/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendars: updatedCalendars }),
      })

      if (!response.ok) {
        throw new Error('Failed to update calendars')
      }
    } catch (error) {
      console.error('Error updating calendars:', error)
      toast.error('Nem sikerült frissíteni a naptár beállításokat')
      // Revert on error
      loadIntegration()
    }
  }

  const handleSyncNow = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/integrations/calendar/sync?days=30', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const result = await response.json()
      toast.success(`${result.synced} esemény sikeresen szinkronizálva`)
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Szinkronizálás sikertelen')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Naptár
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Naptár
        </CardTitle>
        <CardDescription>
          Kapcsolja össze Google Naptárját a meetingek automatikus követéséhez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration || !integration.is_active ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-medium text-blue-900 mb-2">Mit nyújt a Google Naptár integráció?</h4>
              <ul className="space-y-1 text-sm text-blue-700">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Közelgő meetingek megjelenítése a dashboardon</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Automatikus meeting cím generálás a naptár eseményekből</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Meeting összefoglalók hozzáadása a naptár eseményekhez</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Ismétlődő meetingek támogatása</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={handleConnect}
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
                  <Calendar className="mr-2 h-4 w-4" />
                  Google Naptár kapcsolása
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-900">Google Naptár kapcsolva</p>
                  <p className="text-sm text-green-700">
                    Kapcsolódva: {new Date(integration.created_at).toLocaleDateString('hu-HU')}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">
                Aktív
              </Badge>
            </div>

            {integration.calendars && integration.calendars.length > 0 && (
              <div className="space-y-3">
                <Label>Válassza ki a figyelni kívánt naptárakat:</Label>
                <div className="space-y-2">
                  {integration.calendars.map((calendar) => (
                    <div
                      key={calendar.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={calendar.selected}
                          onCheckedChange={(checked) => 
                            handleCalendarToggle(calendar.id, checked)
                          }
                        />
                        <div>
                          <p className="font-medium text-sm">{calendar.name}</p>
                          {calendar.primary && (
                            <p className="text-xs text-gray-600">Elsődleges naptár</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Szinkronizálás...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Események szinkronizálása
                  </>
                )}
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-full"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Leválasztás...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Kapcsolat bontása
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}