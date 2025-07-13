import { Job } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import { auditLogger } from '@/lib/security/audit-logger'

export enum TranscriptionErrorType {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // API errors
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_AUTHENTICATION = 'API_AUTHENTICATION',
  API_INVALID_REQUEST = 'API_INVALID_REQUEST',
  
  // File errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_FORMAT = 'FILE_INVALID_FORMAT',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  
  // Processing errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  INSUFFICIENT_AUDIO_QUALITY = 'INSUFFICIENT_AUDIO_QUALITY',
  LANGUAGE_NOT_SUPPORTED = 'LANGUAGE_NOT_SUPPORTED',
  
  // System errors
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  DISK_SPACE_FULL = 'DISK_SPACE_FULL',
  WORKER_CRASHED = 'WORKER_CRASHED',
  
  // Business logic errors
  ORGANIZATION_LIMIT_EXCEEDED = 'ORGANIZATION_LIMIT_EXCEEDED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  MODE_NOT_AVAILABLE = 'MODE_NOT_AVAILABLE',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

export interface TranscriptionError {
  type: TranscriptionErrorType
  message: string
  details?: any
  isRetryable: boolean
  suggestedAction?: string
  userMessage: string // Hungarian message for users
}

export class TranscriptionErrorHandler {
  private static readonly ERROR_MAPPINGS: Record<string, TranscriptionErrorType> = {
    // OpenAI specific errors
    'rate_limit_exceeded': TranscriptionErrorType.API_RATE_LIMIT,
    'insufficient_quota': TranscriptionErrorType.API_QUOTA_EXCEEDED,
    'invalid_api_key': TranscriptionErrorType.API_AUTHENTICATION,
    'model_not_found': TranscriptionErrorType.API_INVALID_REQUEST,
    
    // Network errors
    'ECONNREFUSED': TranscriptionErrorType.NETWORK_ERROR,
    'ETIMEDOUT': TranscriptionErrorType.TIMEOUT,
    'ENOTFOUND': TranscriptionErrorType.NETWORK_ERROR,
    'fetch failed': TranscriptionErrorType.NETWORK_ERROR,
    
    // File errors
    'ENOENT': TranscriptionErrorType.FILE_NOT_FOUND,
    'File too large': TranscriptionErrorType.FILE_TOO_LARGE,
    'Invalid file format': TranscriptionErrorType.FILE_INVALID_FORMAT,
    
    // System errors
    'ENOMEM': TranscriptionErrorType.OUT_OF_MEMORY,
    'ENOSPC': TranscriptionErrorType.DISK_SPACE_FULL,
  }

  /**
   * Analyze error and determine type
   */
  static analyzeError(error: any): TranscriptionError {
    const errorMessage = error?.message || error?.toString() || 'Unknown error'
    const errorCode = error?.code || error?.response?.data?.error?.code
    
    // Check for specific error patterns
    let errorType = TranscriptionErrorType.UNKNOWN
    for (const [pattern, type] of Object.entries(this.ERROR_MAPPINGS)) {
      if (errorMessage.includes(pattern) || errorCode === pattern) {
        errorType = type
        break
      }
    }
    
    // Check for OpenAI specific error structure
    if (error?.response?.data?.error) {
      const openAIError = error.response.data.error
      if (openAIError.type === 'insufficient_quota') {
        errorType = TranscriptionErrorType.API_QUOTA_EXCEEDED
      } else if (openAIError.code === 'rate_limit_exceeded') {
        errorType = TranscriptionErrorType.API_RATE_LIMIT
      }
    }
    
    return this.createErrorResponse(errorType, errorMessage, error)
  }

  /**
   * Create structured error response
   */
  private static createErrorResponse(
    type: TranscriptionErrorType,
    message: string,
    originalError?: any
  ): TranscriptionError {
    const errorConfigs: Record<TranscriptionErrorType, Partial<TranscriptionError>> = {
      [TranscriptionErrorType.NETWORK_ERROR]: {
        isRetryable: true,
        suggestedAction: 'Check network connection and retry',
        userMessage: 'Hálózati hiba történt. Kérjük próbálja újra később.'
      },
      [TranscriptionErrorType.TIMEOUT]: {
        isRetryable: true,
        suggestedAction: 'Retry with exponential backoff',
        userMessage: 'A feldolgozás időtúllépés miatt megszakadt. Automatikusan újrapróbáljuk.'
      },
      [TranscriptionErrorType.API_RATE_LIMIT]: {
        isRetryable: true,
        suggestedAction: 'Wait and retry after rate limit reset',
        userMessage: 'Túl sok kérés érkezett. Kérjük várjon néhány percet.'
      },
      [TranscriptionErrorType.API_QUOTA_EXCEEDED]: {
        isRetryable: false,
        suggestedAction: 'Upgrade API plan or wait for quota reset',
        userMessage: 'Az API kvóta kimerült. Kérjük értesítse az adminisztrátort.'
      },
      [TranscriptionErrorType.API_AUTHENTICATION]: {
        isRetryable: false,
        suggestedAction: 'Check API credentials',
        userMessage: 'Hitelesítési hiba. Kérjük értesítse az adminisztrátort.'
      },
      [TranscriptionErrorType.FILE_NOT_FOUND]: {
        isRetryable: false,
        suggestedAction: 'Verify file exists and re-upload',
        userMessage: 'A fájl nem található. Kérjük töltse fel újra.'
      },
      [TranscriptionErrorType.FILE_TOO_LARGE]: {
        isRetryable: false,
        suggestedAction: 'Reduce file size or split into smaller parts',
        userMessage: 'A fájl túl nagy. Maximum 2GB méretű fájlok támogatottak.'
      },
      [TranscriptionErrorType.FILE_INVALID_FORMAT]: {
        isRetryable: false,
        suggestedAction: 'Convert to supported format',
        userMessage: 'Nem támogatott fájlformátum. Kérjük használjon MP3, WAV vagy MP4 fájlt.'
      },
      [TranscriptionErrorType.FILE_CORRUPTED]: {
        isRetryable: false,
        suggestedAction: 'Re-upload a valid file',
        userMessage: 'A fájl sérült. Kérjük töltse fel újra.'
      },
      [TranscriptionErrorType.PROCESSING_FAILED]: {
        isRetryable: true,
        suggestedAction: 'Retry with different mode or settings',
        userMessage: 'A feldolgozás sikertelen. Próbálja meg másik átírási móddal.'
      },
      [TranscriptionErrorType.INSUFFICIENT_AUDIO_QUALITY]: {
        isRetryable: false,
        suggestedAction: 'Use precision mode or improve audio quality',
        userMessage: 'A hangminőség túl gyenge. Használja a Precíziós módot.'
      },
      [TranscriptionErrorType.LANGUAGE_NOT_SUPPORTED]: {
        isRetryable: false,
        suggestedAction: 'Select a supported language',
        userMessage: 'Ez a nyelv nem támogatott. Kérjük válasszon másik nyelvet.'
      },
      [TranscriptionErrorType.OUT_OF_MEMORY]: {
        isRetryable: true,
        suggestedAction: 'Retry with smaller chunk size',
        userMessage: 'Memória hiba. Automatikusan újrapróbáljuk.'
      },
      [TranscriptionErrorType.ORGANIZATION_LIMIT_EXCEEDED]: {
        isRetryable: false,
        suggestedAction: 'Upgrade subscription or wait for limit reset',
        userMessage: 'Elérte a havi limitet. Frissítse előfizetését vagy várjon a következő hónapig.'
      },
      [TranscriptionErrorType.SUBSCRIPTION_EXPIRED]: {
        isRetryable: false,
        suggestedAction: 'Renew subscription',
        userMessage: 'Az előfizetés lejárt. Kérjük újítsa meg.'
      },
      [TranscriptionErrorType.MODE_NOT_AVAILABLE]: {
        isRetryable: false,
        suggestedAction: 'Use a different transcription mode',
        userMessage: 'Ez az átírási mód nem elérhető az Ön csomagjában.'
      },
      [TranscriptionErrorType.UNKNOWN]: {
        isRetryable: true,
        suggestedAction: 'Retry or contact support',
        userMessage: 'Ismeretlen hiba történt. Kérjük próbálja újra.'
      },
      [TranscriptionErrorType.DISK_SPACE_FULL]: {
        isRetryable: false,
        suggestedAction: 'Free up disk space',
        userMessage: 'Nincs elég tárhely. Kérjük értesítse az adminisztrátort.'
      },
      [TranscriptionErrorType.WORKER_CRASHED]: {
        isRetryable: true,
        suggestedAction: 'Job will be retried automatically',
        userMessage: 'A feldolgozó szolgáltatás újraindult. Automatikusan újrapróbáljuk.'
      },
      [TranscriptionErrorType.API_INVALID_REQUEST]: {
        isRetryable: false,
        suggestedAction: 'Check request parameters',
        userMessage: 'Érvénytelen kérés. Kérjük próbálja újra.'
      }
    }
    
    const config = errorConfigs[type] || errorConfigs[TranscriptionErrorType.UNKNOWN]
    
    return {
      type,
      message,
      details: originalError,
      ...config
    } as TranscriptionError
  }

  /**
   * Handle job failure
   */
  static async handleJobFailure(
    job: Job,
    error: any,
    meetingId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const analyzedError = this.analyzeError(error)
    const supabase = await createClient()
    
    // Log error
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.error',
      resource_type: 'meeting',
      resource_id: meetingId,
      status: 'failure',
      metadata: {
        errorType: analyzedError.type,
        errorMessage: analyzedError.message,
        jobId: job.id,
        attemptNumber: job.attemptsMade,
        isRetryable: analyzedError.isRetryable
      }
    })
    
    // Update meeting with error info
    await supabase
      .from('meetings')
      .update({
        status: 'failed',
        error_message: analyzedError.userMessage,
        error_details: {
          type: analyzedError.type,
          message: analyzedError.message,
          timestamp: new Date().toISOString(),
          jobId: job.id,
          attempts: job.attemptsMade
        }
      })
      .eq('id', meetingId)
    
    // Handle specific error types
    switch (analyzedError.type) {
      case TranscriptionErrorType.API_RATE_LIMIT:
        // Add delay before retry
        const delay = this.calculateRateLimitDelay(error)
        await job.moveToDelayed(Date.now() + delay)
        break
        
      case TranscriptionErrorType.API_QUOTA_EXCEEDED:
        // Notify admins
        await this.notifyAdminsOfQuotaExceeded(organizationId)
        break
        
      case TranscriptionErrorType.ORGANIZATION_LIMIT_EXCEEDED:
        // Send email to user about limit
        await this.notifyUserOfLimitExceeded(userId, organizationId)
        break
    }
    
    // Determine if job should be retried
    if (!analyzedError.isRetryable || job.attemptsMade >= (job.opts.attempts || 3)) {
      // Mark as permanently failed
      await supabase
        .from('meetings')
        .update({
          status: 'failed_permanent',
          requires_manual_intervention: true
        })
        .eq('id', meetingId)
    }
  }

  /**
   * Calculate delay for rate limit errors
   */
  private static calculateRateLimitDelay(error: any): number {
    // Check for Retry-After header
    const retryAfter = error?.response?.headers?.['retry-after']
    if (retryAfter) {
      return parseInt(retryAfter) * 1000
    }
    
    // Default exponential backoff
    return Math.min(60000, 1000 * Math.pow(2, error.attemptNumber || 1))
  }

  /**
   * Notify admins of quota exceeded
   */
  private static async notifyAdminsOfQuotaExceeded(organizationId: string): Promise<void> {
    // TODO: Implement admin notification
    console.error(`API quota exceeded for organization ${organizationId}`)
  }

  /**
   * Notify user of limit exceeded
   */
  private static async notifyUserOfLimitExceeded(
    userId: string, 
    organizationId: string
  ): Promise<void> {
    // TODO: Send email to user
    console.log(`Organization limit exceeded for user ${userId}`)
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    const analyzed = this.analyzeError(error)
    return analyzed.isRetryable
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: any, attemptNumber: number): number {
    const analyzed = this.analyzeError(error)
    
    switch (analyzed.type) {
      case TranscriptionErrorType.API_RATE_LIMIT:
        return this.calculateRateLimitDelay(error)
      case TranscriptionErrorType.NETWORK_ERROR:
      case TranscriptionErrorType.TIMEOUT:
        return Math.min(30000, 1000 * Math.pow(2, attemptNumber))
      case TranscriptionErrorType.OUT_OF_MEMORY:
      case TranscriptionErrorType.WORKER_CRASHED:
        return 5000 // Fixed 5 second delay
      default:
        return Math.min(60000, 2000 * Math.pow(2, attemptNumber))
    }
  }
}

export const transcriptionErrorHandler = new TranscriptionErrorHandler()