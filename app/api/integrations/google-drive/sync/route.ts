import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleDrive, GoogleDriveFolder, type GoogleDriveTokens } from '@/lib/integrations/google-drive'
import { syncAndProcessGoogleDriveFolder } from '@/lib/integrations/google-drive-processor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId } = await request.json()

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if token needs refresh
    let tokens: GoogleDriveTokens = {
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
        .eq('user_id', user.id)
    }

    // Create sync log entry
    const { data: syncLog } = await supabase
      .from('google_drive_sync_logs')
      .insert({
        integration_id: integration.id,
        folder_id: folderId || 'all',
        folder_name: folderId ? 
          integration.watched_folders?.find((f: GoogleDriveFolder) => f.id === folderId)?.name || 'Unknown' 
          : 'All folders',
      })
      .select()
      .single()

    try {
      // Get folders to sync
      const foldersToSync = folderId 
        ? [integration.watched_folders?.find((f: GoogleDriveFolder) => f.id === folderId)]
        : integration.watched_folders || []

      let totalFilesFound = 0
      let totalFilesImported = 0

      for (const folder of foldersToSync) {
        if (!folder) continue

        try {
          // Use the new processor that downloads and queues files automatically
          const result = await syncAndProcessGoogleDriveFolder(
            integration,
            folder,
            tokens
          )

          totalFilesFound += result.filesFound
          totalFilesImported += result.processedFiles
        } catch (error) {
          console.error(`Failed to sync folder ${folder.name}:`, error)
        }

        // Update last synced time for folder
        const updatedFolders = integration.watched_folders?.map((f: GoogleDriveFolder) => 
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
          .eq('user_id', user.id)
      }

      // Update sync log
      await supabase
        .from('google_drive_sync_logs')
        .update({
          files_found: totalFilesFound,
          files_imported: totalFilesImported,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      return NextResponse.json({
        success: true,
        filesFound: totalFilesFound,
        filesImported: totalFilesImported,
      })
    } catch (error) {
      // Update sync log with error
      await supabase
        .from('google_drive_sync_logs')
        .update({
          error: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      throw error
    }
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get sync logs
    const { data: logs } = await supabase
      .from('google_drive_sync_logs')
      .select('*')
      .eq('integration_id', integration.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({ logs: logs || [] })
  } catch (error) {
    console.error('Get sync logs error:', error)
    return NextResponse.json({ error: 'Failed to get sync logs' }, { status: 500 })
  }
}