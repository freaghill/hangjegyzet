import ffmpeg from 'fluent-ffmpeg'
import { unlink } from 'fs/promises'
import { Job } from 'bullmq'

interface AudioExtractionJobData {
  meetingId: string
  videoPath: string
  audioPath: string
  organizationId: string
  userId: string
}

export async function extractAudioFromVideo(job: Job<AudioExtractionJobData>) {
  const { meetingId, videoPath, audioPath } = job.data

  try {
    await job.updateProgress(10)

    // Extract audio using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .noVideo()
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(1) // Mono for better transcription
        .audioFrequency(16000) // 16kHz is optimal for speech
        .on('progress', (progress) => {
          // Update job progress
          const percent = Math.round(progress.percent || 0)
          job.updateProgress(10 + (percent * 0.8)) // 10-90%
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err)
          reject(err)
        })
        .on('end', () => {
          console.log('Audio extraction completed')
          resolve()
        })
        .save(audioPath)
    })

    await job.updateProgress(90)

    // Clean up video file to save space
    try {
      await unlink(videoPath)
    } catch (error) {
      console.error('Error deleting video file:', error)
    }

    await job.updateProgress(100)

    return {
      success: true,
      audioPath,
      meetingId,
    }

  } catch (error) {
    console.error('Audio extraction error:', error)
    throw error
  }
}

export async function processImportedAudio(job: Job) {
  const { meetingId, audioPath, organizationId, userId, language, mode } = job.data

  try {
    // This would trigger the normal transcription flow
    // For now, we'll import the transcription processor
    const { processTranscription } = await import('@/lib/queue/processors/transcription.processor')
    
    // Create a transcription job
    const transcriptionJob = {
      data: {
        meetingId,
        filePath: audioPath,
        userId,
        organizationId,
        mode: mode || 'balanced',
        language: language || 'hu',
      },
      updateProgress: job.updateProgress.bind(job),
    } as any

    await processTranscription(transcriptionJob)

    return {
      success: true,
      meetingId,
    }

  } catch (error) {
    console.error('Audio processing error:', error)
    throw error
  }
}