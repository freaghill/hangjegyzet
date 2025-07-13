import { z } from 'zod'

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationParams = z.infer<typeof paginationSchema>

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Parse pagination params from request
export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const params = Object.fromEntries(searchParams)
  return paginationSchema.parse(params)
}

// Create paginated response
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit)
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  }
}

// Cursor-based pagination
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
})

export type CursorPaginationParams = z.infer<typeof cursorPaginationSchema>

export interface CursorPaginatedResponse<T> {
  data: T[]
  pagination: {
    cursor: string | null
    hasMore: boolean
    limit: number
  }
}

// Create cursor from date
export function createCursor(date: Date): string {
  return Buffer.from(date.toISOString()).toString('base64')
}

// Parse cursor to date
export function parseCursor(cursor: string): Date {
  try {
    const dateStr = Buffer.from(cursor, 'base64').toString()
    return new Date(dateStr)
  } catch {
    throw new Error('Invalid cursor')
  }
}

// Optimize query with field selection
export const fieldSelectionSchema = z.object({
  fields: z.string().optional(),
  include: z.string().optional(),
  exclude: z.string().optional(),
})

export type FieldSelectionParams = z.infer<typeof fieldSelectionSchema>

// Parse field selection
export function parseFieldSelection(params: FieldSelectionParams) {
  const selection: any = {}
  
  if (params.fields) {
    const fields = params.fields.split(',').map(f => f.trim())
    fields.forEach(field => {
      selection[field] = true
    })
  }
  
  if (params.include) {
    const includes = params.include.split(',').map(f => f.trim())
    includes.forEach(field => {
      selection[field] = true
    })
  }
  
  if (params.exclude) {
    const excludes = params.exclude.split(',').map(f => f.trim())
    excludes.forEach(field => {
      selection[field] = false
    })
  }
  
  return selection
}

// Response caching headers
export function setCacheHeaders(
  headers: Headers,
  options: {
    maxAge?: number
    sMaxAge?: number
    staleWhileRevalidate?: number
    private?: boolean
  } = {}
) {
  const {
    maxAge = 0,
    sMaxAge = 300,
    staleWhileRevalidate = 60,
    private: isPrivate = false,
  } = options

  const directives = [
    isPrivate ? 'private' : 'public',
    `max-age=${maxAge}`,
    `s-maxage=${sMaxAge}`,
    staleWhileRevalidate > 0 && `stale-while-revalidate=${staleWhileRevalidate}`,
  ].filter(Boolean).join(', ')

  headers.set('Cache-Control', directives)
}

// Batch API response
export interface BatchRequest {
  id: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  body?: any
}

export interface BatchResponse {
  id: string
  status: number
  body: any
  error?: string
}

// Process batch requests
export async function processBatchRequests(
  requests: BatchRequest[],
  handler: (req: BatchRequest) => Promise<any>
): Promise<BatchResponse[]> {
  return Promise.all(
    requests.map(async (req) => {
      try {
        const body = await handler(req)
        return {
          id: req.id,
          status: 200,
          body,
        }
      } catch (error) {
        return {
          id: req.id,
          status: error instanceof Error && 'status' in error ? (error as any).status : 500,
          body: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    })
  )
}

// Response compression
export function shouldCompress(
  contentType: string | null,
  contentLength: number
): boolean {
  // Don't compress if already compressed
  if (!contentType) return false
  
  // Don't compress small responses
  if (contentLength < 1024) return false
  
  // Compress text-based content
  const compressibleTypes = [
    'application/json',
    'application/xml',
    'text/html',
    'text/plain',
    'text/css',
    'text/javascript',
    'application/javascript',
  ]
  
  return compressibleTypes.some(type => contentType.includes(type))
}

// GraphQL-style field filtering for Prisma
export function createPrismaSelect(fields: string): any {
  const select: any = {}
  const parts = fields.split(',').map(f => f.trim())
  
  parts.forEach(part => {
    const nested = part.split('.')
    let current = select
    
    nested.forEach((field, index) => {
      if (index === nested.length - 1) {
        current[field] = true
      } else {
        current[field] = current[field] || { select: {} }
        current = current[field].select
      }
    })
  })
  
  return select
}