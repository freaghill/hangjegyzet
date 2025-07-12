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

// Client-side API key functions that call the API endpoints
export const apiKeyClient = {
  async listKeys(): Promise<ApiKey[]> {
    const response = await fetch('/api/settings/api-keys')
    if (!response.ok) {
      throw new Error('Failed to fetch API keys')
    }
    const data = await response.json()
    return data.keys
  },

  async createKey(name: string, permissions: Record<string, string[]>, rateLimit: number, expiresAt?: string): Promise<{ key: string; keyData: ApiKey }> {
    const response = await fetch('/api/settings/api-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        permissions,
        rateLimit,
        expiresAt,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create API key')
    }

    return response.json()
  },

  async updateKey(keyId: string, updates: Partial<ApiKey>): Promise<ApiKey> {
    const response = await fetch('/api/settings/api-keys', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keyId,
        ...updates,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update API key')
    }

    return response.json()
  },

  async deleteKey(keyId: string): Promise<void> {
    const response = await fetch('/api/settings/api-keys', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ keyId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete API key')
    }
  },
}