import { MeiliSearch, Index } from 'meilisearch'
import { createClient } from '@/lib/supabase/server'

export interface SearchableDocument {
  id: string
  type: 'meeting' | 'action_item' | 'participant' | 'transcript_segment'
  organizationId: string
  meetingId?: string
  title: string
  content: string
  metadata: Record<string, any>
  timestamp?: Date
  tags?: string[]
  participants?: string[]
  _geo?: {
    lat: number
    lng: number
  }
}

export interface SearchOptions {
  query: string
  limit?: number
  offset?: number
  filters?: string
  facets?: string[]
  sort?: string[]
  highlightPreTag?: string
  highlightPostTag?: string
  attributesToHighlight?: string[]
  attributesToCrop?: string[]
  cropLength?: number
  matchingStrategy?: 'all' | 'last'
}

export class MeilisearchService {
  private client: MeiliSearch
  private indexes: Map<string, Index> = new Map()
  
  constructor() {
    this.client = new MeiliSearch({
      host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
      apiKey: process.env.MEILISEARCH_API_KEY
    })
  }
  
  /**
   * Initialize indexes for an organization
   */
  async initializeOrganization(organizationId: string) {
    const indexName = `meetings_${organizationId}`
    
    try {
      // Create or get index
      const index = await this.client.getOrCreateIndex(indexName, {
        primaryKey: 'id'
      })
      
      // Configure index settings
      await index.updateSettings({
        searchableAttributes: [
          'title',
          'content',
          'participants',
          'tags',
          'metadata.summary',
          'metadata.keyPoints',
          'metadata.actionItems'
        ],
        filterableAttributes: [
          'type',
          'meetingId',
          'timestamp',
          'participants',
          'tags',
          'metadata.status',
          'metadata.priority',
          'metadata.sentiment'
        ],
        sortableAttributes: [
          'timestamp',
          'metadata.duration',
          'metadata.intelligenceScore'
        ],
        rankingRules: [
          'words',
          'typo',
          'proximity',
          'attribute',
          'sort',
          'exactness',
          'timestamp:desc'
        ],
        synonyms: {
          'meeting': ['találkozó', 'megbeszélés', 'tárgyalás'],
          'action': ['feladat', 'teendő', 'akció'],
          'urgent': ['sürgős', 'fontos', 'kritikus'],
          'done': ['kész', 'befejezett', 'lezárt']
        },
        stopWords: ['a', 'az', 'és', 'vagy', 'de', 'hogy', 'nem']
      })
      
      this.indexes.set(organizationId, index)
      
      // Index existing data
      await this.reindexOrganizationData(organizationId)
      
      return index
    } catch (error) {
      console.error('Error initializing Meilisearch index:', error)
      throw error
    }
  }
  
  /**
   * Search across all document types
   */
  async search(organizationId: string, options: SearchOptions) {
    const index = await this.getOrCreateIndex(organizationId)
    
    const searchParams: any = {
      q: options.query,
      limit: options.limit || 20,
      offset: options.offset || 0
    }
    
    if (options.filters) searchParams.filter = options.filters
    if (options.facets) searchParams.facets = options.facets
    if (options.sort) searchParams.sort = options.sort
    if (options.highlightPreTag) searchParams.highlightPreTag = options.highlightPreTag
    if (options.highlightPostTag) searchParams.highlightPostTag = options.highlightPostTag
    if (options.attributesToHighlight) searchParams.attributesToHighlight = options.attributesToHighlight
    if (options.attributesToCrop) searchParams.attributesToCrop = options.attributesToCrop
    if (options.cropLength) searchParams.cropLength = options.cropLength
    if (options.matchingStrategy) searchParams.matchingStrategy = options.matchingStrategy
    
    return await index.search(options.query, searchParams)
  }
  
  /**
   * Semantic search using embeddings
   */
  async semanticSearch(
    organizationId: string, 
    query: string,
    options?: {
      limit?: number
      threshold?: number
      boostKeywords?: string[]
    }
  ) {
    // Get query embedding (would integrate with OpenAI/Anthropic embeddings)
    const queryEmbedding = await this.getQueryEmbedding(query)
    
    // Search with vector similarity
    const index = await this.getOrCreateIndex(organizationId)
    
    // Meilisearch doesn't support vector search natively yet
    // This is a placeholder for when it does or when using a plugin
    // For now, fall back to keyword search with boost
    
    const boostQuery = options?.boostKeywords 
      ? `${query} ${options.boostKeywords.join(' ')}`
      : query
    
    return await this.search(organizationId, {
      query: boostQuery,
      limit: options?.limit || 10,
      attributesToHighlight: ['content', 'title'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    })
  }
  
  /**
   * Index a single document
   */
  async indexDocument(organizationId: string, document: SearchableDocument) {
    const index = await this.getOrCreateIndex(organizationId)
    
    // Enhance document with computed fields
    const enhancedDoc = {
      ...document,
      _searchableText: this.createSearchableText(document),
      _timestamp: document.timestamp?.getTime() || Date.now()
    }
    
    await index.addDocuments([enhancedDoc])
  }
  
  /**
   * Index multiple documents
   */
  async indexDocuments(organizationId: string, documents: SearchableDocument[]) {
    const index = await this.getOrCreateIndex(organizationId)
    
    const enhancedDocs = documents.map(doc => ({
      ...doc,
      _searchableText: this.createSearchableText(doc),
      _timestamp: doc.timestamp?.getTime() || Date.now()
    }))
    
    await index.addDocuments(enhancedDocs, { primaryKey: 'id' })
  }
  
  /**
   * Update a document
   */
  async updateDocument(organizationId: string, documentId: string, updates: Partial<SearchableDocument>) {
    const index = await this.getOrCreateIndex(organizationId)
    await index.updateDocuments([{ id: documentId, ...updates }])
  }
  
  /**
   * Delete a document
   */
  async deleteDocument(organizationId: string, documentId: string) {
    const index = await this.getOrCreateIndex(organizationId)
    await index.deleteDocument(documentId)
  }
  
  /**
   * Delete all documents for a meeting
   */
  async deleteMeetingDocuments(organizationId: string, meetingId: string) {
    const index = await this.getOrCreateIndex(organizationId)
    await index.deleteDocuments({
      filter: `meetingId = "${meetingId}"`
    })
  }
  
  /**
   * Get search suggestions
   */
  async getSuggestions(organizationId: string, query: string, limit: number = 5) {
    const index = await this.getOrCreateIndex(organizationId)
    
    // Search for partial matches
    const results = await index.search(query, {
      limit,
      attributesToRetrieve: ['title', 'type'],
      attributesToHighlight: ['title'],
      highlightPreTag: '<b>',
      highlightPostTag: '</b>'
    })
    
    return results.hits.map(hit => ({
      text: hit.title,
      type: hit.type,
      highlighted: hit._formatted?.title || hit.title
    }))
  }
  
  /**
   * Get faceted search results
   */
  async getFacetedResults(
    organizationId: string,
    query: string,
    facets: string[]
  ) {
    const index = await this.getOrCreateIndex(organizationId)
    
    const results = await index.search(query, {
      facets,
      limit: 0 // Only get facets, not results
    })
    
    return results.facetDistribution
  }
  
  /**
   * Reindex all data for an organization
   */
  private async reindexOrganizationData(organizationId: string) {
    const supabase = await createClient()
    
    // Get all meetings
    const { data: meetings } = await supabase
      .from('meetings')
      .select(`
        *,
        meeting_action_items(*),
        meeting_participants(*),
        meeting_segments(*),
        meeting_ai_summaries(*)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
    
    if (!meetings) return
    
    const documents: SearchableDocument[] = []
    
    for (const meeting of meetings) {
      // Index meeting document
      documents.push({
        id: `meeting_${meeting.id}`,
        type: 'meeting',
        organizationId,
        meetingId: meeting.id,
        title: meeting.title,
        content: meeting.transcript?.text || '',
        metadata: {
          duration: meeting.duration_seconds,
          status: meeting.status,
          intelligenceScore: meeting.intelligence_score,
          summary: meeting.meeting_ai_summaries?.[0]?.summary,
          keyPoints: meeting.meeting_ai_summaries?.[0]?.key_points,
          sentiment: meeting.metadata?.sentiment
        },
        timestamp: new Date(meeting.created_at),
        participants: meeting.meeting_participants?.map((p: any) => p.name) || [],
        tags: meeting.metadata?.topics || []
      })
      
      // Index action items
      for (const actionItem of meeting.meeting_action_items || []) {
        documents.push({
          id: `action_${actionItem.id}`,
          type: 'action_item',
          organizationId,
          meetingId: meeting.id,
          title: actionItem.text,
          content: actionItem.text,
          metadata: {
            assignee: actionItem.assignee_name,
            priority: actionItem.priority,
            status: actionItem.status,
            deadline: actionItem.due_date,
            meetingTitle: meeting.title
          },
          timestamp: new Date(actionItem.created_at)
        })
      }
      
      // Index transcript segments for detailed search
      for (const segment of meeting.meeting_segments || []) {
        documents.push({
          id: `segment_${meeting.id}_${segment.id}`,
          type: 'transcript_segment',
          organizationId,
          meetingId: meeting.id,
          title: `${segment.speaker} - ${meeting.title}`,
          content: segment.content,
          metadata: {
            speaker: segment.speaker,
            startTime: segment.start_time,
            endTime: segment.end_time,
            meetingTitle: meeting.title
          },
          timestamp: new Date(meeting.created_at)
        })
      }
    }
    
    // Batch index all documents
    if (documents.length > 0) {
      await this.indexDocuments(organizationId, documents)
    }
  }
  
  /**
   * Get or create index for organization
   */
  private async getOrCreateIndex(organizationId: string): Promise<Index> {
    if (!this.indexes.has(organizationId)) {
      await this.initializeOrganization(organizationId)
    }
    return this.indexes.get(organizationId)!
  }
  
  /**
   * Create searchable text from document
   */
  private createSearchableText(document: SearchableDocument): string {
    const parts = [
      document.title,
      document.content,
      document.tags?.join(' '),
      document.participants?.join(' '),
      JSON.stringify(document.metadata)
    ]
    
    return parts.filter(Boolean).join(' ').toLowerCase()
  }
  
  /**
   * Get query embedding (placeholder)
   */
  private async getQueryEmbedding(query: string): Promise<number[]> {
    // This would integrate with OpenAI or another embedding service
    // For now, return a dummy embedding
    return Array(1536).fill(0).map(() => Math.random())
  }
  
  /**
   * Get index stats
   */
  async getIndexStats(organizationId: string) {
    const index = await this.getOrCreateIndex(organizationId)
    return await index.getStats()
  }
  
  /**
   * Clear index
   */
  async clearIndex(organizationId: string) {
    const index = await this.getOrCreateIndex(organizationId)
    await index.deleteAllDocuments()
  }
}

// Export singleton instance
export const meilisearchService = new MeilisearchService()