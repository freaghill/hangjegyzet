import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Queue } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '@/lib/queue/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const meetingId = params.id
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  // Verify user has access to this meeting
  const { data: meeting } = await supabase
    .from('meetings')
    .select('organization_id, status, transcription_progress')
    .eq('id', meetingId)
    .single()
  
  if (!meeting) {
    return new Response('Meeting not found', { status: 404 })
  }
  
  // Check user belongs to organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  
  if (profile?.organization_id !== meeting.organization_id) {
    return new Response('Forbidden', { status: 403 })
  }
  
  // Create SSE response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            status: meeting.status,
            progress: meeting.transcription_progress || 0,
            timestamp: new Date().toISOString()
          })}\n\n`
        )
      )
      
      // Set up progress monitoring
      const queue = new Queue(QUEUE_NAMES.TRANSCRIPTION, {
        connection: redisConnection,
      })
      
      let intervalId: NodeJS.Timeout
      let lastProgress = meeting.transcription_progress || 0
      
      // Check for job updates
      const checkProgress = async () => {
        try {
          // Get all jobs for this meeting
          const jobs = await queue.getJobs(['active', 'completed', 'failed'])
          const meetingJob = jobs.find(job => job.data.meetingId === meetingId)
          
          if (meetingJob) {
            const state = await meetingJob.getState()
            const progress = meetingJob.progress as number || 0
            
            // Send update if progress changed
            if (progress !== lastProgress || state === 'completed' || state === 'failed') {
              lastProgress = progress
              
              const update = {
                status: state === 'completed' ? 'transcribed' : 
                        state === 'failed' ? 'failed' : 'processing',
                progress,
                jobId: meetingJob.id,
                timestamp: new Date().toISOString()
              }
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
              )
              
              // Stop monitoring if job is done
              if (state === 'completed' || state === 'failed') {
                clearInterval(intervalId)
                
                // Get final result
                if (state === 'completed') {
                  const result = meetingJob.returnvalue
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        status: 'completed',
                        progress: 100,
                        result: {
                          duration: result?.duration,
                          wordCount: result?.wordCount,
                          processingTime: result?.processingTime,
                        },
                        timestamp: new Date().toISOString()
                      })}\n\n`
                    )
                  )
                }
                
                controller.close()
              }
            }
          } else {
            // Also check database for updates
            const { data: updatedMeeting } = await supabase
              .from('meetings')
              .select('status, transcription_progress')
              .eq('id', meetingId)
              .single()
            
            if (updatedMeeting && 
                (updatedMeeting.status !== meeting.status || 
                 updatedMeeting.transcription_progress !== lastProgress)) {
              lastProgress = updatedMeeting.transcription_progress || 0
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    status: updatedMeeting.status,
                    progress: updatedMeeting.transcription_progress || 0,
                    timestamp: new Date().toISOString()
                  })}\n\n`
                )
              )
              
              if (updatedMeeting.status === 'transcribed' || 
                  updatedMeeting.status === 'failed') {
                clearInterval(intervalId)
                controller.close()
              }
            }
          }
        } catch (error) {
          console.error('Error checking progress:', error)
        }
      }
      
      // Check every 2 seconds
      intervalId = setInterval(checkProgress, 2000)
      
      // Clean up on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId)
        controller.close()
      })
    },
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}