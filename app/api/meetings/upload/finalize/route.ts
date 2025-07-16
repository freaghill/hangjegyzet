import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { readFile, readdir, unlink, rmdir } from 'fs/promises'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { processTranscriptionJob } from '@/lib/jobs/transcription-processor'
import type { TranscriptionMode } from '@/components/transcription/mode-selector'

const TEMP_UPLOAD_DIR = '/tmp/hangjegyzet-uploads'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      uploadId,
      fileName,
      fileType,
      fileSize,
      totalChunks,
      mode = 'balanced',
      startTime,
      endTime,
      calendarEventId,
      templateId,
      estimatedDuration = 60,
      processingOptions = {}
    } = body

    // Validate upload session
    const { data: uploadSession } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!uploadSession) {
      return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
    }

    // Check if all chunks are uploaded
    const uploadedChunks = uploadSession.uploaded_chunks || []
    if (uploadedChunks.length !== totalChunks) {
      return NextResponse.json({ 
        error: 'Not all chunks uploaded',
        uploadedChunks: uploadedChunks.length,
        totalChunks
      }, { status: 400 })
    }

    // Verify all chunks exist
    const uploadDir = join(TEMP_UPLOAD_DIR, uploadId)
    const chunkFiles = await readdir(uploadDir)
    const expectedChunks = Array.from({ length: totalChunks }, (_, i) => 
      `chunk_${i.toString().padStart(6, '0')}`
    )
    
    const missingChunks = expectedChunks.filter(chunk => !chunkFiles.includes(chunk))
    if (missingChunks.length > 0) {
      return NextResponse.json({ 
        error: 'Missing chunks',
        missingChunks
      }, { status: 400 })
    }

    // Combine chunks into final file
    const tempFilePath = join(TEMP_UPLOAD_DIR, `${uploadId}_final`)
    const writeStream = createWriteStream(tempFilePath)

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(uploadDir, `chunk_${i.toString().padStart(6, '0')}`)
      const readStream = createReadStream(chunkPath)
      await pipeline(readStream, writeStream, { end: false })
    }
    
    writeStream.end()

    // Read the combined file
    const fileBuffer = await readFile(tempFilePath)

    // Upload to Supabase Storage
    const storagePath = `${profile.organization_id}/${uploadId}_${fileName}`
    const { data: storageData, error: storageError } = await supabase.storage
      .from('meetings')
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: false
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      throw new Error('Failed to upload file to storage')
    }

    // Create meeting record
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        title: fileName.replace(/\.[^/.]+$/, ''), // Remove extension
        start_time: startTime || new Date().toISOString(),
        end_time: endTime || new Date(Date.now() + estimatedDuration * 60 * 1000).toISOString(),
        status: 'transcribing',
        audio_file_url: storageData.path,
        file_size: fileSize,
        duration_minutes: estimatedDuration,
        transcription_mode: mode,
        calendar_event_id: calendarEventId,
        template_id: templateId,
        metadata: {
          originalFileName: fileName,
          fileType,
          uploadId,
          processingOptions
        }
      })
      .select()
      .single()

    if (meetingError) {
      console.error('Meeting creation error:', meetingError)
      // Try to clean up storage
      await supabase.storage.from('meetings').remove([storagePath])
      throw new Error('Failed to create meeting record')
    }

    // Clean up temp files
    try {
      // Delete chunks
      for (const chunkFile of chunkFiles) {
        await unlink(join(uploadDir, chunkFile))
      }
      // Delete directory
      await rmdir(uploadDir)
      // Delete combined file
      await unlink(tempFilePath)
      
      // Clean up database records
      await supabase
        .from('upload_sessions')
        .delete()
        .eq('upload_id', uploadId)
      
      await supabase
        .from('upload_chunks')
        .delete()
        .eq('upload_id', uploadId)
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
      // Don't fail the request due to cleanup errors
    }

    // Queue transcription job
    try {
      await processTranscriptionJob({
        meetingId: meeting.id,
        organizationId: profile.organization_id,
        fileUrl: storageData.path,
        mode: mode as TranscriptionMode,
        options: processingOptions
      })
    } catch (jobError) {
      console.error('Failed to queue transcription job:', jobError)
      // Update meeting status
      await supabase
        .from('meetings')
        .update({ status: 'failed' })
        .eq('id', meeting.id)
        
      throw new Error('Failed to start transcription')
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.id,
      message: 'Upload completed and transcription started'
    })
  } catch (error: any) {
    console.error('Upload finalization error:', error)
    return NextResponse.json({ 
      error: error.message || 'Upload finalization failed' 
    }, { status: 500 })
  }
}