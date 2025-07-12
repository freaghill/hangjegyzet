import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTeamsIntegrationService, saveTeamsIntegration } from '@/lib/integrations/teams'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Teams OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=teams_auth_failed`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_params`
      )
    }

    const supabase = await createClient()

    // Verify state
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .eq('provider', 'teams')
      .gte('expires_at', new Date().toISOString())
      .single()

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      )
    }

    // Delete used state
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state', state)

    // Exchange code for tokens
    const service = createTeamsIntegrationService()
    const tokens = await service.exchangeCodeForToken(code)

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', oauthState.user_id)
      .single()

    if (!member) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=no_organization`
      )
    }

    // Save integration
    await saveTeamsIntegration(
      oauthState.user_id,
      member.organization_id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in
    )

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=teams_connected`
    )
  } catch (error) {
    console.error('Teams callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=teams_callback_failed`
    )
  }
}