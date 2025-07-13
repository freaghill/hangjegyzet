import { createClient } from '@/lib/supabase/client'

// Admin users whitelist - in production, this should be in environment variables
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').filter(Boolean)

export async function checkAdminAuthClient() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { isAdmin: false, user: null }
  }
  
  // Check if user email is in admin list
  const isAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false
  
  return { isAdmin, user }
}