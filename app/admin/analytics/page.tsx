import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin/auth'
import AnalyticsClient from '@/components/admin/analytics-client'

export default async function AnalyticsPage() {
  await checkAdminAuth()
  const supabase = await createClient()
  
  // Get usage data for the last 6 months
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setDate(1)
  sixMonthsAgo.setHours(0, 0, 0, 0)
  
  const { data: usageData } = await supabase
    .from('usage_stats')
    .select(`
      month,
      minutes_used,
      meetings_count,
      organizations (
        name,
        subscription_tier
      )
    `)
    .gte('month', sixMonthsAgo.toISOString())
    .order('month', { ascending: true })
  
  // Get meeting statistics
  const { data: meetingStats } = await supabase
    .from('meetings')
    .select('status, created_at, duration_seconds')
    .gte('created_at', sixMonthsAgo.toISOString())
  
  // Get subscription distribution
  const { data: subscriptionData } = await supabase
    .from('organizations')
    .select('subscription_tier')
  
  // Process data for charts
  const monthlyUsage = processMonthlyUsage(usageData || [])
  const statusDistribution = processStatusDistribution(meetingStats || [])
  const tierDistribution = processTierDistribution(subscriptionData || [])
  const topOrganizations = processTopOrganizations(usageData || [])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform usage analytics and insights</p>
      </div>

      <AnalyticsClient
        monthlyUsage={monthlyUsage}
        statusDistribution={statusDistribution}
        tierDistribution={tierDistribution}
        topOrganizations={topOrganizations}
      />
    </div>
  )
}

function processMonthlyUsage(data: any[]) {
  const monthlyMap = new Map()
  
  data.forEach(item => {
    const month = new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { month, minutes: 0, meetings: 0 })
    }
    const existing = monthlyMap.get(month)
    existing.minutes += item.minutes_used || 0
    existing.meetings += item.meetings_count || 0
  })
  
  return Array.from(monthlyMap.values())
}

function processStatusDistribution(data: any[]) {
  const statusCounts = {
    completed: 0,
    processing: 0,
    failed: 0,
    uploading: 0
  }
  
  data.forEach(meeting => {
    if (meeting.status in statusCounts) {
      statusCounts[meeting.status as keyof typeof statusCounts]++
    }
  })
  
  return Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count
  }))
}

function processTierDistribution(data: any[]) {
  const tierCounts = {
    trial: 0,
    starter: 0,
    professional: 0,
    enterprise: 0
  }
  
  data.forEach(org => {
    if (org.subscription_tier in tierCounts) {
      tierCounts[org.subscription_tier as keyof typeof tierCounts]++
    }
  })
  
  return Object.entries(tierCounts).map(([tier, count]) => ({
    tier,
    count
  }))
}

function processTopOrganizations(data: any[]) {
  const orgMap = new Map()
  
  data.forEach(item => {
    if (item.organizations?.name) {
      const orgName = item.organizations.name
      if (!orgMap.has(orgName)) {
        orgMap.set(orgName, { name: orgName, minutes: 0, meetings: 0 })
      }
      const existing = orgMap.get(orgName)
      existing.minutes += item.minutes_used || 0
      existing.meetings += item.meetings_count || 0
    }
  })
  
  return Array.from(orgMap.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 10)
}