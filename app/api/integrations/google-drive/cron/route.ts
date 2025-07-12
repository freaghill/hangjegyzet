import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleDrive } from '@/lib/integrations/google-drive'

// This endpoint can be called by a cron job to sync all active integrations
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (e.g., cron service)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get all active integrations
    const { data: integrations } = await supabase
      .from('google_drive_integrations')
      .select('*')
      .eq('is_active', true)

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ message: 'No active integrations found' })
    }

    const results = []

    for (const integration of integrations) {
      try {
        // Check if token needs refresh
        let tokens = {
          access_token: integration.access_token,
          refresh_token: integration.refresh_token,
          expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : null,
        }

        if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
          // Refresh token
          tokens = await googleDrive.refreshAccessToken(integration.refresh_token)
          
          // Update tokens in database
          await supabase
            .from('google_drive_integrations')
            .update({
              access_token: tokens.access_token!,
              token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
            })
            .eq('id', integration.id)
        }

        // Sync each watched folder
        const watchedFolders = integration.watched_folders || []
        let totalFilesFound = 0
        let totalFilesImported = 0

        for (const folder of watchedFolders) {
          // Only sync if last sync was more than 5 minutes ago
          const lastSync = folder.lastSyncedAt ? new Date(folder.lastSyncedAt) : new Date(0)
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

          if (lastSync < fiveMinutesAgo) {
            // List audio/video files in folder
            const files = await googleDrive.listAudioVideoFiles(tokens, folder.id)
            totalFilesFound += files.length

            // Get existing files to avoid duplicates
            const { data: existingMeetings } = await supabase
              .from('meetings')
              .select('external_id')
              .eq('organization_id', integration.organization_id)
              .eq('source', 'google_drive')

            const existingIds = new Set(existingMeetings?.map(m => m.external_id) || [])

            // Import new files
            for (const file of files) {
              if (!existingIds.has(file.id)) {
                await supabase
                  .from('meetings')
                  .insert({
                    organization_id: integration.organization_id,
                    created_by: integration.user_id,
                    title: file.name,
                    source: 'google_drive',
                    external_id: file.id,
                    external_url: file.webViewLink,
                    metadata: {
                      mimeType: file.mimeType,
                      size: file.size,
                      createdTime: file.createdTime,
                      folderId: folder.id,
                      folderName: folder.name,
                    },
                    status: 'pending_transcription',
                  })

                totalFilesImported++
              }
            }

            // Update last synced time
            const updatedFolders = watchedFolders.map(f => 
              f.id === folder.id 
                ? { ...f, lastSyncedAt: new Date().toISOString() }
                : f
            )

            await supabase
              .from('google_drive_integrations')
              .update({
                watched_folders: updatedFolders,
                last_sync_at: new Date().toISOString(),
              })
              .eq('id', integration.id)
          }
        }

        results.push({
          integrationId: integration.id,
          userId: integration.user_id,
          filesFound: totalFilesFound,
          filesImported: totalFilesImported,
          success: true,
        })
      } catch (error) {
        console.error(`Error syncing integration ${integration.id}:`, error)
        results.push({
          integrationId: integration.id,
          userId: integration.user_id,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        })
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      totalIntegrations: integrations.length,
      results,
    })
  } catch (error) {
    console.error('Cron sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}