import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('webhook_id')

    // Build query
    let query = supabase
      .from('notification_preferences')
      .select('*')
      .eq('organization_id', profile.organization_id)

    if (webhookId) {
      query = query.eq('webhook_id', webhookId)
    }

    const { data: preferences, error } = await query
      .order('event_type', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { preferences } = body

    if (!Array.isArray(preferences)) {
      return NextResponse.json({ error: 'Invalid preferences format' }, { status: 400 })
    }

    // Update preferences in batch
    const updates = await Promise.all(preferences.map(async (pref) => {
      const { id, webhook_id, event_type, enabled, filters } = pref

      if (id) {
        // Update existing preference
        const { data, error } = await supabase
          .from('notification_preferences')
          .update({ enabled, filters })
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new preference
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            organization_id: profile.organization_id,
            webhook_id,
            event_type,
            enabled,
            filters
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    }))

    return NextResponse.json({ preferences: updates })
  } catch (error: any) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Preference ID required' }, { status: 400 })
    }

    // Delete preference
    const { error } = await supabase
      .from('notification_preferences')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting preference:', error)
    return NextResponse.json(
      { error: 'Failed to delete preference', details: error.message },
      { status: 500 }
    )
  }
}