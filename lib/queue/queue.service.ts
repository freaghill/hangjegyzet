import { getQueue, QUEUE_NAMES, JOB_PRIORITIES } from './config'
import type { TranscriptionJobData } from './processors/transcription.processor'
import type { AIProcessingJobData } from './processors/ai-processing.processor'

export class QueueService {
  // Add transcription job
  static async addTranscriptionJob(
    data: TranscriptionJobData,
    priority: number = JOB_PRIORITIES.NORMAL
  ) {
    const queue = getQueue(QUEUE_NAMES.TRANSCRIPTION)
    
    const job = await queue.add(
      'transcribe-audio',
      data,
      {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    )
    
    return job.id
  }
  
  // Add AI processing job
  static async addAIProcessingJob(
    data: AIProcessingJobData,
    priority: number = JOB_PRIORITIES.NORMAL
  ) {
    const queue = getQueue(QUEUE_NAMES.AI_PROCESSING)
    
    const job = await queue.add(
      `ai-${data.type}`,
      data,
      {
        priority,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 10000,
        },
      }
    )
    
    return job.id
  }
  
  // Add export job
  static async addExportJob(
    data: {
      meetingId: string
      userId: string
      organizationId: string
      format: 'pdf' | 'docx'
      email?: string
    },
    priority: number = JOB_PRIORITIES.NORMAL
  ) {
    const queue = getQueue(QUEUE_NAMES.EXPORT)
    
    const job = await queue.add(
      'export-meeting',
      data,
      {
        priority,
        attempts: 2,
      }
    )
    
    return job.id
  }
  
  // Add email job
  static async addEmailJob(
    data: {
      to: string
      subject: string
      template: string
      data: Record<string, any>
    }
  ) {
    const queue = getQueue(QUEUE_NAMES.EMAIL)
    
    const job = await queue.add(
      'send-email',
      data,
      {
        priority: JOB_PRIORITIES.NORMAL,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 30000,
        },
      }
    )
    
    return job.id
  }
  
  // Bulk add jobs
  static async bulkAddJobs(
    queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES],
    jobs: Array<{ name: string; data: any; opts?: any }>
  ) {
    const queue = getQueue(queueName)
    const results = await queue.addBulk(jobs)
    return results.map(job => job.id)
  }
  
  // Get job status
  static async getJobStatus(queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES], jobId: string) {
    const queue = getQueue(queueName)
    const job = await queue.getJob(jobId)
    
    if (!job) {
      return null
    }
    
    const state = await job.getState()
    const progress = job.progress
    
    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    }
  }
  
  // Retry failed job
  static async retryJob(queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES], jobId: string) {
    const queue = getQueue(queueName)
    const job = await queue.getJob(jobId)
    
    if (!job) {
      throw new Error('Job not found')
    }
    
    const state = await job.getState()
    if (state !== 'failed') {
      throw new Error(`Job is not in failed state (current: ${state})`)
    }
    
    await job.retry()
    return true
  }
  
  // Clean completed jobs
  static async cleanCompletedJobs(
    queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES],
    grace: number = 3600000 // 1 hour
  ) {
    const queue = getQueue(queueName)
    await queue.clean(grace, 100, 'completed')
  }
  
  // Get queue metrics
  static async getQueueMetrics(queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]) {
    const queue = getQueue(queueName)
    
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ])
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + delayed + paused,
    }
  }
  
  // Pause/resume queue
  static async pauseQueue(queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]) {
    const queue = getQueue(queueName)
    await queue.pause()
  }
  
  static async resumeQueue(queueName: typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]) {
    const queue = getQueue(queueName)
    await queue.resume()
  }
}