export interface SearchFilters {
  dateFrom?: Date
  dateTo?: Date
  speakers?: string[]
  tags?: string[]
  teamId?: string
  userId?: string
}

export interface SearchResult {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  summary?: string
  speakers?: string[]
  tags?: string[]
  relevance: number
  headline: string
  metadata?: {
    speaker_count?: number
    word_count?: number
    language?: string
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  took: number // milliseconds
  query: string
  filters: SearchFilters
  suggestions?: string[]
}

export interface SearchQuery {
  query: string
  filters?: SearchFilters
  limit?: number
  offset?: number
  includeSuggestions?: boolean
}

export interface SearchAnalytics {
  query: string
  filters: SearchFilters
  resultsCount: number
  clickedResults: string[]
  searchDuration: number
}