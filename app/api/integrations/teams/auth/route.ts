import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTeamsIntegrationService } from '@/lib/integrations/teams'
import { nanoid } from 'nanoid'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Generate state for CSRF protection
    const state = nanoid()
    
    // Store state in session
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        state,
        user_id: user.id,
        provider: 'teams',
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      })

    if (stateError) {
      console.error('Failed to store OAuth state:', stateError)
      return NextResponse.json(
        { error: 'Failed to initiate OAuth flow' },
        { status: 500 }
      )
    }

    // Get authorization URL
    const service = createTeamsIntegrationService()
    const authUrl = service.getAuthorizationUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Teams auth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Teams authentication' },
      { status: 500 }
    )
  }
}