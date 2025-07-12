'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database,
  HardDrive,
  Zap,
  RefreshCw,
  XCircle,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface SystemHealthClientProps {
  healthChecks: {
    database: string
    storage: string
    apiEndpoints: string
    transcriptionService: string
  }
  failedMeetings: Array<{
    id: string
    title: string | null
    status: string
    created_at: string
  }>
  processingQueue: Array<{
    id: string
    title: string | null
    created_at: string
    duration_seconds: number | null
  }>
  storageUsage: {
    used: number
    total: number
    unit: string
  }
  apiStats: {
    whisper: { calls: number; errors: number }
    deepgram: { calls: number; errors: number }
    claude: { calls: number; errors: number }
  }
}

export default function SystemHealthClient({
  healthChecks,
  failedMeetings,
  processingQueue,
  storageUsage,
  apiStats
}: SystemHealthClientProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />
      case 'degraded': return <AlertTriangle className="w-5 h-5" />
      case 'unhealthy': return <XCircle className="w-5 h-5" />
      default: return <Activity className="w-5 h-5" />
    }
  }

  const storagePercentage = (storageUsage.used / storageUsage.total) * 100

  return (
    <div className="space-y-6">
      {/* Health Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Database</span>
            </div>
            <div className={`flex items-center gap-1 ${getHealthColor(healthChecks.database)}`}>
              {getHealthIcon(healthChecks.database)}
            </div>
          </div>
          <p className="text-sm text-gray-600 capitalize">{healthChecks.database}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Storage</span>
            </div>
            <div className={`flex items-center gap-1 ${getHealthColor(healthChecks.storage)}`}>
              {getHealthIcon(healthChecks.storage)}
            </div>
          </div>
          <p className="text-sm text-gray-600 capitalize">{healthChecks.storage}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-gray-600" />
              <span className="font-medium">API Endpoints</span>
            </div>
            <div className={`flex items-center gap-1 ${getHealthColor(healthChecks.apiEndpoints)}`}>
              {getHealthIcon(healthChecks.apiEndpoints)}
            </div>
          </div>
          <p className="text-sm text-gray-600 capitalize">{healthChecks.apiEndpoints}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-gray-600" />
              <span className="font-medium">Transcription</span>
            </div>
            <div className={`flex items-center gap-1 ${getHealthColor(healthChecks.transcriptionService)}`}>
              {getHealthIcon(healthChecks.transcriptionService)}
            </div>
          </div>
          <p className="text-sm text-gray-600 capitalize">{healthChecks.transcriptionService}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Storage Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Used: {storageUsage.used} {storageUsage.unit}</span>
              <span>Total: {storageUsage.total} {storageUsage.unit}</span>
            </div>
            <Progress value={storagePercentage} className="h-3" />
            <p className="text-sm text-gray-600">
              {storagePercentage.toFixed(1)}% of storage capacity used
            </p>
          </div>
        </Card>

        {/* API Usage Stats */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">API Usage (Last 24h)</h2>
          <div className="space-y-3">
            {Object.entries(apiStats).map(([service, stats]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="capitalize">{service}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{stats.calls} calls</span>
                  {stats.errors > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {stats.errors} errors
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Processing Queue */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Processing Queue</h2>
          <Badge>{processingQueue.length} items</Badge>
        </div>
        {processingQueue.length > 0 ? (
          <div className="space-y-2">
            {processingQueue.slice(0, 5).map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{meeting.title || 'Untitled Meeting'}</p>
                  <p className="text-sm text-gray-600">
                    Started {format(new Date(meeting.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {meeting.duration_seconds ? `${Math.round(meeting.duration_seconds / 60)}m` : 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
            {processingQueue.length > 5 && (
              <p className="text-sm text-gray-600 text-center pt-2">
                And {processingQueue.length - 5} more...
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No meetings currently processing</p>
        )}
      </Card>

      {/* Recent Failures */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Failed Meetings</h2>
        {failedMeetings.length > 0 ? (
          <div className="space-y-2">
            {failedMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium">{meeting.title || 'Untitled Meeting'}</p>
                  <p className="text-sm text-gray-600">
                    Failed at {format(new Date(meeting.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No recent failures</p>
        )}
      </Card>
    </div>
  )
}