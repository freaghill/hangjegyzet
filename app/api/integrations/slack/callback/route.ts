import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { slackOAuthConfig } from '@/lib/integrations/slack/slack-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  
  if (!code || !state) {
    return NextResponse.redirect('/dashboard/integrations?error=missing_params')
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: slackOAuthConfig.clientId,
        client_secret: slackOAuthConfig.clientSecret,
        code,
        redirect_uri: slackOAuthConfig.redirectUri
      })
    })
    
    const tokenData = await tokenResponse.json()
    
    if (!tokenData.ok) {
      console.error('Slack OAuth error:', tokenData)
      return NextResponse.redirect('/dashboard/integrations?error=oauth_failed')
    }
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect('/login')
    }
    
    // Save integration
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: user.id,
        provider: 'slack',
        access_token: tokenData.access_token,
        metadata: {
          team_id: tokenData.team.id,
          team_name: tokenData.team.name,
          channel: tokenData.incoming_webhook?.channel,
          channel_id: tokenData.incoming_webhook?.channel_id,
          configuration_url: tokenData.incoming_webhook?.configuration_url,
          bot_user_id: tokenData.bot_user_id,
          scope: tokenData.scope
        },
        updated_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error saving Slack integration:', error)
      return NextResponse.redirect('/dashboard/integrations?error=save_failed')
    }
    
    return NextResponse.redirect('/dashboard/integrations?success=slack_connected')
  } catch (error) {
    console.error('Slack callback error:', error)
    return NextResponse.redirect('/dashboard/integrations?error=unexpected')
  }
}