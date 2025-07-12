import { NextRequest, NextResponse } from 'next/server'
import { getSlackOAuthUrl } from '@/lib/integrations/slack/slack-service'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  
  if (!state) {
    return NextResponse.json({ error: 'State parameter required' }, { status: 400 })
  }
  
  // Redirect to Slack OAuth
  const oauthUrl = getSlackOAuthUrl(state)
  return NextResponse.redirect(oauthUrl)
}