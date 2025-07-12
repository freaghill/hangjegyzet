import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VocabularyManager } from '@/lib/vocabulary/hungarian-business'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { meetingId, original, corrected } = body

    if (!original || !corrected) {
      return NextResponse.json(
        { error: 'Original and corrected text are required' },
        { status: 400 }
      )
    }

    const vocabularyManager = new VocabularyManager()
    await vocabularyManager.learnFromCorrection(
      profile.organization_id,
      meetingId || null,
      original,
      corrected,
      user.id
    )

    // Also update the meeting transcript if meetingId is provided
    if (meetingId) {
      // Get the current transcript
      const { data: meeting } = await supabase
        .from('meetings')
        .select('transcript')
        .eq('id', meetingId)
        .single()

      if (meeting?.transcript) {
        // Update the transcript with the correction
        // This is a simplified version - you might want to implement
        // more sophisticated transcript updating logic
        const updatedTranscript = JSON.stringify(meeting.transcript)
          .replace(original, corrected)
        
        await supabase
          .from('meetings')
          .update({ transcript: JSON.parse(updatedTranscript) })
          .eq('id', meetingId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error learning from correction:', error)
    return NextResponse.json(
      { error: 'Failed to process correction' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '100')

    const vocabularyManager = new VocabularyManager()
    const history = await vocabularyManager.getLearningHistory(
      profile.organization_id,
      limit
    )

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching learning history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch learning history' },
      { status: 500 }
    )
  }
}