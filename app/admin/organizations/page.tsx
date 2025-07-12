import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin/auth'
import OrganizationManagementClient from '@/components/admin/organization-management-client'

export default async function OrganizationsPage() {
  await checkAdminAuth()
  const supabase = await createClient()
  
  // Fetch organizations with user count and usage stats
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      *,
      profiles!inner (
        id
      ),
      usage_stats (
        minutes_used,
        meetings_count
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching organizations:', error)
    return <div>Error loading organizations</div>
  }

  // Process data to include user counts and total usage
  const processedOrgs = organizations?.map(org => {
    const userCount = org.profiles?.length || 0
    const totalMinutes = org.usage_stats?.reduce((sum: number, stat: any) => sum + (stat.minutes_used || 0), 0) || 0
    const totalMeetings = org.usage_stats?.reduce((sum: number, stat: any) => sum + (stat.meetings_count || 0), 0) || 0
    
    return {
      ...org,
      userCount,
      totalMinutes,
      totalMeetings,
      profiles: undefined,
      usage_stats: undefined
    }
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
        <p className="text-gray-600 mt-2">Manage organizations and their subscriptions</p>
      </div>

      <OrganizationManagementClient initialOrganizations={processedOrgs || []} />
    </div>
  )
}