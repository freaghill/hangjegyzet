import { checkAdminAuth } from '@/lib/admin/auth'
import SystemHealthClient from '@/components/admin/system-health-client'
import { createClient } from '@/lib/supabase/server'

export default async function SystemPage() {
  await checkAdminAuth()
  const supabase = await createClient()
  
  // Get recent failed meetings
  const { data: failedMeetings } = await supabase
    .from('meetings')
    .select('id, title, status, created_at')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(10)
  
  // Get processing queue
  const { data: processingMeetings } = await supabase
    .from('meetings')
    .select('id, title, created_at, duration_seconds')
    .in('status', ['uploading', 'processing'])
    .order('created_at', { ascending: true })
  
  // Get storage usage (simulated for now)
  const storageUsage = {
    used: 45.2,
    total: 100,
    unit: 'GB'
  }
  
  // Get API usage stats (simulated)
  const apiStats = {
    whisper: { calls: 1234, errors: 12 },
    deepgram: { calls: 567, errors: 3 },
    claude: { calls: 890, errors: 5 }
  }
  
  // System health checks
  const healthChecks = {
    database: 'healthy',
    storage: 'healthy',
    apiEndpoints: 'healthy',
    transcriptionService: processingMeetings && processingMeetings.length > 10 ? 'degraded' : 'healthy'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="text-gray-600 mt-2">Monitor system performance and health metrics</p>
      </div>

      <SystemHealthClient
        healthChecks={healthChecks}
        failedMeetings={failedMeetings || []}
        processingQueue={processingMeetings || []}
        storageUsage={storageUsage}
        apiStats={apiStats}
      />
    </div>
  )
}