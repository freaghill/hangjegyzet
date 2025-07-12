import { createClient } from '@/lib/supabase/client'
import { VocabularyManager } from '@/lib/vocabulary/hungarian-business'

export interface AccuracyMetrics {
  transcriptionId: string
  organizationId: string
  meetingId: string
  wordErrorRate?: number
  characterErrorRate?: number
  vocabularyMatchRate: number
  confidenceScore: number
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor'
  duration: number
  passCount: number
  enhancementsApplied: boolean
  userCorrections: number
  timestamp: Date
}

export interface CorrectionFeedback {
  transcriptionId: string
  originalText: string
  correctedText: string
  corrections: Array<{
    start: number
    end: number
    original: string
    corrected: string
    type: 'spelling' | 'grammar' | 'vocabulary' | 'context' | 'other'
  }>
  userId: string
}

export interface AccuracyReport {
  organizationId: string
  period: {
    start: Date
    end: Date
  }
  totalTranscriptions: number
  averageWordErrorRate: number
  averageConfidence: number
  audioQualityDistribution: Record<string, number>
  commonErrors: Array<{
    original: string
    corrected: string
    frequency: number
  }>
  vocabularyPerformance: {
    totalTerms: number
    wellRecognized: string[]
    poorlyRecognized: string[]
    suggestions: string[]
  }
  recommendations: string[]
}

export class AccuracyMonitor {
  private supabase = createClient()
  private vocabularyManager: VocabularyManager

  constructor() {
    this.vocabularyManager = new VocabularyManager()
  }

  /**
   * Track accuracy metrics for a transcription
   */
  async trackTranscription(metrics: AccuracyMetrics): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('transcription_metrics')
        .insert({
          transcription_id: metrics.transcriptionId,
          organization_id: metrics.organizationId,
          meeting_id: metrics.meetingId,
          word_error_rate: metrics.wordErrorRate,
          character_error_rate: metrics.characterErrorRate,
          vocabulary_match_rate: metrics.vocabularyMatchRate,
          confidence_score: metrics.confidenceScore,
          audio_quality: metrics.audioQuality,
          duration_seconds: metrics.duration,
          pass_count: metrics.passCount,
          enhancements_applied: metrics.enhancementsApplied,
          user_corrections: metrics.userCorrections,
          created_at: metrics.timestamp
        })

      if (error) throw error

      // Update organization statistics
      await this.updateOrganizationStats(metrics.organizationId, metrics)
    } catch (error) {
      console.error('Error tracking transcription metrics:', error)
    }
  }

  /**
   * Record user corrections and learn from them
   */
  async recordCorrection(feedback: CorrectionFeedback): Promise<void> {
    try {
      // Store correction feedback
      const { data: correctionRecord, error: insertError } = await this.supabase
        .from('transcription_corrections')
        .insert({
          transcription_id: feedback.transcriptionId,
          original_text: feedback.originalText,
          corrected_text: feedback.correctedText,
          corrections: feedback.corrections,
          corrected_by: feedback.userId,
          created_at: new Date()
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Analyze corrections for patterns
      await this.analyzeCorrections(feedback)

      // Update transcription metrics
      await this.incrementUserCorrections(feedback.transcriptionId)

      // Learn from vocabulary corrections
      await this.learnVocabularyCorrections(feedback)
    } catch (error) {
      console.error('Error recording correction:', error)
    }
  }

  /**
   * Generate accuracy report for an organization
   */
  async generateReport(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AccuracyReport> {
    try {
      // Fetch metrics for the period
      const { data: metrics, error: metricsError } = await this.supabase
        .from('transcription_metrics')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (metricsError) throw metricsError

      // Fetch corrections for the period
      const { data: corrections, error: correctionsError } = await this.supabase
        .from('transcription_corrections')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (correctionsError) throw correctionsError

      // Calculate statistics
      const report = this.calculateReportStatistics(
        organizationId,
        metrics || [],
        corrections || [],
        startDate,
        endDate
      )

      // Get vocabulary performance
      const vocabularyPerf = await this.analyzeVocabularyPerformance(
        organizationId,
        corrections || []
      )

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        report,
        vocabularyPerf
      )

      return {
        ...report,
        vocabularyPerformance: vocabularyPerf,
        recommendations
      }
    } catch (error) {
      console.error('Error generating accuracy report:', error)
      throw error
    }
  }

  /**
   * Calculate WER (Word Error Rate) between original and corrected text
   */
  calculateWER(original: string, corrected: string): number {
    const originalWords = original.toLowerCase().split(/\s+/)
    const correctedWords = corrected.toLowerCase().split(/\s+/)

    // Levenshtein distance for words
    const distance = this.levenshteinDistance(originalWords, correctedWords)
    const wer = distance / originalWords.length

    return Math.min(wer, 1.0) // Cap at 100%
  }

  /**
   * Calculate CER (Character Error Rate)
   */
  calculateCER(original: string, corrected: string): number {
    const originalChars = original.toLowerCase().split('')
    const correctedChars = corrected.toLowerCase().split('')

    const distance = this.levenshteinDistance(originalChars, correctedChars)
    const cer = distance / originalChars.length

    return Math.min(cer, 1.0)
  }

  /**
   * Monitor real-time accuracy during transcription
   */
  async monitorRealTime(
    transcriptionId: string,
    segment: {
      text: string
      confidence?: number
      timestamp: number
    }
  ): Promise<{
    shouldEnhance: boolean
    confidenceWarning: boolean
    suggestions: string[]
  }> {
    const result = {
      shouldEnhance: false,
      confidenceWarning: false,
      suggestions: [] as string[]
    }

    // Check confidence
    if (segment.confidence && segment.confidence < 0.7) {
      result.confidenceWarning = true
      result.shouldEnhance = true
    }

    // Check for common error patterns
    const errorPatterns = await this.getCommonErrorPatterns()
    
    for (const pattern of errorPatterns) {
      if (segment.text.includes(pattern.original)) {
        result.suggestions.push(
          `Consider replacing "${pattern.original}" with "${pattern.corrected}"`
        )
      }
    }

    return result
  }

  /**
   * Private: Update organization statistics
   */
  private async updateOrganizationStats(
    organizationId: string,
    metrics: AccuracyMetrics
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_organization_accuracy_stats', {
        org_id: organizationId,
        new_confidence: metrics.confidenceScore,
        new_quality: metrics.audioQuality,
        new_duration: metrics.duration
      })

      if (error) throw error
    } catch (error) {
      console.error('Error updating organization stats:', error)
    }
  }

  /**
   * Private: Analyze corrections for patterns
   */
  private async analyzeCorrections(feedback: CorrectionFeedback): Promise<void> {
    // Group corrections by type
    const correctionsByType = feedback.corrections.reduce((acc, corr) => {
      if (!acc[corr.type]) acc[corr.type] = []
      acc[corr.type].push(corr)
      return acc
    }, {} as Record<string, typeof feedback.corrections>)

    // Store pattern analysis
    for (const [type, corrections] of Object.entries(correctionsByType)) {
      // Find repeated patterns
      const patterns = this.findRepeatedPatterns(corrections)
      
      if (patterns.length > 0) {
        await this.storeErrorPatterns(patterns, type)
      }
    }
  }

  /**
   * Private: Learn from vocabulary corrections
   */
  private async learnVocabularyCorrections(feedback: CorrectionFeedback): Promise<void> {
    const vocabularyCorrections = feedback.corrections.filter(
      c => c.type === 'vocabulary'
    )

    for (const correction of vocabularyCorrections) {
      // Extract organization ID from transcription
      const { data: transcription } = await this.supabase
        .from('transcriptions')
        .select('organization_id')
        .eq('id', feedback.transcriptionId)
        .single()

      if (transcription) {
        await this.vocabularyManager.learnFromCorrection(
          transcription.organization_id,
          null, // meeting ID if available
          correction.original,
          correction.corrected,
          feedback.userId
        )
      }
    }
  }

  /**
   * Private: Calculate report statistics
   */
  private calculateReportStatistics(
    organizationId: string,
    metrics: any[],
    corrections: any[],
    startDate: Date,
    endDate: Date
  ): Omit<AccuracyReport, 'vocabularyPerformance' | 'recommendations'> {
    const totalTranscriptions = metrics.length

    // Calculate averages
    const avgWER = metrics
      .filter(m => m.word_error_rate !== null)
      .reduce((sum, m) => sum + m.word_error_rate, 0) / totalTranscriptions || 0

    const avgConfidence = metrics
      .reduce((sum, m) => sum + m.confidence_score, 0) / totalTranscriptions || 0

    // Audio quality distribution
    const audioQualityDistribution = metrics.reduce((dist, m) => {
      dist[m.audio_quality] = (dist[m.audio_quality] || 0) + 1
      return dist
    }, {} as Record<string, number>)

    // Common errors from corrections
    const errorFrequency = new Map<string, { corrected: string; count: number }>()
    
    corrections.forEach(c => {
      c.corrections?.forEach((corr: any) => {
        const key = corr.original.toLowerCase()
        const existing = errorFrequency.get(key)
        
        if (existing) {
          existing.count++
        } else {
          errorFrequency.set(key, {
            corrected: corr.corrected,
            count: 1
          })
        }
      })
    })

    const commonErrors = Array.from(errorFrequency.entries())
      .map(([original, data]) => ({
        original,
        corrected: data.corrected,
        frequency: data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20)

    return {
      organizationId,
      period: { start: startDate, end: endDate },
      totalTranscriptions,
      averageWordErrorRate: avgWER,
      averageConfidence: avgConfidence,
      audioQualityDistribution,
      commonErrors
    }
  }

  /**
   * Private: Analyze vocabulary performance
   */
  private async analyzeVocabularyPerformance(
    organizationId: string,
    corrections: any[]
  ): Promise<AccuracyReport['vocabularyPerformance']> {
    const vocabulary = await this.vocabularyManager.getTerms(organizationId)
    
    // Track vocabulary term recognition
    const termPerformance = new Map<string, { recognized: number; missed: number }>()
    
    corrections.forEach(c => {
      c.corrections?.forEach((corr: any) => {
        vocabulary.forEach(term => {
          const termVariants = [term.term, ...(term.variations || [])]
          
          termVariants.forEach(variant => {
            if (corr.original.toLowerCase().includes(variant)) {
              // Term was in original but needed correction
              const perf = termPerformance.get(variant) || { recognized: 0, missed: 0 }
              perf.missed++
              termPerformance.set(variant, perf)
            } else if (corr.corrected.toLowerCase().includes(variant)) {
              // Term was correctly added in correction
              const perf = termPerformance.get(variant) || { recognized: 0, missed: 0 }
              perf.recognized++
              termPerformance.set(variant, perf)
            }
          })
        })
      })
    })

    // Categorize terms by performance
    const wellRecognized: string[] = []
    const poorlyRecognized: string[] = []
    
    termPerformance.forEach((perf, term) => {
      const recognitionRate = perf.recognized / (perf.recognized + perf.missed)
      
      if (recognitionRate > 0.8) {
        wellRecognized.push(term)
      } else if (recognitionRate < 0.5) {
        poorlyRecognized.push(term)
      }
    })

    // Generate suggestions for new terms based on corrections
    const suggestions = this.extractVocabularySuggestions(corrections)

    return {
      totalTerms: vocabulary.length,
      wellRecognized: wellRecognized.slice(0, 10),
      poorlyRecognized: poorlyRecognized.slice(0, 10),
      suggestions: suggestions.slice(0, 10)
    }
  }

  /**
   * Private: Generate recommendations
   */
  private generateRecommendations(
    report: Omit<AccuracyReport, 'vocabularyPerformance' | 'recommendations'>,
    vocabularyPerf: AccuracyReport['vocabularyPerformance']
  ): string[] {
    const recommendations: string[] = []

    // Audio quality recommendations
    const poorQualityRate = (report.audioQualityDistribution.poor || 0) / report.totalTranscriptions
    if (poorQualityRate > 0.2) {
      recommendations.push(
        'Consider improving audio recording setup. Over 20% of recordings have poor quality.'
      )
    }

    // Accuracy recommendations
    if (report.averageWordErrorRate > 0.15) {
      recommendations.push(
        'Average word error rate is high. Consider enabling multi-pass transcription.'
      )
    }

    // Confidence recommendations
    if (report.averageConfidence < 0.7) {
      recommendations.push(
        'Low average confidence scores. Enable enhanced post-processing for better results.'
      )
    }

    // Vocabulary recommendations
    if (vocabularyPerf.poorlyRecognized.length > 5) {
      recommendations.push(
        `Update phonetic hints for poorly recognized terms: ${vocabularyPerf.poorlyRecognized.slice(0, 3).join(', ')}`
      )
    }

    if (vocabularyPerf.suggestions.length > 0) {
      recommendations.push(
        `Consider adding these frequently corrected terms to vocabulary: ${vocabularyPerf.suggestions.slice(0, 3).join(', ')}`
      )
    }

    // Common error recommendations
    if (report.commonErrors.length > 0) {
      const topErrors = report.commonErrors.slice(0, 3).map(e => e.original).join(', ')
      recommendations.push(
        `Create automatic replacements for common errors: ${topErrors}`
      )
    }

    return recommendations
  }

  /**
   * Private: Levenshtein distance implementation
   */
  private levenshteinDistance(a: string[], b: string[]): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  /**
   * Private: Find repeated error patterns
   */
  private findRepeatedPatterns(
    corrections: Array<{ original: string; corrected: string }>
  ): Array<{ pattern: string; replacement: string; frequency: number }> {
    const patternMap = new Map<string, { replacement: string; count: number }>()

    corrections.forEach(corr => {
      const key = `${corr.original}→${corr.corrected}`
      const existing = patternMap.get(key)
      
      if (existing) {
        existing.count++
      } else {
        patternMap.set(key, {
          replacement: corr.corrected,
          count: 1
        })
      }
    })

    return Array.from(patternMap.entries())
      .filter(([_, data]) => data.count >= 2) // Only patterns that occur 2+ times
      .map(([pattern, data]) => {
        const [original] = pattern.split('→')
        return {
          pattern: original,
          replacement: data.replacement,
          frequency: data.count
        }
      })
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Private: Store error patterns
   */
  private async storeErrorPatterns(
    patterns: Array<{ pattern: string; replacement: string; frequency: number }>,
    type: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('error_patterns')
        .upsert(
          patterns.map(p => ({
            pattern: p.pattern,
            replacement: p.replacement,
            type,
            frequency: p.frequency,
            last_seen: new Date()
          })),
          { onConflict: 'pattern,type' }
        )

      if (error) throw error
    } catch (error) {
      console.error('Error storing error patterns:', error)
    }
  }

  /**
   * Private: Get common error patterns
   */
  private async getCommonErrorPatterns(): Promise<
    Array<{ original: string; corrected: string }>
  > {
    try {
      const { data, error } = await this.supabase
        .from('error_patterns')
        .select('pattern, replacement')
        .order('frequency', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map(p => ({
        original: p.pattern,
        corrected: p.replacement
      }))
    } catch (error) {
      console.error('Error fetching error patterns:', error)
      return []
    }
  }

  /**
   * Private: Extract vocabulary suggestions from corrections
   */
  private extractVocabularySuggestions(corrections: any[]): string[] {
    const termFrequency = new Map<string, number>()

    corrections.forEach(c => {
      c.corrections?.forEach((corr: any) => {
        if (corr.type === 'vocabulary' || corr.type === 'context') {
          // Extract words that were corrected TO (not from)
          const words = corr.corrected
            .toLowerCase()
            .split(/\s+/)
            .filter((w: string) => w.length > 3)

          words.forEach((word: string) => {
            termFrequency.set(word, (termFrequency.get(word) || 0) + 1)
          })
        }
      })
    })

    return Array.from(termFrequency.entries())
      .filter(([_, freq]) => freq >= 3) // Mentioned at least 3 times
      .sort((a, b) => b[1] - a[1])
      .map(([term]) => term)
  }

  /**
   * Private: Increment user corrections counter
   */
  private async incrementUserCorrections(transcriptionId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_user_corrections', {
        transcription_id: transcriptionId
      })

      if (error) throw error
    } catch (error) {
      console.error('Error incrementing user corrections:', error)
    }
  }
}

export const accuracyMonitor = new AccuracyMonitor()