import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { emailService } from '@/lib/email/sendgrid'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Exchange code for session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session) {
      // Check if this is a new user
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, email, full_name')
        .eq('id', session.user.id)
        .single()
      
      if (profile) {
        const createdAt = new Date(profile.created_at)
        const now = new Date()
        const timeDiff = now.getTime() - createdAt.getTime()
        const isNewUser = timeDiff < 60000 // Less than 1 minute old
        
        if (isNewUser) {
          // Send welcome email
          try {
            await emailService.sendWelcomeEmail({
              email: profile.email || session.user.email!,
              name: profile.full_name
            })
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError)
          }
        }
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}