import { createClient } from '@/lib/supabase/server'
import { 
  SearchQuery, 
  SearchResult, 
  SearchResponse, 
  SearchAnalytics 
} from './types'

export class SearchService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  async search(searchQuery: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now()
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Unauthorized')

      // Call the PostgreSQL search function
      const { data: results, error } = await this.supabase.rpc('search_meetings', {
        search_query: searchQuery.query,
        filter_user_id: searchQuery.filters?.userId || user.id,
        filter_team_id: searchQuery.filters?.teamId,
        filter_date_from: searchQuery.filters?.dateFrom?.toISOString(),
        filter_date_to: searchQuery.filters?.dateTo?.toISOString(),
        filter_speakers: searchQuery.filters?.speakers,
        filter_tags: searchQuery.filters?.tags,
        limit_count: searchQuery.limit || 20,
        offset_count: searchQuery.offset || 0
      })

      if (error) throw error

      // Get total count
      const { count } = await this.supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .textSearch('search_vector', searchQuery.query, {
          type: 'websearch',
          config: 'hungarian'
        })
        .eq('status', 'completed')
        .match({
          ...(searchQuery.filters?.userId && { user_id: searchQuery.filters.userId }),
          ...(searchQuery.filters?.teamId && { team_id: searchQuery.filters.teamId })
        })

      // Get suggestions if requested
      let suggestions: string[] = []
      if (searchQuery.includeSuggestions) {
        const { data: suggestionData } = await this.supabase.rpc('get_search_suggestions', {
          partial_query: searchQuery.query,
          user_id: user.id,
          limit_count: 5
        })
        suggestions = suggestionData?.map(s => s.suggestion) || []
      }

      const searchDuration = Date.now() - startTime

      // Track search analytics
      await this.trackSearch({
        query: searchQuery.query,
        filters: searchQuery.filters || {},
        resultsCount: results?.length || 0,
        clickedResults: [],
        searchDuration
      })

      return {
        results: results || [],
        total: count || 0,
        took: searchDuration,
        query: searchQuery.query,
        filters: searchQuery.filters || {},
        suggestions
      }
    } catch (error) {
      console.error('Search error:', error)
      throw error
    }
  }

  async getSuggestions(partialQuery: string): Promise<string[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await this.supabase.rpc('get_search_suggestions', {
        partial_query: partialQuery,
        user_id: user.id,
        limit_count: 5
      })

      if (error) throw error
      
      return data?.map(s => s.suggestion) || []
    } catch (error) {
      console.error('Suggestions error:', error)
      return []
    }
  }

  async trackSearch(analytics: SearchAnalytics): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return

      await this.supabase.from('search_queries').insert({
        user_id: user.id,
        query: analytics.query,
        filters: analytics.filters,
        results_count: analytics.resultsCount,
        clicked_results: analytics.clickedResults,
        search_duration_ms: analytics.searchDuration
      })
    } catch (error) {
      console.error('Track search error:', error)
    }
  }

  async trackSearchClick(searchId: string, resultId: string): Promise<void> {
    try {
      const { data: searchQuery } = await this.supabase
        .from('search_queries')
        .select('clicked_results')
        .eq('id', searchId)
        .single()

      if (!searchQuery) return

      const clickedResults = searchQuery.clicked_results || []
      if (!clickedResults.includes(resultId)) {
        clickedResults.push(resultId)
        
        await this.supabase
          .from('search_queries')
          .update({ clicked_results: clickedResults })
          .eq('id', searchId)
      }
    } catch (error) {
      console.error('Track click error:', error)
    }
  }

  async getPopularSearches(days: number = 7): Promise<Array<{ query: string; count: number }>> {
    try {
      const { data, error } = await this.supabase
        .from('search_queries')
        .select('query')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .gt('results_count', 0)

      if (error) throw error

      // Count occurrences
      const counts = data.reduce((acc: Record<string, number>, item) => {
        acc[item.query] = (acc[item.query] || 0) + 1
        return acc
      }, {})

      // Sort by count and return top 10
      return Object.entries(counts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    } catch (error) {
      console.error('Popular searches error:', error)
      return []
    }
  }

  async getSearchHistory(limit: number = 10): Promise<SearchQuery[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await this.supabase
        .from('search_queries')
        .select('query, filters')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data.map(item => ({
        query: item.query,
        filters: item.filters
      }))
    } catch (error) {
      console.error('Search history error:', error)
      return []
    }
  }
}