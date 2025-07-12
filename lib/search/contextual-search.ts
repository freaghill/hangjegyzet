import { createClient } from '@/lib/supabase/server'

// Hungarian business term synonyms
const HUNGARIAN_SYNONYMS: Record<string, string[]> = {
  'költségvetés': ['büdzsé', 'budget', 'keret', 'pénzügyi terv', 'pénzügyi keret'],
  'meeting': ['megbeszélés', 'értekezlet', 'gyűlés', 'találkozó', 'tárgyalás'],
  'feladat': ['task', 'teendő', 'akció', 'tennivaló', 'munka'],
  'határidő': ['deadline', 'lejárat', 'végső időpont', 'dátum'],
  'projekt': ['project', 'program', 'terv', 'vállalkozás'],
  'ügyfél': ['kliens', 'vevő', 'megrendelő', 'partner', 'kuncsaft'],
  'bevétel': ['árbevétel', 'forgalom', 'jövedelem', 'nyereség', 'profit'],
  'kiadás': ['költség', 'ráfordítás', 'expense', 'kifizetés'],
  'stratégia': ['terv', 'koncepció', 'elképzelés', 'irányvonal'],
  'cél': ['célkitűzés', 'objektív', 'target', 'szándék'],
  'teljesítmény': ['performance', 'eredmény', 'kimenetel', 'produktivitás'],
  'jelentés': ['report', 'beszámoló', 'riport', 'összefoglaló'],
  'elemzés': ['analízis', 'vizsgálat', 'kiértékelés', 'tanulmány'],
  'döntés': ['határozat', 'elhatározás', 'verdikt', 'ítélet'],
  'megállapodás': ['egyezség', 'szerződés', 'kontraktus', 'deal'],
}

// Build reverse synonym map for efficient lookup
const buildReverseSynonymMap = () => {
  const reverseMap = new Map<string, string>()
  
  for (const [key, synonyms] of Object.entries(HUNGARIAN_SYNONYMS)) {
    reverseMap.set(key.toLowerCase(), key)
    for (const synonym of synonyms) {
      reverseMap.set(synonym.toLowerCase(), key)
    }
  }
  
  return reverseMap
}

const REVERSE_SYNONYM_MAP = buildReverseSynonymMap()

export interface SearchFilters {
  dateFrom?: string
  dateTo?: string
  speaker?: string
  minDuration?: number
  maxDuration?: number
  status?: 'completed' | 'processing' | 'failed'
}

export interface SearchResult {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: string
  summary?: string
  matchedSegments: Array<{
    text: string
    speaker?: string
    timestamp?: number
    relevance: number
  }>
  relevance: number
}

export class ContextualSearchService {
  /**
   * Expand search query with synonyms
   */
  private expandQueryWithSynonyms(query: string): string[] {
    const words = query.toLowerCase().split(/\s+/)
    const expandedTerms = new Set<string>()
    
    for (const word of words) {
      // Add original word
      expandedTerms.add(word)
      
      // Find base term if this is a synonym
      const baseTerm = REVERSE_SYNONYM_MAP.get(word)
      if (baseTerm) {
        expandedTerms.add(baseTerm)
        // Add all synonyms of the base term
        const synonyms = HUNGARIAN_SYNONYMS[baseTerm] || []
        synonyms.forEach(syn => expandedTerms.add(syn.toLowerCase()))
      }
    }
    
    return Array.from(expandedTerms)
  }

  /**
   * Search meetings with contextual understanding
   */
  async searchMeetings(
    organizationId: string,
    query: string,
    filters?: SearchFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ results: SearchResult[], total: number }> {
    const supabase = await createClient()
    
    // Expand query with synonyms
    const expandedTerms = this.expandQueryWithSynonyms(query)
    const searchPattern = expandedTerms.join('|')
    
    // Build base query
    let baseQuery = supabase
      .from('meetings')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
    
    // Apply filters
    if (filters?.status) {
      baseQuery = baseQuery.eq('status', filters.status)
    }
    if (filters?.dateFrom) {
      baseQuery = baseQuery.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      baseQuery = baseQuery.lte('created_at', filters.dateTo)
    }
    if (filters?.minDuration) {
      baseQuery = baseQuery.gte('duration_seconds', filters.minDuration)
    }
    if (filters?.maxDuration) {
      baseQuery = baseQuery.lte('duration_seconds', filters.maxDuration)
    }
    
    // Execute query
    const { data: meetings, error, count } = await baseQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      throw new Error(`Search failed: ${error.message}`)
    }
    
    // Score and filter results
    const results: SearchResult[] = []
    
    for (const meeting of meetings || []) {
      const matchedSegments = this.findMatchingSegments(
        meeting,
        expandedTerms,
        filters?.speaker
      )
      
      if (matchedSegments.length > 0) {
        const relevance = this.calculateRelevance(meeting, matchedSegments, expandedTerms)
        
        results.push({
          id: meeting.id,
          title: meeting.title,
          created_at: meeting.created_at,
          duration_seconds: meeting.duration_seconds,
          status: meeting.status,
          summary: meeting.summary,
          matchedSegments: matchedSegments.slice(0, 3), // Top 3 segments
          relevance
        })
      }
    }
    
    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance)
    
    return {
      results,
      total: count || 0
    }
  }

  /**
   * Find matching segments in transcript
   */
  private findMatchingSegments(
    meeting: {
      transcript?: {
        text?: string
        segments?: Array<{
          text: string
          speaker?: string
          start?: number
        }>
      }
      summary?: string
      action_items?: Array<{
        action: string
        assignee?: string
      }>
    },
    searchTerms: string[],
    speakerFilter?: string
  ): Array<{ text: string; speaker?: string; timestamp?: number; relevance: number }> {
    const segments: Array<{ text: string; speaker?: string; timestamp?: number; relevance: number }> = []
    
    // Search in transcript text
    if (meeting.transcript?.text) {
      const text = meeting.transcript.text.toLowerCase()
      const sentences = text.split(/[.!?]+/)
      
      for (const sentence of sentences) {
        let matchCount = 0
        let matchedTerms = new Set<string>()
        
        for (const term of searchTerms) {
          if (sentence.includes(term)) {
            matchCount++
            matchedTerms.add(term)
          }
        }
        
        if (matchCount > 0) {
          segments.push({
            text: sentence.trim(),
            relevance: matchCount / searchTerms.length
          })
        }
      }
    }
    
    // Search in transcript segments with speaker info
    if (meeting.transcript?.segments) {
      for (const segment of meeting.transcript.segments) {
        // Apply speaker filter if provided
        if (speakerFilter && segment.speaker !== speakerFilter) {
          continue
        }
        
        const segmentText = segment.text.toLowerCase()
        let matchCount = 0
        
        for (const term of searchTerms) {
          if (segmentText.includes(term)) {
            matchCount++
          }
        }
        
        if (matchCount > 0) {
          segments.push({
            text: segment.text,
            speaker: segment.speaker,
            timestamp: segment.start,
            relevance: matchCount / searchTerms.length
          })
        }
      }
    }
    
    // Search in summary
    if (meeting.summary) {
      const summaryLower = meeting.summary.toLowerCase()
      let matchCount = 0
      
      for (const term of searchTerms) {
        if (summaryLower.includes(term)) {
          matchCount++
        }
      }
      
      if (matchCount > 0) {
        segments.push({
          text: `[Összefoglaló] ${meeting.summary.substring(0, 200)}...`,
          relevance: (matchCount / searchTerms.length) * 0.8 // Slightly lower weight for summary
        })
      }
    }
    
    // Search in action items
    if (meeting.action_items && Array.isArray(meeting.action_items)) {
      for (const item of meeting.action_items) {
        const taskLower = item.task.toLowerCase()
        let matchCount = 0
        
        for (const term of searchTerms) {
          if (taskLower.includes(term)) {
            matchCount++
          }
        }
        
        if (matchCount > 0) {
          segments.push({
            text: `[Akció] ${item.task}`,
            speaker: item.assignee,
            relevance: (matchCount / searchTerms.length) * 0.9
          })
        }
      }
    }
    
    // Sort by relevance and return top segments
    return segments.sort((a, b) => b.relevance - a.relevance)
  }

  /**
   * Calculate overall relevance score
   */
  private calculateRelevance(
    meeting: any,
    matchedSegments: Array<{ relevance: number }>,
    searchTerms: string[]
  ): number {
    let score = 0
    
    // Average segment relevance (40% weight)
    const avgSegmentRelevance = matchedSegments.reduce((sum, seg) => sum + seg.relevance, 0) / matchedSegments.length
    score += avgSegmentRelevance * 0.4
    
    // Title match (30% weight)
    const titleLower = meeting.title.toLowerCase()
    let titleMatchCount = 0
    for (const term of searchTerms) {
      if (titleLower.includes(term)) {
        titleMatchCount++
      }
    }
    score += (titleMatchCount / searchTerms.length) * 0.3
    
    // Number of matched segments (20% weight)
    const segmentCountScore = Math.min(matchedSegments.length / 10, 1)
    score += segmentCountScore * 0.2
    
    // Intelligence score bonus (10% weight)
    if (meeting.intelligence_score) {
      score += (meeting.intelligence_score / 100) * 0.1
    }
    
    return Math.round(score * 100)
  }

  /**
   * Get unique speakers from meetings
   */
  async getSpeakers(organizationId: string): Promise<string[]> {
    const supabase = await createClient()
    
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('speakers')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
    
    if (error) {
      throw new Error(`Failed to fetch speakers: ${error.message}`)
    }
    
    const speakerSet = new Set<string>()
    
    for (const meeting of meetings || []) {
      if (meeting.speakers && Array.isArray(meeting.speakers)) {
        for (const speaker of meeting.speakers) {
          if (speaker.name) {
            speakerSet.add(speaker.name)
          }
        }
      }
    }
    
    return Array.from(speakerSet).sort()
  }
}

// Export singleton instance
export const searchService = new ContextualSearchService()