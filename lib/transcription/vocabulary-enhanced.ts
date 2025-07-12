import { VocabularyManager, VocabularyTerm } from '@/lib/vocabulary/hungarian-business'

export class VocabularyEnhancedTranscription {
  private vocabularyManager: VocabularyManager
  private vocabularyCache: Map<string, VocabularyTerm[]> = new Map()
  private cacheExpiry = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.vocabularyManager = new VocabularyManager()
  }

  // Get vocabulary for an organization with caching
  private async getVocabulary(organizationId: string): Promise<VocabularyTerm[]> {
    const cacheKey = organizationId
    const cached = this.vocabularyCache.get(cacheKey)
    
    if (cached) {
      return cached
    }

    const terms = await this.vocabularyManager.getTerms(organizationId)
    this.vocabularyCache.set(cacheKey, terms)
    
    // Clear cache after expiry
    setTimeout(() => {
      this.vocabularyCache.delete(cacheKey)
    }, this.cacheExpiry)

    return terms
  }

  // Enhance transcription with custom vocabulary
  async enhanceTranscription(
    transcriptionText: string,
    organizationId: string,
    language = 'hu'
  ): Promise<string> {
    if (language !== 'hu') {
      return transcriptionText // Only process Hungarian for now
    }

    const vocabulary = await this.getVocabulary(organizationId)
    let enhancedText = transcriptionText

    // Sort by confidence score and usage count to prioritize better terms
    const sortedVocabulary = vocabulary.sort((a, b) => {
      const scoreA = a.confidence_score * (1 + Math.log(a.usage_count + 1))
      const scoreB = b.confidence_score * (1 + Math.log(b.usage_count + 1))
      return scoreB - scoreA
    })

    // Apply vocabulary replacements
    for (const term of sortedVocabulary) {
      // Create regex patterns for the term and its variations
      const patterns: RegExp[] = []
      
      // Main term pattern
      patterns.push(this.createPattern(term.term))
      
      // Variation patterns
      if (term.variations) {
        for (const variation of term.variations) {
          patterns.push(this.createPattern(variation))
        }
      }

      // Apply context-aware replacement
      for (const pattern of patterns) {
        enhancedText = this.applyContextAwareReplacement(
          enhancedText,
          pattern,
          term.term,
          term.context_hints || []
        )
      }
    }

    return enhancedText
  }

  // Create a flexible regex pattern for matching
  private createPattern(word: string): RegExp {
    // Escape special regex characters
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Create pattern that matches word boundaries and handles Hungarian characters
    // This pattern is case-insensitive and handles word boundaries
    return new RegExp(`\\b${escaped}\\b`, 'gi')
  }

  // Apply replacement considering context
  private applyContextAwareReplacement(
    text: string,
    pattern: RegExp,
    replacement: string,
    contextHints: string[]
  ): string {
    return text.replace(pattern, (match, offset) => {
      // If no context hints, always replace
      if (contextHints.length === 0) {
        return this.preserveCase(match, replacement)
      }

      // Check if any context hint appears near the match
      const contextWindow = 50 // characters before and after
      const start = Math.max(0, offset - contextWindow)
      const end = Math.min(text.length, offset + match.length + contextWindow)
      const contextText = text.substring(start, end).toLowerCase()

      const hasContext = contextHints.some(hint => 
        contextText.includes(hint.toLowerCase())
      )

      // Only replace if context matches
      if (hasContext) {
        return this.preserveCase(match, replacement)
      }

      return match
    })
  }

  // Preserve the case of the original match
  private preserveCase(original: string, replacement: string): string {
    if (original === original.toUpperCase()) {
      return replacement.toUpperCase()
    } else if (original[0] === original[0].toUpperCase()) {
      return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase()
    } else {
      return replacement.toLowerCase()
    }
  }

  // Generate custom vocabulary for speech recognition services
  async generateCustomVocabularyForSTT(
    organizationId: string,
    format: 'deepgram' | 'whisper' = 'deepgram'
  ): Promise<any> {
    const vocabulary = await this.getVocabulary(organizationId)
    
    if (format === 'deepgram') {
      // Deepgram custom vocabulary format
      const keywords = vocabulary.flatMap(term => {
        const words = [term.term]
        if (term.variations) {
          words.push(...term.variations)
        }
        return words
      })

      return {
        keywords: keywords.map(keyword => ({
          keyword,
          boost: 15 // Boost value for Deepgram
        }))
      }
    } else if (format === 'whisper') {
      // Whisper doesn't have direct custom vocabulary support
      // but we can use the vocabulary for post-processing
      return vocabulary.map(term => ({
        term: term.term,
        variations: term.variations || [],
        phonetic: term.phonetic_hint
      }))
    }

    return null
  }

  // Update vocabulary confidence based on transcription quality
  async updateVocabularyConfidence(
    organizationId: string,
    transcriptionId: string,
    corrections: Array<{ original: string; corrected: string }>
  ): Promise<void> {
    const vocabulary = await this.getVocabulary(organizationId)

    for (const correction of corrections) {
      // Find terms that were in the original or corrected text
      const originalWords = this.extractWords(correction.original)
      const correctedWords = this.extractWords(correction.corrected)

      for (const term of vocabulary) {
        const termWords = [term.term, ...(term.variations || [])]
        
        // Check if term was correctly recognized
        const wasInOriginal = termWords.some(w => 
          originalWords.includes(w.toLowerCase())
        )
        const wasInCorrected = termWords.some(w => 
          correctedWords.includes(w.toLowerCase())
        )

        if (wasInOriginal && wasInCorrected) {
          // Term was correctly recognized
          await this.vocabularyManager.updateTerm(term.id, {
            usage_count: term.usage_count + 1,
            confidence_score: Math.min(term.confidence_score + 0.1, 1.0)
          })
        } else if (!wasInOriginal && wasInCorrected) {
          // Term was missed but should have been there
          await this.vocabularyManager.updateTerm(term.id, {
            usage_count: term.usage_count + 1,
            confidence_score: Math.max(term.confidence_score - 0.05, 0.1)
          })
        }
      }
    }
  }

  // Extract words from text
  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-záéíóöőúüű\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  // Initialize default vocabulary for new organizations
  async initializeForOrganization(organizationId: string, userId: string): Promise<void> {
    await this.vocabularyManager.initializeDefaultVocabulary(organizationId, userId)
  }
}