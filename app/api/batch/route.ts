import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processBatchRequests, BatchRequest } from '@/lib/api/pagination'
import { z } from 'zod'

// Batch request schema
const batchRequestSchema = z.object({
  requests: z.array(z.object({
    id: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    path: z.string(),
    body: z.any().optional(),
  })).max(10), // Limit batch size
})

// Allowed API paths for batching
const ALLOWED_PATHS = [
  '/api/meetings',
  '/api/teams',
  '/api/search',
  '/api/analytics',
  '/api/notifications',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requests } = batchRequestSchema.parse(body)

    // Validate paths
    const invalidPaths = requests.filter(
      req => !ALLOWED_PATHS.some(path => req.path.startsWith(path))
    )
    
    if (invalidPaths.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid paths in batch request',
          invalidPaths: invalidPaths.map(r => r.path)
        },
        { status: 400 }
      )
    }

    // Process batch requests
    const results = await processBatchRequests(requests, async (req) => {
      // Create a synthetic request
      const url = new URL(req.path, request.url)
      const headers = new Headers(request.headers)
      
      const syntheticRequest = new NextRequest(url, {
        method: req.method,
        headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      })

      // Route to appropriate handler
      const handler = await getHandler(req.path)
      if (!handler) {
        throw new Error(`No handler found for ${req.path}`)
      }

      const response = await handler(syntheticRequest)
      const data = await response.json()
      
      if (!response.ok) {
        throw Object.assign(new Error(data.error || 'Request failed'), {
          status: response.status,
        })
      }

      return data
    })

    // Return batch results
    return NextResponse.json({
      responses: results,
    })
  } catch (error) {
    console.error('Batch API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Batch processing failed' },
      { status: 500 }
    )
  }
}

// Route handler resolver
async function getHandler(path: string): Promise<any> {
  // Remove query params
  const cleanPath = path.split('?')[0]
  
  // Map paths to handlers
  const handlers: Record<string, () => Promise<any>> = {
    '/api/meetings': async () => {
      const { GET } = await import('@/app/api/v1/meetings/route')
      return GET
    },
    '/api/teams': async () => {
      const { GET } = await import('@/app/api/teams/route')
      return GET
    },
    '/api/search': async () => {
      const { GET } = await import('@/app/api/search/route')
      return GET
    },
    '/api/analytics/usage': async () => {
      const { GET } = await import('@/app/api/analytics/usage/route')
      return GET
    },
    '/api/notifications': async () => {
      const { GET } = await import('@/app/api/notifications/route')
      return GET
    },
  }

  // Find matching handler
  for (const [handlerPath, loader] of Object.entries(handlers)) {
    if (cleanPath.startsWith(handlerPath)) {
      return loader()
    }
  }

  return null
}