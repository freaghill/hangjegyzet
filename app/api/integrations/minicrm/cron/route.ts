import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { miniCRM } from '@/lib/integrations/minicrm'

// This route can be called by a cron job to sync meetings automatically
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get all organizations with active MiniCRM integration and auto-sync enabled
    const { data: integrations } = await supabase
      .from('minicrm_integrations')
      .select('*')
      .eq('is_active', true)
      .eq('auto_sync_enabled', true)

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        message: 'No active integrations with auto-sync enabled',
        processed: 0,
      })
    }

    const results = []

    // Process each organization
    for (const integration of integrations) {
      try {
        // Get unsynchronized meetings for this organization
        const { data: meetings } = await supabase
          .from('meetings')
          .select(`
            *,
            minicrm_meeting_links!left (
              id,
              sync_status
            )
          `)
          .eq('organization_id', integration.organization_id)
          .eq('status', 'completed')
          .is('minicrm_meeting_links.id', null)
          .order('created_at', { ascending: false })
          .limit(5) // Process max 5 meetings per organization per run

        if (!meetings || meetings.length === 0) {
          results.push({
            organizationId: integration.organization_id,
            synced: 0,
            message: 'No meetings to sync',
          })
          continue
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
                organization_id: integration.organization_id,
                activity_id: activityId,
                project_id: integration.default_project_id,
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced',
              })

            // Log success
            await supabase
              .from('minicrm_sync_log')
              .insert({
                organization_id: integration.organization_id,
                meeting_id: meeting.id,
                operation: 'cron_create_activity',
                entity_type: 'activity',
                entity_id: activityId,
                status: 'success',
                request_data: activityData,
              })

            syncedCount++
          } catch (error: any) {
            console.error(`Failed to sync meeting ${meeting.id}:`, error)
            
            // Log error
            await supabase
              .from('minicrm_sync_log')
              .insert({
                organization_id: integration.organization_id,
                meeting_id: meeting.id,
                operation: 'cron_create_activity',
                status: 'failed',
                error_message: error.message,
              })
          }
        }

        // Update last sync time
        await supabase
          .from('minicrm_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id)

        results.push({
          organizationId: integration.organization_id,
          synced: syncedCount,
          total: meetings.length,
        })
      } catch (error: any) {
        console.error(`Failed to process organization ${integration.organization_id}:`, error)
        results.push({
          organizationId: integration.organization_id,
          error: error.message,
        })
      }
    }

    // Clean up expired cache entries
    try {
      await supabase.rpc('cleanup_minicrm_cache')
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }

    return NextResponse.json({
      message: 'Cron sync completed',
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      { error: 'Cron sync failed' },
      { status: 500 }
    )
  }
}