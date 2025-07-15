import { NextRequest, NextResponse } from 'next/server'
import { SearchService } from '@/lib/search/search-service'
import { SearchQuery } from '@/lib/search/types'
import { 
  parsePaginationParams,
  createPaginatedResponse,
  setCacheHeaders,
  createPrismaSelect
} from '@/lib/api/pagination'
import { withCache } from '@/lib/cache/cache-middleware'
import { cacheKeys } from '@/lib/cache/redis-client'

export async function POST(request: NextRequest) {
  try {
    const body: SearchQuery = await request.json()
    
    if (!body.query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    const searchService = new SearchService()
    const results = await searchService.search(body)
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

export const GET = withCache(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    
    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    // Parse pagination params
    const pagination = parsePaginationParams(searchParams)
    
    // Parse filters from query params
    const filters: any = {}
    
    const dateFrom = searchParams.get('dateFrom')
    if (dateFrom) filters.dateFrom = new Date(dateFrom)
    
    const dateTo = searchParams.get('dateTo')
    if (dateTo) filters.dateTo = new Date(dateTo)
    
    const speakers = searchParams.get('speakers')
    if (speakers) filters.speakers = speakers.split(',')
    
    const tags = searchParams.get('tags')
    if (tags) filters.tags = tags.split(',')
    
    const teamId = searchParams.get('teamId')
    if (teamId) filters.teamId = teamId
    
    // Field selection for optimization
    const fields = searchParams.get('fields')
    const includeTranscript = searchParams.get('includeTranscript') === 'true'

    const searchQuery = {
      query,
      filters,
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit,
      includeSuggestions: searchParams.get('suggestions') === 'true',
      sort: pagination.sort,
      order: pagination.order,
      fields: fields ? fields.split(',') : undefined,
      includeTranscript
    } as SearchQuery & { sort?: string; order?: string; fields?: string[]; includeTranscript?: boolean }

    const searchService = new SearchService()
    const results = await searchService.search(searchQuery)
    
    // Create paginated response
    const response = NextResponse.json(
      createPaginatedResponse(
        results.meetings,
        results.total,
        pagination
      )
    )
    
    // Set cache headers based on search complexity
    const cacheTime = query.length > 3 ? 300 : 60 // Cache longer queries more
    setCacheHeaders(response.headers, {
      maxAge: 0,
      sMaxAge: cacheTime,
      staleWhileRevalidate: 60,
      private: true,
    })
    
    return response
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}, {
  ttl: 300,
  key: (req) => {
    const url = new URL(req.url)
    return cacheKeys.searchResults(
      url.searchParams.get('q') || '',
      url.searchParams.toString()
    )
  },
  swr: true,
  swrTtl: 60,
})