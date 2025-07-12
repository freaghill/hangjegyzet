import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcriptCleaner } from '@/lib/transcription/cleanup'

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('transcript, metadata')
      .eq('id', params.id)
      .single()
    
    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    if (!meeting.transcript?.text) {
      return NextResponse.json(
        { error: 'No transcript available' },
        { status: 400 }
      )
    }
    
    // Clean the transcript
    const cleanedText = transcriptCleaner.clean(meeting.transcript.text)
    
    // Clean individual segments
    const cleanedSegments = meeting.transcript.segments?.map((segment: any) => ({
      ...segment,
      text: transcriptCleaner.clean(segment.text, {
        removeFillers: true,
        correctCommonErrors: true,
        removeRepetitions: true,
        fixSpacing: true,
        enhanceReadability: false
      })
    })) || []
    
    // Get cleanup statistics
    const stats = transcriptCleaner.getCleanupStats(meeting.transcript.text, cleanedText)
    
    // Update meeting with cleaned transcript
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript: {
          text: cleanedText,
          segments: cleanedSegments,
          original_text: meeting.transcript.text
        },
        metadata: {
          ...meeting.metadata,
          cleanup_stats: stats,
          cleaned: true,
          cleanedAt: new Date().toISOString()
        }
      })
      .eq('id', params.id)
    
    if (updateError) {
      throw updateError
    }
    
    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean transcript' },
      { status: 500 }
    )
  }
}