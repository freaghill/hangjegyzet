import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleDrive } from '@/lib/integrations/google-drive'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
    )
  }

  if (!code || !state) {
    // Generate auth URL and redirect
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state with user ID for security
    const authState = Buffer.from(
      JSON.stringify({ userId: user.id, timestamp: Date.now() })
    ).toString('base64')

    const authUrl = googleDrive.getAuthUrl(authState)
    return NextResponse.redirect(authUrl)
  }

  try {
    // Exchange code for tokens
    const tokens = await googleDrive.getTokens(code)
    
    // Decode state to get user ID
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== decodedState.userId) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 401 })
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Store tokens in database
    const { error: dbError } = await supabase
      .from('google_drive_integrations')
      .upsert({
        user_id: user.id,
        organization_id: membership.organization_id,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        is_active: true,
      }, {
        onConflict: 'user_id,organization_id'
      })

    if (dbError) {
      console.error('Failed to store tokens:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=database_error`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=google_drive_connected`
    )
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=oauth_failed`
    )
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Revoke access from Google
    try {
      await googleDrive.revokeAccess({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
      })
    } catch (error) {
      console.error('Failed to revoke Google access:', error)
      // Continue with deletion even if revoke fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('google_drive_integrations')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete integration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}