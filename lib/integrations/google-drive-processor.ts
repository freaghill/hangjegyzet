import { createClient } from '@/lib/supabase/server'
import { googleDrive } from './google-drive'
import { queues, QUEUE_NAMES, JOB_PRIORITIES } from '@/lib/queue/config'
import { TranscriptionJobData } from '@/lib/queue/processors/transcription.processor'
import { drive_v3 } from 'googleapis'
import { createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import { pipeline } from 'stream/promises'
import path from 'path'
import { nanoid } from 'nanoid'

interface ProcessGoogleDriveFileOptions {
  meetingId: string
  googleFileId: string
  fileName: string
  accessToken: string
  userId: string
  organizationId: string
  transcriptionMode?: 'fast' | 'balanced' | 'precision'
}

export async function processGoogleDriveFile(options: ProcessGoogleDriveFileOptions) {
  const {
    meetingId,
    googleFileId,
    fileName,
    accessToken,
    userId,
    organizationId,
    transcriptionMode = 'balanced'
  } = options

  const supabase = await createClient()
  const tempDir = process.env.TEMP_DIR || '/tmp'
  const tempFilePath = path.join(tempDir, `gdrive_${nanoid()}_${fileName}`)

  try {
    // Update meeting status to downloading
    await supabase
      .from('meetings')
      .update({ 
        status: 'downloading',
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    // Download file from Google Drive
    const fileStream = await googleDrive.getFileStream({ access_token: accessToken }, googleFileId)
    const writeStream = createWriteStream(tempFilePath)
    
    await pipeline(fileStream, writeStream)

    // Update meeting status to processing
    await supabase
      .from('meetings')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    // Get user's transcription mode preference
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_transcription_mode')
      .eq('id', userId)
      .single()

    const mode = profile?.default_transcription_mode || transcriptionMode

    // Queue transcription job
    const jobData: TranscriptionJobData = {
      meetingId,
      filePath: tempFilePath,
      userId,
      organizationId,
      mode,
      language: 'hu' // Hungarian by default
    }

    await queues[QUEUE_NAMES.TRANSCRIPTION].add(
      'transcribe-google-drive-file',
      jobData,
      {
        priority: JOB_PRIORITIES.NORMAL,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        }
      }
    )

    // Log the import
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        action: 'google_drive_file_imported',
        resource_type: 'meeting',
        resource_id: meetingId,
        metadata: {
          file_name: fileName,
          google_file_id: googleFileId,
          mode: mode
        }
      })

    return { success: true, meetingId }

  } catch (error) {
    console.error('Error processing Google Drive file:', error)
    
    // Update meeting status to failed
    await supabase
      .from('meetings')
      .update({ 
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    // Clean up temp file if it exists
    try {
      await unlink(tempFilePath)
    } catch {}

    throw error
  }
}

export async function syncAndProcessGoogleDriveFolder(
  integration: any,
  folder: { id: string; name: string },
  tokens: { access_token: string; refresh_token?: string; expiry_date?: number | null }
) {
  const supabase = await createClient()
  
  // List audio/video files in folder
  const files = await googleDrive.listAudioVideoFiles(tokens, folder.id)
  
  // Get existing files to avoid duplicates
  const { data: existingMeetings } = await supabase
    .from('meetings')
    .select('external_id')
    .eq('organization_id', integration.organization_id)
    .eq('source', 'google_drive')

  const existingIds = new Set(existingMeetings?.map(m => m.external_id) || [])
  
  const newFiles = files.filter(file => !existingIds.has(file.id))
  let processedCount = 0

  for (const file of newFiles) {
    try {
      // Create meeting record
      const { data: meeting, error: meetingError } = await supabase
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
          status: 'pending_download', // New status
        })
        .select()
        .single()

      if (meetingError) {
        console.error(`Failed to create meeting for ${file.name}:`, meetingError)
        continue
      }

      // Process the file immediately
      await processGoogleDriveFile({
        meetingId: meeting.id,
        googleFileId: file.id,
        fileName: file.name,
        accessToken: tokens.access_token,
        userId: integration.user_id,
        organizationId: integration.organization_id,
      })

      processedCount++
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error)
    }
  }

  return {
    filesFound: files.length,
    newFiles: newFiles.length,
    processedFiles: processedCount
  }
}