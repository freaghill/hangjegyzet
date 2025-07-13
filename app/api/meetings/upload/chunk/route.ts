import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { join } from 'path'
import { writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { existsSync } from 'fs'

const TEMP_UPLOAD_DIR = '/tmp/hangjegyzet-uploads'
const MAX_CHUNK_SIZE = 10 * 1024 * 1024 // 10MB max chunk size

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

    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const uploadId = formData.get('uploadId') as string
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const fileName = formData.get('fileName') as string
    const fileType = formData.get('fileType') as string
    const fileSize = parseInt(formData.get('fileSize') as string)

    // Validate inputs
    if (!chunk || !uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate chunk size
    if (chunk.size > MAX_CHUNK_SIZE) {
      return NextResponse.json({ error: 'Chunk size exceeds maximum allowed' }, { status: 400 })
    }

    // Validate upload session
    const { data: uploadSession } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!uploadSession) {
      // Create new upload session
      const { error: sessionError } = await supabase
        .from('upload_sessions')
        .insert({
          upload_id: uploadId,
          organization_id: profile.organization_id,
          user_id: user.id,
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          total_chunks: totalChunks,
          uploaded_chunks: [chunkIndex],
          status: 'uploading',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })

      if (sessionError) {
        console.error('Failed to create upload session:', sessionError)
        return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 })
      }
    } else {
      // Update existing session
      const uploadedChunks = uploadSession.uploaded_chunks || []
      if (uploadedChunks.includes(chunkIndex)) {
        // Chunk already uploaded, skip
        return NextResponse.json({ 
          success: true, 
          message: 'Chunk already uploaded' 
        })
      }

      uploadedChunks.push(chunkIndex)
      
      const { error: updateError } = await supabase
        .from('upload_sessions')
        .update({
          uploaded_chunks: uploadedChunks,
          updated_at: new Date().toISOString()
        })
        .eq('upload_id', uploadId)

      if (updateError) {
        console.error('Failed to update upload session:', updateError)
        return NextResponse.json({ error: 'Failed to update upload session' }, { status: 500 })
      }
    }

    // Create temp directory if it doesn't exist
    const uploadDir = join(TEMP_UPLOAD_DIR, uploadId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save chunk to temp directory
    const chunkBuffer = Buffer.from(await chunk.arrayBuffer())
    const chunkPath = join(uploadDir, `chunk_${chunkIndex.toString().padStart(6, '0')}`)
    await writeFile(chunkPath, chunkBuffer)

    // Calculate chunk hash for integrity
    const hash = createHash('md5').update(chunkBuffer).digest('hex')

    // Store chunk metadata
    const { error: chunkError } = await supabase
      .from('upload_chunks')
      .upsert({
        upload_id: uploadId,
        chunk_index: chunkIndex,
        chunk_size: chunk.size,
        chunk_hash: hash,
        uploaded_at: new Date().toISOString()
      })

    if (chunkError) {
      console.error('Failed to store chunk metadata:', chunkError)
      // Don't fail the upload, just log the error
    }

    return NextResponse.json({
      success: true,
      uploadId,
      chunkIndex,
      hash,
      uploadedChunks: (uploadSession?.uploaded_chunks?.length || 0) + 1,
      totalChunks
    })
  } catch (error: any) {
    console.error('Chunk upload error:', error)
    return NextResponse.json({ 
      error: error.message || 'Chunk upload failed' 
    }, { status: 500 })
  }
}