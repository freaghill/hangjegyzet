import { NextRequest, NextResponse } from 'next/server'
import { apiKeyManager } from '@/lib/api/keys'
import { trackAPICall } from '@/lib/monitoring'
import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export interface ApiContext {
  organizationId: string
  permissions: Record<string, string[]>
  apiKeyId?: string
}

/**
 * Middleware to authenticate API requests
 */
export async function authenticateApiRequest(
  request: NextRequest,
  requiredPermission?: { resource: string; action: string }
): Promise<{ context: ApiContext | null; response?: NextResponse }> {
  const startTime = Date.now()
  
  // Extract API key from header
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      context: null,
      response: NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }
  }
  
  const apiKey = authHeader.substring(7)
  
  // Verify API key
  const keyData = await apiKeyManager.verifyApiKey(apiKey)
  if (!keyData) {
    await trackAPICall('api.auth.failed', async () => {})
    return {
      context: null,
      response: NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }
  }
  
  // Check permissions if specified
  if (requiredPermission) {
    const resourcePerms = keyData.permissions[requiredPermission.resource] || []
    if (!resourcePerms.includes(requiredPermission.action)) {
      return {
        context: null,
        response: NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }
  }
  
  // Check rate limit
  const supabase = await createClient()
  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  
  const { data: apiKeyRecord } = await supabase
    .from('api_keys')
    .select('id')
    .eq('key_hash', keyHash)
    .single()
  
  if (apiKeyRecord) {
    const { data: isWithinLimit } = await supabase
      .rpc('check_api_rate_limit', {
        p_api_key_id: apiKeyRecord.id,
        p_rate_limit: keyData.rateLimit
      })
    
    if (!isWithinLimit) {
      return {
        context: null,
        response: NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )
      }
    }
  }
  
  return {
    context: {
      organizationId: keyData.organizationId,
      permissions: keyData.permissions,
      apiKeyId: apiKeyRecord?.id
    }
  }
}

/**
 * Wrap API handler with authentication and logging
 */
export function withApiAuth<T = unknown>(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse<T>>,
  requiredPermission?: { resource: string; action: string }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    let statusCode = 200
    let errorMessage: string | undefined
    
    try {
      // Authenticate request
      const { context, response } = await authenticateApiRequest(request, requiredPermission)
      if (!context || response) {
        statusCode = response?.status || 401
        return response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      // Call handler
      const result = await handler(request, context)
      statusCode = result.status
      
      // Log successful request
      if (context.apiKeyId) {
        await apiKeyManager.logApiRequest(context.apiKeyId, context.organizationId, {
          endpoint: request.nextUrl.pathname,
          method: request.method,
          statusCode,
          responseTime: Date.now() - startTime,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
          userAgent: request.headers.get('user-agent') || undefined
        })
      }
      
      return result
    } catch (error) {
      statusCode = 500
      errorMessage = error instanceof Error ? error.message : 'Internal server error'
      
      console.error('API error:', error)
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }
  }
}

/**
 * Helper to create paginated responses
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1
    }
  }
}