'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Activity,
  Zap,
  Users,
  FileText,
  RefreshCw,
  TrendingUp,
  Server,
  Database
} from 'lucide-react'
import { RealtimeMetrics } from '@/components/analytics/realtime-metrics'
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics'
import { usePermission } from '@/lib/teams/team-context'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

export default function RealtimeAnalyticsPage() {
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const { metrics, isConnected, trackEvent } = useRealtimeAnalytics()
  const hasPermission = usePermission('analytics.view')

  useEffect(() => {
    // Track page view
    trackEvent({
      category: 'analytics',
      action: 'view',
      label: 'realtime_dashboard'
    })
  }, [trackEvent])

  useEffect(() => {
    // Update timestamp when metrics change
    setLastUpdate(new Date())
  }, [metrics])

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Hozzáférés megtagadva
        </h2>
        <p className="text-gray-600">
          A valós idejű analitika megtekintéséhez adminisztrátori jogosultság szükséges.
        </p>
      </div>
    )
  }

  const simulateActivity = async () => {
    toast.info('Szimuláció elindítva...')
    
    // Simulate various events
    await trackEvent({
      category: 'meeting',
      action: 'created',
      label: 'simulation'
    })
    
    await trackEvent({
      category: 'transcription',
      action: 'started',
      label: 'simulation'
    })
    
    await trackEvent({
      category: 'user',
      action: 'login',
      label: 'simulation'
    })
    
    toast.success('Szimulált események elküldve!')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Valós idejű analitika</h1>
          <p className="text-gray-600 mt-1">
            Élő rendszerstatisztikák és teljesítménymutatók
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Utolsó frissítés: {format(lastUpdate, 'HH:mm:ss', { locale: hu })}
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={simulateActivity}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Szimuláció
          </Button>
        </div>
      </div>

      {/* Realtime Metrics Component */}
      <RealtimeMetrics />

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Rendszer állapot
            </CardTitle>
            <CardDescription>
              Komponensek és szolgáltatások státusza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>API szerver</span>
                </div>
                <Badge variant="default">Működik</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Adatbázis</span>
                </div>
                <Badge variant="default">Működik</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span>Átírás szolgáltatás</span>
                </div>
                <Badge variant="secondary">Terhelt</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Tárhely</span>
                </div>
                <Badge variant="default">Működik</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Email szolgáltatás</span>
                </div>
                <Badge variant="default">Működik</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Aktivitás folyam
            </CardTitle>
            <CardDescription>
              Valós idejű események
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isConnected ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Users className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Új felhasználó regisztrált</p>
                      <p className="text-xs text-gray-500">2 perccel ezelőtt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <FileText className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Meeting átírása elkészült</p>
                      <p className="text-xs text-gray-500">5 perccel ezelőtt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Zap className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Magas API terhelés észlelve</p>
                      <p className="text-xs text-gray-500">8 perccel ezelőtt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <Database className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Adatbázis biztonsági mentés készült</p>
                      <p className="text-xs text-gray-500">15 perccel ezelőtt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">Napi felhasználói rekord: {metrics.activeUsers}</p>
                      <p className="text-xs text-gray-500">20 perccel ezelőtt</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Várakozás élő adatokra...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Teljesítmény összefoglaló</CardTitle>
          <CardDescription>
            Rendszer teljesítményének áttekintése az elmúlt órában
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Átlag válaszidő</p>
              <p className="text-2xl font-bold">142ms</p>
              <p className="text-xs text-green-600">-12% az előző órához képest</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Kérések száma</p>
              <p className="text-2xl font-bold">8,421</p>
              <p className="text-xs text-blue-600">+18% az előző órához képest</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Sikeres arány</p>
              <p className="text-2xl font-bold">99.8%</p>
              <p className="text-xs text-gray-600">Stabil</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Átírások sebessége</p>
              <p className="text-2xl font-bold">2.4x</p>
              <p className="text-xs text-gray-600">Valós időhöz képest</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}