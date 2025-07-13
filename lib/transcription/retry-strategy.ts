import { Job, BackoffOptions } from 'bullmq'
import { TranscriptionErrorHandler, TranscriptionErrorType } from './error-handler'

export interface RetryStrategy {
  maxAttempts: number
  backoff: BackoffOptions
  shouldRetry: (job: Job, error: any) => boolean
  onFailedAttempt?: (job: Job, error: any, attemptNumber: number) => Promise<void>
  onPermanentFailure?: (job: Job, error: any) => Promise<void>
}

export class TranscriptionRetryStrategy {
  /**
   * Get retry strategy based on transcription mode
   */
  static getStrategy(mode: 'fast' | 'balanced' | 'precision'): RetryStrategy {
    const baseStrategy: RetryStrategy = {
      maxAttempts: mode === 'precision' ? 5 : mode === 'balanced' ? 3 : 2,
      backoff: {
        type: 'custom',
      },
      shouldRetry: (job, error) => {
        // Check if we've exceeded max attempts
        if (job.attemptsMade >= this.getMaxAttempts(mode)) {
          return false
        }
        
        // Check if error is retryable
        const analyzed = TranscriptionErrorHandler.analyzeError(error)
        if (!analyzed.isRetryable) {
          return false
        }
        
        // Mode-specific retry logic
        if (mode === 'fast') {
          // Fast mode only retries network errors
          return [
            TranscriptionErrorType.NETWORK_ERROR,
            TranscriptionErrorType.TIMEOUT,
            TranscriptionErrorType.WORKER_CRASHED
          ].includes(analyzed.type)
        }
        
        return true
      },
      onFailedAttempt: async (job, error, attemptNumber) => {
        console.log(`Transcription attempt ${attemptNumber} failed for job ${job.id}`)
        
        // Update meeting with retry status
        const { meetingId } = job.data
        if (meetingId) {
          const { createClient } = await import('@/lib/supabase/server')
          const supabase = await createClient()
          
          await supabase
            .from('meetings')
            .update({
              retry_count: attemptNumber,
              last_retry_at: new Date().toISOString(),
              retry_status: `Attempt ${attemptNumber} of ${this.getMaxAttempts(mode)}`
            })
            .eq('id', meetingId)
        }
      },
      onPermanentFailure: async (job, error) => {
        console.error(`Transcription permanently failed for job ${job.id}`)
        
        // Handle permanent failure
        await TranscriptionErrorHandler.handleJobFailure(
          job,
          error,
          job.data.meetingId,
          job.data.userId,
          job.data.organizationId
        )
      }
    }
    
    return baseStrategy
  }

  /**
   * Get max attempts for mode
   */
  private static getMaxAttempts(mode: string): number {
    switch (mode) {
      case 'precision':
        return 5
      case 'balanced':
        return 3
      case 'fast':
      default:
        return 2
    }
  }

  /**
   * Custom backoff strategy
   */
  static calculateBackoff(attemptNumber: number, error: any): number {
    const analyzed = TranscriptionErrorHandler.analyzeError(error)
    
    // Error-specific delays
    switch (analyzed.type) {
      case TranscriptionErrorType.API_RATE_LIMIT:
        // Respect rate limit headers or use exponential backoff
        const retryAfter = error?.response?.headers?.['retry-after']
        if (retryAfter) {
          return parseInt(retryAfter) * 1000
        }
        return Math.min(300000, 30000 * attemptNumber) // 30s, 60s, 90s... up to 5 min
        
      case TranscriptionErrorType.NETWORK_ERROR:
      case TranscriptionErrorType.TIMEOUT:
        // Quick retry for network issues
        return Math.min(60000, 5000 * Math.pow(2, attemptNumber - 1)) // 5s, 10s, 20s, 40s, 60s
        
      case TranscriptionErrorType.OUT_OF_MEMORY:
        // Fixed delay to allow system recovery
        return 30000 // 30 seconds
        
      case TranscriptionErrorType.WORKER_CRASHED:
        // Quick retry as worker should recover fast
        return 5000 // 5 seconds
        
      case TranscriptionErrorType.PROCESSING_FAILED:
        // Longer delay for processing issues
        return Math.min(120000, 20000 * attemptNumber) // 20s, 40s, 60s... up to 2 min
        
      default:
        // Default exponential backoff
        return Math.min(60000, 2000 * Math.pow(2, attemptNumber)) // 2s, 4s, 8s, 16s, 32s, 60s
    }
  }

  /**
   * Create job options with retry strategy
   */
  static createJobOptions(mode: 'fast' | 'balanced' | 'precision'): any {
    const strategy = this.getStrategy(mode)
    
    return {
      attempts: strategy.maxAttempts,
      backoff: {
        type: 'custom',
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
        count: 500, // Keep last 500 failed jobs
      }
    }
  }

  /**
   * Determine if job should be moved to dead letter queue
   */
  static shouldMoveToDeadLetter(job: Job, error: any): boolean {
    const analyzed = TranscriptionErrorHandler.analyzeError(error)
    
    // Immediately move non-retryable errors to DLQ
    if (!analyzed.isRetryable) {
      return true
    }
    
    // Move to DLQ after max attempts
    const mode = job.data.mode || 'balanced'
    return job.attemptsMade >= this.getMaxAttempts(mode)
  }

  /**
   * Handle dead letter queue job
   */
  static async handleDeadLetterJob(job: Job): Promise<void> {
    const { meetingId, userId, organizationId } = job.data
    
    // Mark meeting as requiring manual intervention
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase
      .from('meetings')
      .update({
        status: 'failed_permanent',
        requires_manual_intervention: true,
        dead_letter_job_id: job.id,
        failed_at: new Date().toISOString()
      })
      .eq('id', meetingId)
    
    // Log to audit trail
    const { auditLogger } = await import('@/lib/security/audit-logger')
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.dead_letter',
      resource_type: 'meeting',
      resource_id: meetingId,
      status: 'failure',
      metadata: {
        jobId: job.id,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade
      }
    })
    
    // TODO: Send notification to admins
  }
}

// Export convenience function for custom backoff
export const customBackoff = async (
  attemptsMade: number,
  type: string,
  err: any,
  job: Job
): Promise<number> => {
  return TranscriptionRetryStrategy.calculateBackoff(attemptsMade, err)
}