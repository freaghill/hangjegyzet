import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Get meeting ID from headers
    const meetingId = request.headers.get('X-Meeting-ID')
    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Get audio data from request
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`[TEST] Received audio chunk: ${buffer.length} bytes for meeting ${meetingId}`)

    // Mock transcription result
    const mockTranscriptions = [
      'Sziasztok, kezdjük el a megbeszélést.',
      'Mai napirendi pontunk a projekt státusza.',
      'Nézzük meg, hogy állunk a fejlesztéssel.',
      'A következő lépéseket kell megbeszélnünk.',
      'Szerintem jó irányba haladunk.'
    ]

    const randomText = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)]

    const result = {
      id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: randomText,
      speaker: `Speaker ${Math.floor(Math.random() * 3) + 1}`,
      timestamp: Date.now(),
      confidence: 0.85 + Math.random() * 0.15 // Random confidence between 0.85-1.0
    }

    // In production, this would:
    // 1. Process audio through Whisper API
    // 2. Identify speaker
    // 3. Broadcast via WebSocket

    return NextResponse.json({
      success: true,
      transcription: result,
      chunkSize: buffer.length,
      mode: 'test'
    })

  } catch (error) {
    console.error('Audio processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}