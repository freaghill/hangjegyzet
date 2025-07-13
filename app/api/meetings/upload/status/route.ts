import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const uploadId = searchParams.get('uploadId')

    if (uploadId) {
      // Get specific upload status
      const { data: uploadSession, error } = await supabase
        .from('upload_sessions')
        .select('*')
        .eq('upload_id', uploadId)
        .eq('organization_id', profile.organization_id)
        .single()

      if (error || !uploadSession) {
        return NextResponse.json({ error: 'Upload session not found' }, { status: 404 })
      }

      // Calculate progress
      const uploadedChunks = uploadSession.uploaded_chunks?.length || 0
      const percentage = Math.round((uploadedChunks / uploadSession.total_chunks) * 100)

      return NextResponse.json({
        uploadId: uploadSession.upload_id,
        fileName: uploadSession.file_name,
        fileSize: uploadSession.file_size,
        totalChunks: uploadSession.total_chunks,
        uploadedChunks,
        percentage,
        status: uploadSession.status,
        expiresAt: uploadSession.expires_at,
        createdAt: uploadSession.created_at,
        updatedAt: uploadSession.updated_at
      })
    } else {
      // Get all active upload sessions for the organization
      const { data: uploadSessions, error } = await supabase
        .from('upload_sessions')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('status', 'uploading')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Failed to fetch upload sessions:', error)
        return NextResponse.json({ error: 'Failed to fetch upload sessions' }, { status: 500 })
      }

      const sessions = uploadSessions.map(session => ({
        uploadId: session.upload_id,
        fileName: session.file_name,
        fileSize: session.file_size,
        totalChunks: session.total_chunks,
        uploadedChunks: session.uploaded_chunks?.length || 0,
        percentage: Math.round(((session.uploaded_chunks?.length || 0) / session.total_chunks) * 100),
        status: session.status,
        expiresAt: session.expires_at,
        createdAt: session.created_at
      }))

      return NextResponse.json({ sessions })
    }
  } catch (error: any) {
    console.error('Upload status error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to get upload status' 
    }, { status: 500 })
  }
}