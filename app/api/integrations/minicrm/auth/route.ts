import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { miniCRM } from '@/lib/integrations/minicrm'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const systemId = searchParams.get('system_id')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
    )
  }

  // If no code, initiate OAuth flow
  if (!code) {
    if (!systemId) {
      return NextResponse.json(
        { error: 'MiniCRM system ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Generate state with user info
    const authState = Buffer.from(
      JSON.stringify({
        userId: user.id,
        organizationId: profile.organization_id,
        systemId,
        timestamp: Date.now()
      })
    ).toString('base64')

    const authUrl = miniCRM.getAuthUrl(systemId, authState)
    return NextResponse.redirect(authUrl)
  }

  // Handle OAuth callback
  try {
    if (!state) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }

    // Decode state
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
    const { userId, organizationId, systemId: stateSystemId } = decodedState

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 401 })
    }

    // Exchange code for tokens
    const tokens = await miniCRM.getTokens(stateSystemId, code)

    // Calculate token expiry
    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null

    // Get activity types to find meeting type
    let activityTypeId = null
    try {
      const activityTypes = await miniCRM.getActivityTypes(
        stateSystemId,
        tokens.access_token
      )
      
      // Look for meeting-related activity types
      const meetingType = activityTypes.find(type => 
        type.Name.toLowerCase().includes('találkozó') ||
        type.Name.toLowerCase().includes('meeting') ||
        type.Name.toLowerCase().includes('megbeszélés')
      )
      
      if (meetingType) {
        activityTypeId = meetingType.Id
      }
    } catch (error) {
      console.error('Failed to fetch activity types:', error)
    }

    // Store integration in database
    const { error: dbError } = await supabase
      .from('minicrm_integrations')
      .upsert({
        user_id: user.id,
        organization_id: organizationId,
        system_id: stateSystemId,
        api_url: `https://${stateSystemId}.minicrm.hu`,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokenExpiry,
        activity_type_id: activityTypeId,
        is_active: true,
      }, {
        onConflict: 'user_id,organization_id'
      })

    if (dbError) {
      console.error('Failed to store MiniCRM integration:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=database_error`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=minicrm_connected`
    )
  } catch (error) {
    console.error('MiniCRM OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=oauth_failed`
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete integration
    const { error: deleteError } = await supabase
      .from('minicrm_integrations')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 }
      )
    }

    // Also delete related data
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Delete meeting links
      await supabase
        .from('minicrm_meeting_links')
        .delete()
        .eq('organization_id', profile.organization_id)

      // Delete entity cache
      await supabase
        .from('minicrm_entity_cache')
        .delete()
        .eq('organization_id', profile.organization_id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete MiniCRM integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { systemId } = await request.json()

    if (!systemId) {
      return NextResponse.json(
        { error: 'MiniCRM system ID is required' },
        { status: 400 }
      )
    }

    // Validate system ID format
    if (!/^[a-zA-Z0-9-]+$/.test(systemId)) {
      return NextResponse.json(
        { error: 'Invalid MiniCRM system ID format' },
        { status: 400 }
      )
    }

    // Return auth URL
    return NextResponse.json({
      authUrl: `/api/integrations/minicrm/auth?system_id=${systemId}`
    })
  } catch (error) {
    console.error('MiniCRM auth initiation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}