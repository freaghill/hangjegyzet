import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { miniCRM } from '@/lib/integrations/minicrm'

export async function POST(request: NextRequest) {
  try {
    const { meetingId, projectId, contactIds, companyIds } = await request.json()

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
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

    // Get MiniCRM integration
    const { data: integration } = await supabase
      .from('minicrm_integrations')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json(
        { error: 'MiniCRM integration not found' },
        { status: 404 }
      )
    }

    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Get fresh tokens
    const { accessToken, refreshToken, expiryDate } = await miniCRM.getFreshTokens(
      integration.system_id,
      integration.access_token,
      integration.refresh_token,
      integration.token_expiry
    )

    // Update tokens if refreshed
    if (refreshToken !== integration.refresh_token || expiryDate) {
      await supabase
        .from('minicrm_integrations')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expiry: expiryDate?.toISOString(),
        })
        .eq('id', integration.id)
    }

    // Get or create meeting link
    const { data: meetingLink } = await supabase
      .from('minicrm_meeting_links')
      .select('*')
      .eq('meeting_id', meetingId)
      .single()

    let linkId = meetingLink?.id
    let activityId = meetingLink?.activity_id

    // Create or update activity in MiniCRM
    const activityData = {
      Subject: meeting.title || 'Találkozó',
      Comment: miniCRM.formatMeetingSummary({
        title: meeting.title || 'Találkozó',
        summary: meeting.summary || '',
        action_items: meeting.action_items || [],
        duration_seconds: meeting.duration_seconds || 0,
        created_at: meeting.created_at,
      }),
      Date: new Date(meeting.created_at).toISOString().split('T')[0],
      Duration: Math.round((meeting.duration_seconds || 0) / 60),
      Type: integration.activity_type_id,
      ProjectId: projectId || meetingLink?.project_id,
      ContactId: contactIds?.[0] || meetingLink?.contact_ids?.[0],
    }

    try {
      if (activityId) {
        // Update existing activity
        await miniCRM.updateActivity(
          integration.system_id,
          accessToken,
          activityId,
          activityData
        )
      } else {
        // Create new activity
        activityId = await miniCRM.createActivity(
          integration.system_id,
          accessToken,
          activityData
        )
      }

      // Update or create meeting link
      const linkData = {
        meeting_id: meetingId,
        organization_id: profile.organization_id,
        activity_id: activityId,
        project_id: projectId || meetingLink?.project_id,
        contact_ids: contactIds || meetingLink?.contact_ids || [],
        company_ids: companyIds || meetingLink?.company_ids || [],
        last_synced_at: new Date().toISOString(),
        sync_status: 'synced',
        sync_error: null,
      }

      if (linkId) {
        await supabase
          .from('minicrm_meeting_links')
          .update(linkData)
          .eq('id', linkId)
      } else {
        const { data: newLink } = await supabase
          .from('minicrm_meeting_links')
          .insert(linkData)
          .select()
          .single()
        
        linkId = newLink?.id
      }

      // Log sync operation
      await supabase
        .from('minicrm_sync_log')
        .insert({
          organization_id: profile.organization_id,
          meeting_id: meetingId,
          operation: activityId ? 'update_activity' : 'create_activity',
          entity_type: 'activity',
          entity_id: activityId,
          status: 'success',
          request_data: activityData,
        })

      // Update integration last sync time
      await supabase
        .from('minicrm_integrations')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', integration.id)

      return NextResponse.json({
        success: true,
        activityId,
        linkId,
      })
    } catch (error: any) {
      // Log error
      await supabase
        .from('minicrm_sync_log')
        .insert({
          organization_id: profile.organization_id,
          meeting_id: meetingId,
          operation: 'sync_meeting',
          status: 'failed',
          error_message: error.message,
          request_data: activityData,
        })

      // Update meeting link with error
      if (linkId) {
        await supabase
          .from('minicrm_meeting_links')
          .update({
            sync_status: 'failed',
            sync_error: error.message,
          })
          .eq('id', linkId)
      }

      throw error
    }
  } catch (error) {
    console.error('MiniCRM sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    )
  }
}

// Get sync status for a meeting
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const meetingId = searchParams.get('meetingId')

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting link with CRM data
    const { data: meetingLink } = await supabase
      .from('minicrm_meeting_links')
      .select('*')
      .eq('meeting_id', meetingId)
      .single()

    if (!meetingLink) {
      return NextResponse.json({
        synced: false,
        status: 'not_synced',
      })
    }

    // Get cached entity details
    const { data: cachedEntities } = await supabase
      .from('minicrm_entity_cache')
      .select('*')
      .in('entity_id', [
        ...(meetingLink.contact_ids || []),
        ...(meetingLink.company_ids || []),
        meetingLink.project_id,
      ].filter(Boolean))

    return NextResponse.json({
      synced: true,
      status: meetingLink.sync_status,
      lastSyncedAt: meetingLink.last_synced_at,
      activityId: meetingLink.activity_id,
      projectId: meetingLink.project_id,
      contactIds: meetingLink.contact_ids,
      companyIds: meetingLink.company_ids,
      entities: cachedEntities || [],
      error: meetingLink.sync_error,
    })
  } catch (error) {
    console.error('Get sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}

// Remove sync for a meeting
export async function DELETE(request: NextRequest) {
  try {
    const { meetingId } = await request.json()

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
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

    // Delete meeting link
    const { error: deleteError } = await supabase
      .from('minicrm_meeting_links')
      .delete()
      .eq('meeting_id', meetingId)
      .eq('organization_id', profile.organization_id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to remove sync' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove sync error:', error)
    return NextResponse.json(
      { error: 'Failed to remove sync' },
      { status: 500 }
    )
  }
}