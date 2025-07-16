'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileAudio, Clock, Users, Target, Upload } from 'lucide-react'
import { ModeUsageDashboard } from '@/components/usage/mode-usage-dashboard'
import { UpcomingMeetings } from '@/components/dashboard/upcoming-meetings'
import { UploadDialog } from '@/components/meetings/upload-dialog'
import { UsageForecast } from '@/components/usage/usage-forecast'
import { useOrganization } from '@/hooks/useOrganization'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'
import type { ModeAllocation } from '@/lib/payments/subscription-plans'
import { useUIMode } from '@/hooks/use-ui-mode'
import { UIModeToggle, AdvancedFeature } from '@/components/ui-mode-toggle'

interface Meeting {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: string
  transcription_mode?: 'fast' | 'balanced' | 'precision'
  metadata?: {
    progress?: number
  }
}

export default function DashboardPage() {
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([])
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true)
  const [currentUsage, setCurrentUsage] = useState<ModeAllocation | null>(null)
  const supabase = createClient()
  const { organization } = useOrganization()

  const loadMeetings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('id, title, created_at, duration_seconds, status, transcription_mode, metadata')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentMeetings(data || [])
    } catch (error) {
      console.error('Error loading meetings:', error)
    } finally {
      setIsLoadingMeetings(false)
    }
  }, [supabase])

  const loadCurrentUsage = useCallback(async () => {
    if (!organization) return

    try {
      const response = await fetch('/api/usage/mode-status')
      if (response.ok) {
        const data = await response.json()
        // Convert the mode status array to ModeAllocation format
        const usage: ModeAllocation = {
          fast: 0,
          balanced: 0,
          precision: 0
        }
        data.modeStatus.forEach((mode: any) => {
          usage[mode.mode as keyof ModeAllocation] = mode.used
        })
        setCurrentUsage(usage)
      }
    } catch (error) {
      console.error('Error loading usage:', error)
    }
  }, [organization])

  useEffect(() => {
    loadMeetings()
    loadCurrentUsage()
    
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadMeetings()
      loadCurrentUsage()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [loadMeetings, loadCurrentUsage])

  // Get user's subscription plan
  const userPlan = organization ? getSubscriptionPlan(organization.subscription_tier) : undefined

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'fast':
        return '⚡'
      case 'balanced':
        return '⚖️'
      case 'precision':
        return '🎯'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900">Üdvözöljük!</h1>
          <p className="text-gray-600 mt-2">
            Töltse fel meeting felvételét és válasszon a három átírási mód közül.
          </p>
        </div>
        <div className="lg:col-span-1 flex justify-end items-start gap-4">
          <UIModeToggle />
          <UploadDialog userPlan={userPlan} currentUsage={currentUsage || undefined}>
            <Button size="lg">
              <Upload className="mr-2 h-5 w-5" />
              Új meeting feltöltése
            </Button>
          </UploadDialog>
        </div>
      </div>

      {/* Mode Usage Dashboard */}
      {organization && <ModeUsageDashboard />}

      {/* Usage Forecast - Advanced Feature */}
      <AdvancedFeature>
        {organization && userPlan && currentUsage && (
          <UsageForecast
            organizationId={organization.id}
            currentUsage={currentUsage}
            limits={userPlan.limits.modeAllocation}
          />
        )}
      </AdvancedFeature>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats and Recent Meetings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Megbeszélések</p>
                    <p className="text-2xl font-bold">{recentMeetings.length}</p>
                  </div>
                  <FileAudio className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-effect">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Összes idő</p>
                    <p className="text-2xl font-bold">
                      {Math.round(
                        recentMeetings.reduce((acc, m) => acc + (m.duration_seconds || 0), 0) / 60
                      )} perc
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Meetings */}
          <Card className="glass-effect">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Legutóbbi megbeszélések</CardTitle>
                <Link href="/meetings">
                  <Button variant="outline" size="sm">
                    Összes megtekintése
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMeetings ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : recentMeetings.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  Még nincs feltöltött meeting
                </p>
              ) : (
                <div className="space-y-4">
                  {recentMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{meeting.title}</h3>
                          {meeting.transcription_mode && (
                            <span className="text-sm" title={`${meeting.transcription_mode} mode`}>
                              {getModeIcon(meeting.transcription_mode)}
                            </span>
                          )}
                          {meeting.status === 'processing' && (
                            <Badge variant="secondary" className="text-xs">
                              Feldolgozás alatt
                              {meeting.metadata?.progress && ` ${meeting.metadata.progress}%`}
                            </Badge>
                          )}
                          {meeting.status === 'completed' && (
                            <Badge variant="default" className="text-xs">
                              Kész
                            </Badge>
                          )}
                          {meeting.status === 'failed' && (
                            <Badge variant="destructive" className="text-xs">
                              Sikertelen
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>{new Date(meeting.created_at).toLocaleDateString('hu-HU')}</span>
                          {meeting.duration_seconds > 0 && (
                            <>
                              <span>•</span>
                              <span>{Math.round(meeting.duration_seconds / 60)} perc</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Link href={`/meetings/${meeting.id}`}>
                        <Button variant="outline" size="sm">
                          Megnyitás
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <AdvancedFeature>
            <UpcomingMeetings />
          </AdvancedFeature>
          
          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Gyors tippek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="font-semibold">Fast mód</p>
                  <p className="text-gray-600">Tiszta hangfelvételekhez, gyors eredmény</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚖️</span>
                <div>
                  <p className="font-semibold">Balanced mód</p>
                  <p className="text-gray-600">Üzleti megbeszélésekhez, optimális ár-érték arány</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🎯</span>
                <div>
                  <p className="font-semibold">Precision mód</p>
                  <p className="text-gray-600">Kritikus pontosság jogi vagy orvosi tartalmakhoz</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}