import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { nanoid } from 'nanoid'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'
import { Queue } from 'bullmq'
import { redisClients } from '@/lib/cache/redis-sentinel'

const ffprobeAsync = promisify(ffmpeg.ffprobe)

// Initialize import queue
const importQueue = new Queue('import-processing', {
  connection: redisClients.queue,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const organizationId = request.headers.get('organization-id')
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Validate file type
    const supportedTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav',
      'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/quicktime', 'video/x-msvideo',
      'video/x-matroska', 'video/x-flv', 'video/webm'
    ]

    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }

    // Create upload directory
    const uploadDir = join(process.cwd(), 'uploads', organizationId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file temporarily
    const fileId = nanoid()
    const fileName = `${fileId}_${file.name}`
    const filePath = join(uploadDir, fileName)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Get file metadata
    let duration = 0
    let hasVideo = false
    
    try {
      const metadata = await ffprobeAsync(filePath)
      duration = metadata.format.duration || 0
      hasVideo = metadata.streams.some(stream => stream.codec_type === 'video')
    } catch (error) {
      console.error('Error getting file metadata:', error)
    }

    // Create meeting record
    const { data: meeting, error: meetingError } = await adminSupabase
      .from('meetings')
      .insert({
        organization_id: organizationId,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        description: `Imported from ${file.type.includes('video') ? 'video' : 'audio'} file`,
        created_by: user.id,
        duration_seconds: Math.round(duration),
        status: 'processing',
        processing_mode: 'balanced',
        file_path: filePath,
        file_size: file.size,
        metadata: {
          original_filename: file.name,
          file_type: file.type,
          has_video: hasVideo,
          import_source: 'upload',
          import_date: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (meetingError || !meeting) {
      console.error('Error creating meeting:', meetingError)
      return NextResponse.json(
        { error: 'Failed to create meeting record' },
        { status: 500 }
      )
    }

    // If it's a video file, extract audio
    let audioPath = filePath
    if (hasVideo) {
      audioPath = filePath.replace(/\.[^/.]+$/, '.mp3')
      
      // Add audio extraction job
      await importQueue.add('extract-audio', {
        meetingId: meeting.id,
        videoPath: filePath,
        audioPath: audioPath,
        organizationId,
        userId: user.id,
      })
    } else {
      // For audio files, process directly
      await importQueue.add('process-audio', {
        meetingId: meeting.id,
        audioPath: filePath,
        organizationId,
        userId: user.id,
        language: 'hu',
        mode: 'balanced',
      })
    }

    return NextResponse.json({
      meetingId: meeting.id,
      message: 'File uploaded successfully',
      processing: true,
    })

  } catch (error) {
    console.error('Import upload error:', error)
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    )
  }
}