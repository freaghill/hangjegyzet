import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID!
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET!
const ZOOM_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/import/zoom/callback'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (!code || !state) {
      return new NextResponse('Missing code or state', { status: 400 })
    }

    // Verify state
    const storedState = request.cookies.get('zoom_oauth_state')?.value
    if (!storedState || storedState !== state) {
      return new NextResponse('Invalid state', { status: 400 })
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: ZOOM_REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Zoom token error:', error)
      return new NextResponse('Failed to get access token', { status: 500 })
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Get user info from state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const userId = stateData.userId

    // Store tokens securely
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'zoom',
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
        metadata: {
          connected_at: new Date().toISOString(),
        },
      })

    // Return success page that closes the window
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Zoom Import - Sikeres kapcsolódás</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({ type: 'zoom-auth-success' }, '*');
            window.close();
          </script>
          <p>Sikeres kapcsolódás! Ez az ablak bezárható.</p>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    )
  } catch (error) {
    console.error('Zoom callback error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}