import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { languageDetector } from '@/lib/transcription/language-detector'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id, audio_file_url')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }
    
    // Check user belongs to organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profile?.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get audio file from storage
    const { data: audioData } = await supabase.storage
      .from('meetings')
      .download(meeting.audio_file_url)
    
    if (!audioData) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 })
    }
    
    // Convert blob to buffer
    const audioBuffer = Buffer.from(await audioData.arrayBuffer())
    
    // Detect language
    const detectedLanguage = await languageDetector.detectFromAudio(audioBuffer)
    
    // Update meeting with detected language
    await supabase
      .from('meetings')
      .update({
        detected_language: detectedLanguage.code,
        language_confidence: detectedLanguage.confidence,
      })
      .eq('id', meetingId)
    
    return NextResponse.json({
      language: detectedLanguage,
      supportedLanguages: languageDetector.getSupportedLanguages()
    })
  } catch (error: any) {
    console.error('Language detection error:', error)
    return NextResponse.json(
      { error: error.message || 'Language detection failed' },
      { status: 500 }
    )
  }
}