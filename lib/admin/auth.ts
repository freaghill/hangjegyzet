import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Admin users whitelist - in production, this should be in environment variables
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)

export async function checkAdminAuth() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Check if user is an admin
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')
  
  if (!isAdmin) {
    // Check if user has admin role in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'admin' && profile?.role !== 'owner') {
      redirect('/dashboard')
    }
  }
  
  return { user, isAdmin: true }
}

export async function getAdminStats() {
  const supabase = await createClient()
  
  // Get total users count
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  
  // Get total organizations count
  const { count: orgsCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
  
  // Get total meetings count
  const { count: meetingsCount } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
  
  // Get active subscriptions count
  const { count: activeSubscriptions } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .not('subscription_tier', 'eq', 'trial')
    .gte('subscription_ends_at', new Date().toISOString())
  
  // Get this month's usage
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)
  
  const { data: monthlyUsage } = await supabase
    .from('usage_stats')
    .select('minutes_used, meetings_count')
    .gte('month', currentMonth.toISOString())
  
  const totalMinutes = monthlyUsage?.reduce((sum, stat) => sum + (stat.minutes_used || 0), 0) || 0
  const totalMeetings = monthlyUsage?.reduce((sum, stat) => sum + (stat.meetings_count || 0), 0) || 0
  
  return {
    usersCount: usersCount || 0,
    orgsCount: orgsCount || 0,
    meetingsCount: meetingsCount || 0,
    activeSubscriptions: activeSubscriptions || 0,
    monthlyMinutes: totalMinutes,
    monthlyMeetings: totalMeetings
  }
}