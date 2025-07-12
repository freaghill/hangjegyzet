import { createClient } from '@/lib/supabase/admin'
import crypto from 'crypto'
import { Queue } from 'bullmq'
import { redisClients } from '@/lib/cache/redis-sentinel'

interface RotatableKey {
  id: string
  type: 'api_key' | 'jwt_secret' | 'encryption_key' | 'webhook_secret'
  name: string
  value: string
  version: number
  created_at: Date
  rotated_at?: Date
  expires_at?: Date
  status: 'active' | 'rotating' | 'deprecated' | 'expired'
}

interface KeyRotationConfig {
  type: string
  rotationIntervalDays: number
  deprecationPeriodDays: number
  notifyBeforeDays: number
}

const DEFAULT_ROTATION_CONFIG: Record<string, KeyRotationConfig> = {
  api_key: {
    type: 'api_key',
    rotationIntervalDays: 90,
    deprecationPeriodDays: 7,
    notifyBeforeDays: 14,
  },
  jwt_secret: {
    type: 'jwt_secret',
    rotationIntervalDays: 180,
    deprecationPeriodDays: 1,
    notifyBeforeDays: 7,
  },
  encryption_key: {
    type: 'encryption_key',
    rotationIntervalDays: 365,
    deprecationPeriodDays: 30,
    notifyBeforeDays: 30,
  },
  webhook_secret: {
    type: 'webhook_secret',
    rotationIntervalDays: 180,
    deprecationPeriodDays: 14,
    notifyBeforeDays: 14,
  },
}

export class KeyRotationService {
  private static instance: KeyRotationService
  private rotationQueue: Queue
  private supabase = createClient()

  private constructor() {
    this.rotationQueue = new Queue('key-rotation', {
      connection: redisClients.queue,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    })

    this.setupRotationJobs()
  }

  static getInstance(): KeyRotationService {
    if (!KeyRotationService.instance) {
      KeyRotationService.instance = new KeyRotationService()
    }
    return KeyRotationService.instance
  }

  /**
   * Generate a new cryptographically secure key
   */
  private generateSecureKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64')
  }

  /**
   * Generate a new API key with prefix
   */
  private generateApiKey(prefix: string = 'hj'): string {
    const timestamp = Date.now().toString(36)
    const random = crypto.randomBytes(24).toString('base64url')
    return `${prefix}_${timestamp}_${random}`
  }

  /**
   * Create a new key version
   */
  async createKeyVersion(
    keyId: string,
    type: RotatableKey['type'],
    name: string
  ): Promise<RotatableKey> {
    const config = DEFAULT_ROTATION_CONFIG[type]
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + config.rotationIntervalDays)

    let value: string
    switch (type) {
      case 'api_key':
        value = this.generateApiKey()
        break
      case 'jwt_secret':
        value = this.generateSecureKey(64)
        break
      case 'encryption_key':
        value = this.generateSecureKey(32)
        break
      case 'webhook_secret':
        value = this.generateSecureKey(32)
        break
      default:
        value = this.generateSecureKey()
    }

    // Get current version
    const { data: currentKey } = await this.supabase
      .from('rotatable_keys')
      .select('version')
      .eq('id', keyId)
      .eq('status', 'active')
      .single()

    const version = (currentKey?.version || 0) + 1

    // Insert new key version
    const { data: newKey, error } = await this.supabase
      .from('rotatable_keys')
      .insert({
        id: keyId,
        type,
        name,
        value: this.encryptKey(value),
        version,
        created_at: new Date(),
        expires_at: expiresAt,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    // Store in cache for quick access
    await redisClients.cache.setex(
      `key:${keyId}:v${version}`,
      86400 * config.rotationIntervalDays,
      value
    )

    return {
      ...newKey,
      value, // Return decrypted value
    }
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId: string): Promise<void> {
    const { data: currentKey, error } = await this.supabase
      .from('rotatable_keys')
      .select('*')
      .eq('id', keyId)
      .eq('status', 'active')
      .single()

    if (error || !currentKey) {
      throw new Error(`Key ${keyId} not found or not active`)
    }

    const config = DEFAULT_ROTATION_CONFIG[currentKey.type]

    // Start rotation process
    await this.supabase
      .from('rotatable_keys')
      .update({ status: 'rotating' })
      .eq('id', keyId)
      .eq('version', currentKey.version)

    try {
      // Create new key version
      const newKey = await this.createKeyVersion(
        keyId,
        currentKey.type,
        currentKey.name
      )

      // Update old key to deprecated
      const deprecatedAt = new Date()
      deprecatedAt.setDate(deprecatedAt.getDate() + config.deprecationPeriodDays)

      await this.supabase
        .from('rotatable_keys')
        .update({
          status: 'deprecated',
          rotated_at: new Date(),
          expires_at: deprecatedAt,
        })
        .eq('id', keyId)
        .eq('version', currentKey.version)

      // Notify about rotation
      await this.notifyKeyRotation(currentKey, newKey)

      // Schedule cleanup job
      await this.rotationQueue.add(
        'cleanup-deprecated-key',
        {
          keyId,
          version: currentKey.version,
        },
        {
          delay: config.deprecationPeriodDays * 24 * 60 * 60 * 1000,
        }
      )
    } catch (error) {
      // Rollback on error
      await this.supabase
        .from('rotatable_keys')
        .update({ status: 'active' })
        .eq('id', keyId)
        .eq('version', currentKey.version)

      throw error
    }
  }

  /**
   * Get active key
   */
  async getActiveKey(keyId: string): Promise<string | null> {
    // Check cache first
    const cached = await redisClients.cache.get(`key:${keyId}:active`)
    if (cached) return cached

    // Get from database
    const { data: key, error } = await this.supabase
      .from('rotatable_keys')
      .select('value, version')
      .eq('id', keyId)
      .eq('status', 'active')
      .single()

    if (error || !key) return null

    const decrypted = this.decryptKey(key.value)

    // Cache for quick access
    await redisClients.cache.setex(
      `key:${keyId}:active`,
      3600, // 1 hour cache
      decrypted
    )

    return decrypted
  }

  /**
   * Validate a key (supports multiple versions during rotation)
   */
  async validateKey(keyId: string, value: string): Promise<boolean> {
    // Get all non-expired keys
    const { data: keys, error } = await this.supabase
      .from('rotatable_keys')
      .select('value, version, status')
      .eq('id', keyId)
      .in('status', ['active', 'deprecated'])
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    if (error || !keys || keys.length === 0) return false

    // Check against all valid versions
    for (const key of keys) {
      const decrypted = this.decryptKey(key.value)
      if (decrypted === value) {
        // Log usage of deprecated key
        if (key.status === 'deprecated') {
          console.warn(`Deprecated key ${keyId} v${key.version} is still in use`)
          await this.logKeyUsage(keyId, key.version, 'deprecated_key_used')
        }
        return true
      }
    }

    return false
  }

  /**
   * Setup automatic rotation jobs
   */
  private setupRotationJobs(): void {
    // Check for keys needing rotation every day
    this.rotationQueue.add(
      'check-key-rotations',
      {},
      {
        repeat: {
          pattern: '0 0 * * *', // Daily at midnight
        },
      }
    )

    // Process rotation checks
    this.rotationQueue.process('check-key-rotations', async () => {
      await this.checkAndRotateKeys()
    })

    // Process cleanup jobs
    this.rotationQueue.process('cleanup-deprecated-key', async (job) => {
      const { keyId, version } = job.data
      await this.cleanupDeprecatedKey(keyId, version)
    })
  }

  /**
   * Check all keys and rotate if needed
   */
  private async checkAndRotateKeys(): Promise<void> {
    const { data: keys, error } = await this.supabase
      .from('rotatable_keys')
      .select('*')
      .eq('status', 'active')

    if (error || !keys) return

    for (const key of keys) {
      const config = DEFAULT_ROTATION_CONFIG[key.type]
      const rotationDate = new Date(key.created_at)
      rotationDate.setDate(rotationDate.getDate() + config.rotationIntervalDays)

      const notifyDate = new Date(rotationDate)
      notifyDate.setDate(notifyDate.getDate() - config.notifyBeforeDays)

      const now = new Date()

      // Send notification if approaching rotation
      if (now >= notifyDate && now < rotationDate) {
        await this.notifyUpcomingRotation(key, rotationDate)
      }

      // Rotate if expired
      if (now >= rotationDate) {
        try {
          await this.rotateKey(key.id)
        } catch (error) {
          console.error(`Failed to rotate key ${key.id}:`, error)
          await this.notifyRotationFailure(key, error)
        }
      }
    }
  }

  /**
   * Cleanup deprecated key
   */
  private async cleanupDeprecatedKey(keyId: string, version: number): Promise<void> {
    // Update status to expired
    await this.supabase
      .from('rotatable_keys')
      .update({ status: 'expired' })
      .eq('id', keyId)
      .eq('version', version)

    // Remove from cache
    await redisClients.cache.del(`key:${keyId}:v${version}`)

    // Log cleanup
    await this.logKeyUsage(keyId, version, 'key_expired')
  }

  /**
   * Encrypt key for storage
   */
  private encryptKey(value: string): string {
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(process.env.KEY_ENCRYPTION_KEY!, 'base64')
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    
    let encrypted = cipher.update(value, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const authTag = cipher.getAuthTag()
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    })
  }

  /**
   * Decrypt key from storage
   */
  private decryptKey(encryptedData: string): string {
    const { encrypted, iv, authTag } = JSON.parse(encryptedData)
    
    const algorithm = 'aes-256-gcm'
    const key = Buffer.from(process.env.KEY_ENCRYPTION_KEY!, 'base64')
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'base64')
    )
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'))
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * Log key usage events
   */
  private async logKeyUsage(
    keyId: string,
    version: number,
    event: string
  ): Promise<void> {
    await this.supabase.from('key_rotation_logs').insert({
      key_id: keyId,
      version,
      event,
      timestamp: new Date(),
    })
  }

  /**
   * Send notifications
   */
  private async notifyKeyRotation(
    oldKey: RotatableKey,
    newKey: RotatableKey
  ): Promise<void> {
    // Implementation would send email/slack notifications
    console.log(`Key ${oldKey.id} rotated from v${oldKey.version} to v${newKey.version}`)
  }

  private async notifyUpcomingRotation(
    key: RotatableKey,
    rotationDate: Date
  ): Promise<void> {
    console.log(`Key ${key.id} will rotate on ${rotationDate.toISOString()}`)
  }

  private async notifyRotationFailure(
    key: RotatableKey,
    error: any
  ): Promise<void> {
    console.error(`Key rotation failed for ${key.id}:`, error)
  }
}

// Export singleton instance
export const keyRotationService = KeyRotationService.getInstance()