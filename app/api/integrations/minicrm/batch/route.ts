import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { miniCRM } from '@/lib/integrations/minicrm'

// Batch sync all unsynchronized meetings
export async function POST(request: NextRequest) {
  try {
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
      .eq('auto_sync_enabled', true)
      .single()

    if (!integration) {
      return NextResponse.json({
        message: 'No active MiniCRM integration with auto-sync enabled',
        synced: 0,
      })
    }

    // Get all completed meetings without CRM sync
    const { data: meetings } = await supabase
      .from('meetings')
      .select(`
        *,
        minicrm_meeting_links!left (
          id,
          sync_status
        )
      `)
      .eq('organization_id', profile.organization_id)
      .eq('status', 'completed')
      .is('minicrm_meeting_links.id', null)
      .order('created_at', { ascending: false })
      .limit(10) // Process max 10 meetings per batch

    if (!meetings || meetings.length === 0) {
      return NextResponse.json({
        message: 'No meetings to sync',
        synced: 0,
      })
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

    let syncedCount = 0
    const errors = []

    // Process each meeting
    for (const meeting of meetings) {
      try {
        // Create activity in MiniCRM
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
          ProjectId: integration.default_project_id,
        }

        const activityId = await miniCRM.createActivity(
          integration.system_id,
          accessToken,
          activityData
        )

        // Create meeting link
        await supabase
          .from('minicrm_meeting_links')
          .insert({
            meeting_id: meeting.id,
            organization_id: profile.organization_id,
            activity_id: activityId,
            project_id: integration.default_project_id,
            last_synced_at: new Date().toISOString(),
            sync_status: 'synced',
          })

        // Log success
        await supabase
          .from('minicrm_sync_log')
          .insert({
            organization_id: profile.organization_id,
            meeting_id: meeting.id,
            operation: 'batch_create_activity',
            entity_type: 'activity',
            entity_id: activityId,
            status: 'success',
            request_data: activityData,
          })

        syncedCount++

        // Detect and match entities in the background
        try {
          const detectedEntities = miniCRM.detectEntitiesInText(
            meeting.transcript?.text || ''
          )

          for (const entity of detectedEntities) {
            await supabase
              .from('minicrm_detected_entities')
              .insert({
                meeting_id: meeting.id,
                entity_type: entity.type,
                entity_value: entity.value,
                start_position: entity.startPosition,
                end_position: entity.endPosition,
              })
          }
        } catch (error) {
          console.error('Entity detection error:', error)
        }
      } catch (error: any) {
        console.error(`Failed to sync meeting ${meeting.id}:`, error)
        
        // Log error
        await supabase
          .from('minicrm_sync_log')
          .insert({
            organization_id: profile.organization_id,
            meeting_id: meeting.id,
            operation: 'batch_create_activity',
            status: 'failed',
            error_message: error.message,
          })

        errors.push({
          meetingId: meeting.id,
          error: error.message,
        })
      }
    }

    // Update last sync time
    await supabase
      .from('minicrm_integrations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', integration.id)

    return NextResponse.json({
      message: `Successfully synced ${syncedCount} meetings`,
      synced: syncedCount,
      total: meetings.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Batch sync error:', error)
    return NextResponse.json(
      { error: 'Batch sync failed' },
      { status: 500 }
    )
  }
}

// Get batch sync status
export async function GET(request: NextRequest) {
  try {
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

    // Count meetings needing sync
    const { count: pendingCount } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
      .eq('status', 'completed')
      .is('minicrm_meeting_links.id', null)

    // Get recent sync logs
    const { data: recentLogs } = await supabase
      .from('minicrm_sync_log')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('operation', 'batch_create_activity')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get integration status
    const { data: integration } = await supabase
      .from('minicrm_integrations')
      .select('auto_sync_enabled, last_sync_at')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .single()

    return NextResponse.json({
      pendingCount: pendingCount || 0,
      autoSyncEnabled: integration?.auto_sync_enabled || false,
      lastSyncAt: integration?.last_sync_at,
      recentLogs: recentLogs || [],
    })
  } catch (error) {
    console.error('Get batch status error:', error)
    return NextResponse.json(
      { error: 'Failed to get batch status' },
      { status: 500 }
    )
  }
}