export interface ApiKey {
  id: string
  name: string
  keyPreview: string
  permissions: {
    meetings?: string[]
    transcripts?: string[]
    exports?: string[]
    analytics?: string[]
  }
  lastUsed?: Date
  createdAt: Date
  expiresAt?: Date
}

export async function generateApiKey(name: string, permissions: ApiKey['permissions']) {
  const response = await fetch('/api/settings/api-keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, permissions })
  })
  
  if (!response.ok) {
    throw new Error('Failed to generate API key')
  }
  
  return response.json()
}

export async function listApiKeys() {
  const response = await fetch('/api/settings/api-keys')
  
  if (!response.ok) {
    throw new Error('Failed to list API keys')
  }
  
  return response.json()
}

export async function revokeApiKey(keyId: string) {
  const response = await fetch(`/api/settings/api-keys/${keyId}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    throw new Error('Failed to revoke API key')
  }
  
  return response.json()
}