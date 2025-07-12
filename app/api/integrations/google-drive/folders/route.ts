import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleDrive, GoogleDriveFolder } from '@/lib/integrations/google-drive'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        .eq('user_id', user.id)
    }

    // List folders
    const folders = await googleDrive.listFolders(tokens)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('List folders error:', error)
    return NextResponse.json({ error: 'Failed to list folders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { folderId, folderName } = await request.json()

    if (!folderId || !folderName) {
      return NextResponse.json({ error: 'Folder ID and name are required' }, { status: 400 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get current watched folders
    const watchedFolders = integration.watched_folders || []
    
    // Check if folder already watched
    if (watchedFolders.some((f: GoogleDriveFolder) => f.id === folderId)) {
      return NextResponse.json({ error: 'Folder already being watched' }, { status: 400 })
    }

    // Add new folder
    const newFolder: GoogleDriveFolder = {
      id: folderId,
      name: folderName,
      lastSyncedAt: new Date().toISOString(),
    }

    const updatedFolders = [...watchedFolders, newFolder]

    // Update in database
    const { error: updateError } = await supabase
      .from('google_drive_integrations')
      .update({
        watched_folders: updatedFolders,
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update watched folders' }, { status: 500 })
    }

    return NextResponse.json({ success: true, folder: newFolder })
  } catch (error) {
    console.error('Add watched folder error:', error)
    return NextResponse.json({ error: 'Failed to add watched folder' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_drive_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Remove folder from watched list
    const watchedFolders = integration.watched_folders || []
    const updatedFolders = watchedFolders.filter((f: GoogleDriveFolder) => f.id !== folderId)

    // Update in database
    const { error: updateError } = await supabase
      .from('google_drive_integrations')
      .update({
        watched_folders: updatedFolders,
      })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update watched folders' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove watched folder error:', error)
    return NextResponse.json({ error: 'Failed to remove watched folder' }, { status: 500 })
  }
}