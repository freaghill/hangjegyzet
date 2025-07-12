import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MeetingAnalyticsDashboard } from '@/components/analytics/meeting-analytics-dashboard'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  // Get member role from organization_members table
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', profile.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    redirect('/dashboard')
  }

  // Get organization details
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meeting Analytics</h1>
        <p className="text-gray-600 mt-2">
          Részletes elemzések és insights a {organization?.name} meetingjeiről
        </p>
      </div>
      
      <MeetingAnalyticsDashboard 
        organizationId={profile.organization_id}
        userRole={member.role}
      />
    </div>
  )
}