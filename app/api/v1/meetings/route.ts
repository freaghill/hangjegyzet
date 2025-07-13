import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { 
  parsePaginationParams, 
  createPaginatedResponse,
  parseFieldSelection,
  setCacheHeaders,
  createPrismaSelect
} from '@/lib/api/pagination'
import { withCache } from '@/lib/cache/cache-middleware'
import { cacheKeys } from '@/lib/cache/redis-client'

/**
 * GET /api/v1/meetings - List meetings
 */
export const GET = withApiAuth(
  withCache(async (request, context) => {
    const { searchParams } = new URL(request.url)
    
    // Parse pagination params
    const pagination = parsePaginationParams(searchParams)
    const fieldSelection = parseFieldSelection({
      fields: searchParams.get('fields') || undefined,
      include: searchParams.get('include') || undefined,
      exclude: searchParams.get('exclude') || undefined,
    })
    
    // Parse filters
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const search = searchParams.get('search')
    
    const supabase = await createClient()
    
    // Build optimized query with field selection
    const defaultFields = 'id,title,status,duration_seconds,created_at,summary'
    const selectFields = searchParams.get('fields') || defaultFields
    
    let query = supabase
      .from('meetings')
      .select(selectFields, { count: 'exact' })
      .eq('organization_id', context.organizationId)
    
    // Apply sorting
    if (pagination.sort) {
      query = query.order(pagination.sort, { ascending: pagination.order === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }
    
    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (from) {
      query = query.gte('created_at', from)
    }
    if (to) {
      query = query.lte('created_at', to)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`)
    }
    
    // Apply pagination
    const offset = (pagination.page - 1) * pagination.limit
    query = query.range(offset, offset + pagination.limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      )
    }
    
    // Create response with proper caching headers
    const response = NextResponse.json(
      createPaginatedResponse(data || [], count || 0, pagination)
    )
    
    // Set cache headers based on filters
    setCacheHeaders(response.headers, {
      maxAge: 0, // Don't cache in browser
      sMaxAge: status || from || to || search ? 60 : 300, // Cache filtered results less
      staleWhileRevalidate: 60,
      private: true, // User-specific data
    })
    
    return response
  }, {
    ttl: 300, // 5 minutes
    key: (req) => {
      const url = new URL(req.url)
      const params = url.searchParams.toString()
      return cacheKeys.userMeetings(context.organizationId) + ':' + params
    },
    swr: true,
    swrTtl: 60,
  }), 
  { resource: 'meetings', action: 'read' }
)

/**
 * POST /api/v1/meetings - Create a new meeting via URL
 */
export const POST = withApiAuth(async (request, context) => {
  try {
    const body = await request.json()
    const { url, title, language = 'hu' } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Create meeting record
    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        organization_id: context.organizationId,
        title: title || `Meeting from ${new URL(url).hostname}`,
        status: 'processing',
        metadata: {
          source: 'api',
          url,
          language
        }
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      )
    }
    
    // Queue transcription job
    // In production, this would be sent to a queue
    // For now, we'll process it inline
    const { processTranscriptionJob } = await import('@/lib/jobs/transcription-processor')
    
    processTranscriptionJob({
      meetingId: meeting.id,
      fileUrl: url,
      organizationId: context.organizationId,
      options: { language }
    }).catch(console.error)
    
    return NextResponse.json({
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      created_at: meeting.created_at
    }, { status: 201 })
  } catch (_error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}, { resource: 'meetings', action: 'write' })