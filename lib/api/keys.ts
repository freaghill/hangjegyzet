import { createClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'

export interface ApiKey {
  id: string
  name: string
  keyPreview: string
  permissions: {
    meetings?: string[]
    transcripts?: string[]
  }
  rateLimit: number
  isActive: boolean
  lastUsedAt?: string
  expiresAt?: string
  createdAt: string
}

// Database row interface for api_keys table
interface ApiKeyRow {
  id: string
  name: string
  key_preview: string
  permissions: Record<string, string[]>
  rate_limit: number
  is_active: boolean
  last_used_at?: string
  expires_at?: string
  created_at: string
}

export class ApiKeyManager {
  /**
   * Generate a new API key
   */
  generateKey(): string {
    // Generate a secure random key
    const bytes = randomBytes(32)
    const key = `hjk_${bytes.toString('base64url')}`
    return key
  }

  /**
   * Hash an API key for storage
   */
  hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex')
  }

  /**
   * Create a new API key for an organization
   */
  async createApiKey(
    organizationId: string,
    userId: string,
    options: {
      name: string
      permissions?: Record<string, string[]>
      rateLimit?: number
      expiresAt?: Date
    }
  ): Promise<{ key: string; apiKey: ApiKey }> {
    const supabase = await createClient()
    
    // Generate new key
    const key = this.generateKey()
    const keyHash = this.hashKey(key)
    const keyPreview = key.substring(0, 8) + '...'
    
    // Insert into database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: organizationId,
        name: options.name,
        key_hash: keyHash,
        key_preview: keyPreview,
        permissions: options.permissions || {
          meetings: ['read', 'write'],
          transcripts: ['read']
        },
        rate_limit: options.rateLimit || 1000,
        expires_at: options.expiresAt?.toISOString(),
        created_by: userId
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`)
    }
    
    return {
      key, // Return the actual key only once
      apiKey: this.formatApiKey(data)
    }
  }

  /**
   * List API keys for an organization
   */
  async listApiKeys(organizationId: string): Promise<ApiKey[]> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to list API keys: ${error.message}`)
    }
    
    return data.map(this.formatApiKey)
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    keyId: string,
    updates: {
      name?: string
      permissions?: Record<string, string[]>
      rateLimit?: number
      isActive?: boolean
      expiresAt?: Date | null
    }
  ): Promise<ApiKey> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('api_keys')
      .update({
        name: updates.name,
        permissions: updates.permissions,
        rate_limit: updates.rateLimit,
        is_active: updates.isActive,
        expires_at: updates.expiresAt?.toISOString() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`)
    }
    
    return this.formatApiKey(data)
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(keyId: string): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
    
    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`)
    }
  }

  /**
   * Verify an API key and get permissions
   */
  async verifyApiKey(key: string): Promise<{
    organizationId: string
    permissions: Record<string, string[]>
    rateLimit: number
  } | null> {
    const supabase = await createClient()
    
    const keyHash = this.hashKey(key)
    
    const { data, error } = await supabase
      .rpc('verify_api_key', { p_key_hash: keyHash })
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      organizationId: data.organization_id,
      permissions: data.permissions,
      rateLimit: data.rate_limit
    }
  }

  /**
   * Log API request
   */
  async logApiRequest(
    apiKeyId: string,
    organizationId: string,
    request: {
      endpoint: string
      method: string
      statusCode: number
      responseTime: number
      errorMessage?: string
      ipAddress?: string
      userAgent?: string
    }
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase.from('api_logs').insert({
      api_key_id: apiKeyId,
      organization_id: organizationId,
      endpoint: request.endpoint,
      method: request.method,
      status_code: request.statusCode,
      response_time_ms: request.responseTime,
      error_message: request.errorMessage,
      ip_address: request.ipAddress,
      user_agent: request.userAgent
    })
  }

  /**
   * Format API key for response
   */
  private formatApiKey(data: ApiKeyRow): ApiKey {
    return {
      id: data.id,
      name: data.name,
      keyPreview: data.key_preview,
      permissions: data.permissions,
      rateLimit: data.rate_limit,
      isActive: data.is_active,
      lastUsedAt: data.last_used_at,
      expiresAt: data.expires_at,
      createdAt: data.created_at
    }
  }
}

// Export singleton instance
export const apiKeyManager = new ApiKeyManager()