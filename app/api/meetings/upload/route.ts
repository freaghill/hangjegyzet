import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionManager } from '@/lib/payments/subscription'
import { processTranscriptionJob } from '@/lib/jobs/transcription-processor'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'
import { RateLimiter } from '@/lib/monitoring/rate-limiter'
import type { TranscriptionMode } from '@/components/transcription/mode-selector'

const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
const ALLOWED_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
]

// Maximum meeting duration by plan (in minutes)
const MAX_MEETING_DURATION = {
  trial: 60,
  indulo: 120,
  profi: 180,
  vallalati: 180,
  multinational: 240,
} as const

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

    // Get organization details including subscription
    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const mode = (formData.get('mode') as TranscriptionMode) || 'balanced'
    const startTimeStr = formData.get('startTime') as string | null
    const endTimeStr = formData.get('endTime') as string | null
    const calendarEventId = formData.get('calendarEventId') as string | null
    const templateId = formData.get('templateId') as string | null
    const estimatedDuration = formData.get('estimatedDuration') ? parseInt(formData.get('estimatedDuration') as string) : 60
    
    // Validate mode
    if (!['fast', 'balanced', 'precision'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid transcription mode' }, { status: 400 })
    }

    // Get subscription plan details
    const plan = getSubscriptionPlan(organization.subscription_tier)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Check rate limits
    const rateLimiter = new RateLimiter(supabase)
    const rateLimitResult = await rateLimiter.checkLimit(
      profile.organization_id,
      mode,
      estimatedDuration
    )
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: rateLimitResult.reason,
        rateLimitInfo: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt
        }
      }, { status: 429 })
    }
    
    // Check burst protection
    const burstResult = await rateLimiter.checkBurstLimit(profile.organization_id)
    if (!burstResult.allowed) {
      return NextResponse.json({ 
        error: burstResult.reason,
        retryAfter: Math.ceil((burstResult.resetAt.getTime() - Date.now()) / 1000)
      }, { status: 429 })
    }

    // Check mode availability
    const { data: currentUsage } = await supabase
      .rpc('check_mode_availability', {
        p_organization_id: profile.organization_id,
        p_mode: mode
      })
      .single()

    if (currentUsage && !(currentUsage as any).available) {
      return NextResponse.json({ 
        error: `Elérte a ${mode} mód havi limitjét (${(currentUsage as any).used}/${(currentUsage as any).limit_minutes} perc). Kérjük válasszon másik módot vagy frissítsen magasabb csomagra.`,
        modeStatus: {
          mode,
          used: (currentUsage as any).used,
          limit: (currentUsage as any).limit_minutes,
          remaining: (currentUsage as any).remaining
        }
      }, { status: 403 })
    }

    // Check meeting duration limits
    const maxDuration = MAX_MEETING_DURATION[organization.subscription_tier as keyof typeof MAX_MEETING_DURATION] || 180
    if (estimatedDuration > maxDuration) {
      return NextResponse.json({ 
        error: `A meeting maximum hossza ${maxDuration} perc lehet az Ön csomagjában. Kérjük ossza fel a felvételt rövidebb részekre.` 
      }, { status: 400 })
    }

    // Additional checks for precision mode
    if (mode === 'precision') {
      const maxPrecisionPerMeeting = plan.limits.maxPrecisionPerMeeting
      if (maxPrecisionPerMeeting === 0) {
        return NextResponse.json({ 
          error: 'A Precision mód nem elérhető az Ön csomagjában. Kérjük frissítsen Profi vagy magasabb csomagra.' 
        }, { status: 403 })
      }
      
      if (estimatedDuration > maxPrecisionPerMeeting) {
        return NextResponse.json({ 
          error: `A Precision mód maximum ${maxPrecisionPerMeeting} percig használható meetingenként.` 
        }, { status: 400 })
      }
    }

    // Enhanced processing options based on mode
    const modeConfig = {
      fast: {
        enableEnhancedProcessing: false,
        enablePreprocessing: false,
        enableMultiPass: false,
        enableVocabularyEnhancement: false,
        enableAccuracyMonitoring: true,
      },
      balanced: {
        enableEnhancedProcessing: true,
        enablePreprocessing: true,
        enableMultiPass: false,
        enableVocabularyEnhancement: true,
        enableAccuracyMonitoring: true,
      },
      precision: {
        enableEnhancedProcessing: true,
        enablePreprocessing: true,
        enableMultiPass: true,
        enableVocabularyEnhancement: true,
        enableAccuracyMonitoring: true,
        multiPassCount: 2,
      }
    }

    const processingOptions = modeConfig[mode]
    
    // Allow manual overrides from form
    if (formData.get('enableEnhancedProcessing') !== null) {
      processingOptions.enableEnhancedProcessing = formData.get('enableEnhancedProcessing') === 'true'
    }
    if (formData.get('enablePreprocessing') !== null) {
      processingOptions.enablePreprocessing = formData.get('enablePreprocessing') === 'true'
    }
    if (formData.get('enableMultiPass') !== null) {
      processingOptions.enableMultiPass = formData.get('enableMultiPass') === 'true'
    }
    if (formData.get('enableVocabularyEnhancement') !== null) {
      processingOptions.enableVocabularyEnhancement = formData.get('enableVocabularyEnhancement') === 'true'
    }
    if (formData.get('enableAccuracyMonitoring') !== null) {
      processingOptions.enableAccuracyMonitoring = formData.get('enableAccuracyMonitoring') === 'true'
    }
    
    const multiPassCount = formData.get('multiPassCount') ? parseInt(formData.get('multiPassCount') as string) : processingOptions.multiPassCount
    const speakerCount = formData.get('speakerCount') ? parseInt(formData.get('speakerCount') as string) : undefined
    const customVocabulary = formData.get('customVocabulary') as string | null
    const contextHints = formData.get('contextHints') ? (formData.get('contextHints') as string).split(',').map(h => h.trim()) : undefined
    const minAudioQuality = formData.get('minAudioQuality') as 'poor' | 'fair' | 'good' | 'excellent' | null
    const minConfidenceScore = formData.get('minConfidenceScore') ? parseFloat(formData.get('minConfidenceScore') as string) : undefined
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Parse time range options
    const startTime = startTimeStr ? parseInt(startTimeStr) : undefined
    const endTime = endTimeStr ? parseInt(endTimeStr) : undefined

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `A fájl túl nagy. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB engedélyezett.` 
      }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Nem támogatott fájlformátum. Kérjük használjon MP3, WAV, M4A, MP4 vagy MOV fájlt.' 
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileExt = file.name.split('.').pop()
    const filename = `${profile.organization_id}/${timestamp}-${randomId}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meetings')
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Fájl feltöltés sikertelen' }, { status: 500 })
    }

    // Get private URL (requires auth to access)
    const { data: { publicUrl } } = supabase.storage
      .from('meetings')
      .getPublicUrl(filename)

    // Check if linked to calendar event
    let calendarEvent = null
    let meetingTitle = file.name.replace(/\.[^/.]+$/, '') // Default to filename without extension
    
    if (calendarEventId) {
      const { data: eventData } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('event_id', calendarEventId)
        .eq('organization_id', profile.organization_id)
        .single()
      
      if (eventData) {
        calendarEvent = eventData
        meetingTitle = eventData.title || meetingTitle // Use calendar event title if available
      }
    }

    // Create meeting record in database with mode and options
    const { data: meeting, error: dbError } = await supabase
      .from('meetings')
      .insert({
        organization_id: profile.organization_id,
        title: meetingTitle,
        file_url: publicUrl,
        status: 'uploading',
        language: 'hu',
        created_by: user.id,
        duration_seconds: 0, // Will be updated after processing
        transcript: {},
        speakers: [],
        transcription_mode: mode, // NEW: Store the selected mode
        template_id: templateId || null,
        calendar_event_id: calendarEvent?.id || null,
        calendar_metadata: calendarEvent ? {
          eventId: calendarEvent.event_id,
          calendarId: calendarEvent.calendar_id,
          startTime: calendarEvent.start_time,
          endTime: calendarEvent.end_time,
          attendees: calendarEvent.attendees,
        } : {},
        metadata: {
          originalFileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          estimatedDuration,
          transcriptionMode: mode,
          timeRange: {
            startTime,
            endTime,
          },
          processingOptions: {
            ...processingOptions,
            multiPassCount,
            speakerCount,
            customVocabulary,
            contextHints,
            minAudioQuality,
            minConfidenceScore
          }
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Try to delete the uploaded file
      await supabase.storage.from('meetings').remove([filename])
      return NextResponse.json({ error: 'Meeting létrehozása sikertelen' }, { status: 500 })
    }

    // Update status to processing
    await supabase
      .from('meetings')
      .update({ status: 'processing' })
      .eq('id', meeting.id)

    // Update calendar event if linked
    if (calendarEvent) {
      await supabase
        .from('calendar_events')
        .update({ meeting_id: meeting.id })
        .eq('id', calendarEvent.id)
    }

    // Trigger transcription job with mode and options
    processTranscriptionJob({
      meetingId: meeting.id,
      fileUrl: publicUrl,
      organizationId: profile.organization_id,
      userId: user.id,
      mode, // NEW: Pass the selected mode
      options: {
        startTime,
        endTime,
        language: 'hu',
        customVocabulary,
        // Mode-based processing options
        ...processingOptions,
        multiPassCount,
        speakerCount,
        contextHints,
        minAudioQuality,
        minConfidenceScore
      }
    }).catch(error => {
      console.error('Transcription job error:', error)
    })

    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        transcription_mode: mode,
      },
      message: `Fájl sikeresen feltöltve. A feldolgozás ${mode} módban hamarosan elkezdődik.`,
      modeStatus: currentUsage ? {
        mode,
        used: currentUsage.used,
        limit: currentUsage.limit_minutes,
        remaining: currentUsage.remaining
      } : undefined
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Belső szerver hiba' }, { status: 500 })
  }
}