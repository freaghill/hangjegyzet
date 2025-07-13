'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Activity, 
  Loader2, 
  Server,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics'

export function RealtimeMetrics() {
  const { metrics, isConnected } = useRealtimeAnalytics()

  const getLoadColor = (load: number) => {
    if (load < 50) return 'text-green-600'
    if (load < 80) return 'text-yellow-600'
    return 'text-red-600'
  }


  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-end">
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3" />
              Élő kapcsolat
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              Nincs kapcsolat
            </>
          )}
        </Badge>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktív felhasználók</p>
              <p className="text-3xl font-bold text-green-600">
                {metrics.activeUsers}
              </p>
              <p className="text-xs text-gray-500 mt-1">Elmúlt 5 percben</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktív átírások</p>
              <p className="text-3xl font-bold text-blue-600">
                {metrics.activeTranscriptions}
              </p>
              <p className="text-xs text-gray-500 mt-1">Folyamatban</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Várakozó feladatok</p>
              <p className="text-3xl font-bold text-purple-600">
                {metrics.queuedJobs}
              </p>
              <p className="text-xs text-gray-500 mt-1">Feldolgozásra vár</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Loader2 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Rendszer terhelés</p>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-2xl font-bold ${getLoadColor(metrics.systemLoad)}`}>
                    {metrics.systemLoad}%
                  </span>
                  <Zap className={`h-5 w-5 ${getLoadColor(metrics.systemLoad)}`} />
                </div>
                <Progress 
                  value={metrics.systemLoad} 
                  className="h-2"
                />
              </div>
            </div>
            <div className="ml-4 p-3 bg-gray-100 rounded-full">
              <Server className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}