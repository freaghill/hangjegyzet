import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!
const ZOOM_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/import/zoom/callback'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Generate state for CSRF protection
  const state = Buffer.from(JSON.stringify({
    userId: user.id,
    timestamp: Date.now(),
  })).toString('base64')

  // Store state in session
  const response = NextResponse.redirect(
    `https://zoom.us/oauth/authorize?` +
    `response_type=code&` +
    `client_id=${ZOOM_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}&` +
    `state=${state}`
  )

  response.cookies.set('zoom_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
  })

  return response
}