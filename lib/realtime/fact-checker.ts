import { EventEmitter } from 'events'
import { createClient } from '@supabase/supabase-js'

interface TranscriptSegment {
  id: string
  meetingId: string
  speaker: string
  text: string
  startTime: number
  endTime: number
  confidence: number
}

interface FactCheckResult {
  id: string
  type: 'number' | 'commitment' | 'contradiction' | 'reference' | 'statistic' | 'date'
  severity: 'info' | 'warning' | 'error'
  originalStatement: string
  speaker: string
  issue: string
  suggestion: string
  evidence?: {
    source: string
    sourceType: 'database' | 'previous-meeting' | 'current-meeting' | 'calculation'
    data: any
  }
  timestamp: number
  confidence: number
}

interface Commitment {
  id: string
  description: string
  madeBy: string
  madeIn: string // meeting ID
  madeAt: Date
  deadline?: Date
  status: 'pending' | 'completed' | 'overdue'
}

interface NumberReference {
  value: number
  unit?: string
  context: string
  speaker: string
  timestamp: number
}

interface DateReference {
  date: Date
  context: string
  type: 'deadline' | 'meeting' | 'milestone' | 'general'
  speaker: string
  timestamp: number
}

export class FactChecker extends EventEmitter {
  private segments: TranscriptSegment[] = []
  private factCheckResults: FactCheckResult[] = []
  private numberReferences: Map<string, NumberReference[]> = new Map()
  private dateReferences: Map<string, DateReference[]> = new Map()
  private commitments: Map<string, Commitment> = new Map()
  private supabase: any
  
  // Patterns for detection
  private patterns = {
    numbers: /\b(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?)\s*(%|percent|százalék|euro|eur|forint|huf|ft|dollar|usd|\$|€)?/gi,
    dates: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}|next\s+\w+|jövő\s+\w+|tomorrow|holnap|yesterday|tegnap)/gi,
    commitments: /(?:will|going to|promise|commit|vállal|ígér|fog)\s+(.+?)(?:\.|,|$)/gi,
    statistics: /\b(\d+\.?\d*)\s*(%|percent|százalék)\s+(?:of|from|az?)\s+(.+?)(?:\.|,|$)/gi,
    comparisons: /(?:more|less|increase|decrease|növekedés|csökkenés|több|kevesebb)\s+(?:than|mint)\s+(.+?)(?:\.|,|$)/gi
  }
  
  // Common calculation errors
  private calculationPatterns = {
    percentage: /(\d+)\s*%\s*of\s*(\d+)/gi,
    sum: /(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)/gi,
    difference: /(\d+)\s*-\s*(\d+)\s*=\s*(\d+)/gi,
    multiplication: /(\d+)\s*[x\*×]\s*(\d+)\s*=\s*(\d+)/gi
  }
  
  constructor() {
    super()
    this.initializeSupabase()
    this.startPeriodicChecks()
  }
  
  private initializeSupabase(): void {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }
  }
  
  public async processSegment(segment: TranscriptSegment): Promise<void> {
    this.segments.push(segment)
    
    // Real-time fact checking
    await Promise.all([
      this.checkNumbers(segment),
      this.checkDates(segment),
      this.checkCommitments(segment),
      this.checkStatistics(segment),
      this.checkContradictions(segment),
      this.checkCalculations(segment)
    ])
    
    // Maintain buffer size
    if (this.segments.length > 1000) {
      this.segments = this.segments.slice(-500)
    }
  }
  
  private async checkNumbers(segment: TranscriptSegment): Promise<void> {
    const matches = [...segment.text.matchAll(this.patterns.numbers)]
    
    for (const match of matches) {
      const value = this.parseNumber(match[1])
      const unit = match[2] || ''
      
      const reference: NumberReference = {
        value,
        unit,
        context: this.extractContext(segment.text, match.index || 0),
        speaker: segment.speaker,
        timestamp: segment.startTime
      }
      
      // Store reference
      const key = `${segment.meetingId}-numbers`
      const refs = this.numberReferences.get(key) || []
      refs.push(reference)
      this.numberReferences.set(key, refs)
      
      // Check for inconsistencies with previous references
      await this.verifyNumberConsistency(reference, segment)
      
      // Check against database if relevant
      await this.verifyNumberAgainstDatabase(reference, segment)
    }
  }
  
  private async checkDates(segment: TranscriptSegment): Promise<void> {
    const matches = [...segment.text.matchAll(this.patterns.dates)]
    
    for (const match of matches) {
      const dateStr = match[1]
      const date = this.parseDate(dateStr)
      
      if (date) {
        const reference: DateReference = {
          date,
          context: this.extractContext(segment.text, match.index || 0),
          type: this.classifyDateType(segment.text, match.index || 0),
          speaker: segment.speaker,
          timestamp: segment.startTime
        }
        
        // Store reference
        const key = `${segment.meetingId}-dates`
        const refs = this.dateReferences.get(key) || []
        refs.push(reference)
        this.dateReferences.set(key, refs)
        
        // Check for inconsistencies
        await this.verifyDateConsistency(reference, segment)
        
        // Check if deadline is realistic
        this.checkDeadlineRealism(reference, segment)
      }
    }
  }
  
  private async checkCommitments(segment: TranscriptSegment): Promise<void> {
    const matches = [...segment.text.matchAll(this.patterns.commitments)]
    
    for (const match of matches) {
      const commitmentText = match[1]
      
      // Check if this matches any previous commitments
      await this.verifyCommitmentHistory(commitmentText, segment)
      
      // Store new commitment
      const commitment: Commitment = {
        id: `commit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: commitmentText,
        madeBy: segment.speaker,
        madeIn: segment.meetingId,
        madeAt: new Date(),
        status: 'pending'
      }
      
      // Extract deadline if mentioned
      const deadline = this.extractDeadlineFromText(commitmentText)
      if (deadline) {
        commitment.deadline = deadline
      }
      
      this.commitments.set(commitment.id, commitment)
      this.emit('commitment:detected', commitment)
    }
  }
  
  private async checkStatistics(segment: TranscriptSegment): Promise<void> {
    const matches = [...segment.text.matchAll(this.patterns.statistics)]
    
    for (const match of matches) {
      const percentage = parseFloat(match[1])
      const context = match[3]
      
      // Basic sanity check
      if (percentage > 100) {
        this.generateFactCheckResult({
          type: 'statistic',
          severity: 'error',
          originalStatement: match[0],
          speaker: segment.speaker,
          issue: `Percentage exceeds 100% (${percentage}%)`,
          suggestion: 'Verify the percentage value - it cannot exceed 100%',
          confidence: 1.0
        }, segment)
      }
      
      // Check against known statistics if available
      await this.verifyStatisticAgainstDatabase(percentage, context, segment)
    }
  }
  
  private async checkContradictions(segment: TranscriptSegment): Promise<void> {
    // Check for contradictions within current meeting
    const recentSegments = this.segments.slice(-50)
    
    for (const prevSegment of recentSegments) {
      if (prevSegment.id === segment.id) continue
      
      const contradiction = this.detectContradiction(prevSegment.text, segment.text)
      if (contradiction) {
        this.generateFactCheckResult({
          type: 'contradiction',
          severity: 'warning',
          originalStatement: segment.text,
          speaker: segment.speaker,
          issue: `Statement contradicts earlier statement by ${prevSegment.speaker}`,
          suggestion: 'Clarify which statement is correct',
          evidence: {
            source: 'current-meeting',
            sourceType: 'current-meeting',
            data: {
              originalStatement: prevSegment.text,
              originalSpeaker: prevSegment.speaker,
              timestamp: prevSegment.startTime
            }
          },
          confidence: contradiction.confidence
        }, segment)
      }
    }
    
    // Check against previous meetings if available
    if (this.supabase) {
      await this.checkContradictionsAgainstHistory(segment)
    }
  }
  
  private checkCalculations(segment: TranscriptSegment): void {
    // Check percentage calculations
    const percentMatches = [...segment.text.matchAll(this.calculationPatterns.percentage)]
    for (const match of percentMatches) {
      const percentage = parseFloat(match[1])
      const total = parseFloat(match[2])
      const expectedValue = (percentage / 100) * total
      
      // Look for the stated result nearby
      const resultPattern = new RegExp(`${match[0]}.*?(\\d+(?:[,.]\\d+)?)`, 'i')
      const resultMatch = segment.text.match(resultPattern)
      
      if (resultMatch) {
        const statedResult = this.parseNumber(resultMatch[1])
        if (Math.abs(statedResult - expectedValue) > 0.01) {
          this.generateFactCheckResult({
            type: 'number',
            severity: 'error',
            originalStatement: resultMatch[0],
            speaker: segment.speaker,
            issue: `Calculation error: ${percentage}% of ${total} is ${expectedValue}, not ${statedResult}`,
            suggestion: `Correct calculation: ${percentage}% of ${total} = ${expectedValue}`,
            evidence: {
              source: 'calculation',
              sourceType: 'calculation',
              data: { percentage, total, expected: expectedValue, stated: statedResult }
            },
            confidence: 1.0
          }, segment)
        }
      }
    }
    
    // Check basic arithmetic
    const patterns = [
      { pattern: this.calculationPatterns.sum, operation: (a: number, b: number) => a + b, name: 'addition' },
      { pattern: this.calculationPatterns.difference, operation: (a: number, b: number) => a - b, name: 'subtraction' },
      { pattern: this.calculationPatterns.multiplication, operation: (a: number, b: number) => a * b, name: 'multiplication' }
    ]
    
    for (const { pattern, operation, name } of patterns) {
      const matches = [...segment.text.matchAll(pattern)]
      for (const match of matches) {
        const a = this.parseNumber(match[1])
        const b = this.parseNumber(match[2])
        const stated = this.parseNumber(match[3])
        const expected = operation(a, b)
        
        if (Math.abs(stated - expected) > 0.01) {
          this.generateFactCheckResult({
            type: 'number',
            severity: 'error',
            originalStatement: match[0],
            speaker: segment.speaker,
            issue: `${name} error: ${match[0]}`,
            suggestion: `Correct ${name}: ${a} ${match[0].includes('+') ? '+' : match[0].includes('*') || match[0].includes('x') ? '×' : '-'} ${b} = ${expected}`,
            evidence: {
              source: 'calculation',
              sourceType: 'calculation',
              data: { a, b, expected, stated }
            },
            confidence: 1.0
          }, segment)
        }
      }
    }
  }
  
  private async verifyNumberConsistency(reference: NumberReference, segment: TranscriptSegment): Promise<void> {
    const key = `${segment.meetingId}-numbers`
    const previousRefs = this.numberReferences.get(key) || []
    
    // Look for similar contexts
    for (const prevRef of previousRefs.slice(0, -1)) { // Exclude current reference
      if (this.isSimilarContext(prevRef.context, reference.context)) {
        const difference = Math.abs(prevRef.value - reference.value)
        const percentDiff = (difference / prevRef.value) * 100
        
        if (percentDiff > 10 && prevRef.unit === reference.unit) {
          this.generateFactCheckResult({
            type: 'number',
            severity: 'warning',
            originalStatement: `${reference.value}${reference.unit || ''}`,
            speaker: segment.speaker,
            issue: `Number differs from earlier reference: ${prevRef.value}${prevRef.unit || ''} mentioned by ${prevRef.speaker}`,
            suggestion: 'Verify which number is correct',
            evidence: {
              source: 'current-meeting',
              sourceType: 'current-meeting',
              data: {
                previousValue: prevRef.value,
                previousSpeaker: prevRef.speaker,
                difference: percentDiff.toFixed(1) + '%'
              }
            },
            confidence: 0.8
          }, segment)
        }
      }
    }
  }
  
  private async verifyNumberAgainstDatabase(reference: NumberReference, segment: TranscriptSegment): Promise<void> {
    if (!this.supabase) return
    
    // Check if number relates to known metrics (revenue, headcount, etc.)
    const metricKeywords = ['revenue', 'árbevétel', 'headcount', 'létszám', 'budget', 'költségvetés']
    const hasMetricKeyword = metricKeywords.some(kw => reference.context.toLowerCase().includes(kw))
    
    if (hasMetricKeyword) {
      try {
        // Query historical data
        const { data: historicalData } = await this.supabase
          .from('meeting_metrics')
          .select('value, metric_type, meeting_id, created_at')
          .ilike('context', `%${reference.context}%`)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (historicalData && historicalData.length > 0) {
          const latest = historicalData[0]
          const difference = Math.abs(latest.value - reference.value)
          const percentDiff = (difference / latest.value) * 100
          
          if (percentDiff > 20) {
            this.generateFactCheckResult({
              type: 'number',
              severity: 'info',
              originalStatement: `${reference.value}${reference.unit || ''}`,
              speaker: segment.speaker,
              issue: `Number differs significantly from last recorded value: ${latest.value}`,
              suggestion: 'Confirm if this represents an actual change or an error',
              evidence: {
                source: 'database',
                sourceType: 'database',
                data: {
                  previousValue: latest.value,
                  meetingId: latest.meeting_id,
                  date: latest.created_at,
                  percentChange: percentDiff.toFixed(1) + '%'
                }
              },
              confidence: 0.7
            }, segment)
          }
        }
      } catch (error) {
        console.error('Error checking number against database:', error)
      }
    }
  }
  
  private async verifyDateConsistency(reference: DateReference, segment: TranscriptSegment): Promise<void> {
    const key = `${segment.meetingId}-dates`
    const previousRefs = this.dateReferences.get(key) || []
    
    for (const prevRef of previousRefs.slice(0, -1)) {
      if (this.isSimilarContext(prevRef.context, reference.context)) {
        const daysDiff = Math.abs(reference.date.getTime() - prevRef.date.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysDiff > 0) {
          this.generateFactCheckResult({
            type: 'date',
            severity: 'warning',
            originalStatement: this.formatDate(reference.date),
            speaker: segment.speaker,
            issue: `Date differs from earlier reference: ${this.formatDate(prevRef.date)} mentioned by ${prevRef.speaker}`,
            suggestion: 'Clarify which date is correct',
            evidence: {
              source: 'current-meeting',
              sourceType: 'current-meeting',
              data: {
                previousDate: this.formatDate(prevRef.date),
                previousSpeaker: prevRef.speaker,
                daysDifference: Math.round(daysDiff)
              }
            },
            confidence: 0.9
          }, segment)
        }
      }
    }
  }
  
  private checkDeadlineRealism(reference: DateReference, segment: TranscriptSegment): void {
    if (reference.type !== 'deadline') return
    
    const now = new Date()
    const daysUntilDeadline = (reference.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysUntilDeadline < 0) {
      this.generateFactCheckResult({
        type: 'date',
        severity: 'error',
        originalStatement: this.formatDate(reference.date),
        speaker: segment.speaker,
        issue: 'Deadline is in the past',
        suggestion: 'Set a future date for the deadline',
        confidence: 1.0
      }, segment)
    } else if (daysUntilDeadline < 1) {
      this.generateFactCheckResult({
        type: 'date',
        severity: 'warning',
        originalStatement: this.formatDate(reference.date),
        speaker: segment.speaker,
        issue: 'Deadline is less than 24 hours away',
        suggestion: 'Confirm if this timeline is realistic',
        confidence: 0.9
      }, segment)
    }
  }
  
  private async verifyCommitmentHistory(commitmentText: string, segment: TranscriptSegment): Promise<void> {
    if (!this.supabase) return
    
    try {
      // Search for similar commitments in history
      const { data: previousCommitments } = await this.supabase
        .from('commitments')
        .select('description, made_by, made_at, status, deadline')
        .textSearch('description', commitmentText.split(' ').slice(0, 5).join(' '))
        .limit(5)
      
      if (previousCommitments && previousCommitments.length > 0) {
        for (const prev of previousCommitments) {
          if (prev.status === 'pending' && prev.deadline && new Date(prev.deadline) < new Date()) {
            this.generateFactCheckResult({
              type: 'commitment',
              severity: 'warning',
              originalStatement: commitmentText,
              speaker: segment.speaker,
              issue: `Similar overdue commitment exists: "${prev.description}"`,
              suggestion: 'Address the previous commitment before making new ones',
              evidence: {
                source: 'database',
                sourceType: 'database',
                data: {
                  previousCommitment: prev.description,
                  madeBy: prev.made_by,
                  madeAt: prev.made_at,
                  deadline: prev.deadline,
                  status: prev.status
                }
              },
              confidence: 0.7
            }, segment)
          }
        }
      }
    } catch (error) {
      console.error('Error checking commitment history:', error)
    }
  }
  
  private async verifyStatisticAgainstDatabase(percentage: number, context: string, segment: TranscriptSegment): Promise<void> {
    if (!this.supabase) return
    
    try {
      // Search for similar statistics in previous meetings
      const { data: previousStats } = await this.supabase
        .from('meeting_statistics')
        .select('value, context, meeting_id, created_at')
        .textSearch('context', context)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
        .limit(5)
      
      if (previousStats && previousStats.length > 0) {
        const avgValue = previousStats.reduce((sum, stat) => sum + stat.value, 0) / previousStats.length
        const difference = Math.abs(percentage - avgValue)
        
        if (difference > 10) {
          this.generateFactCheckResult({
            type: 'statistic',
            severity: 'info',
            originalStatement: `${percentage}%`,
            speaker: segment.speaker,
            issue: `Statistic differs from historical average: ${avgValue.toFixed(1)}%`,
            suggestion: 'Verify if this represents a real change or a mistake',
            evidence: {
              source: 'database',
              sourceType: 'database',
              data: {
                historicalAverage: avgValue.toFixed(1),
                sampleSize: previousStats.length,
                difference: difference.toFixed(1) + ' percentage points'
              }
            },
            confidence: 0.6
          }, segment)
        }
      }
    } catch (error) {
      console.error('Error checking statistic against database:', error)
    }
  }
  
  private async checkContradictionsAgainstHistory(segment: TranscriptSegment): Promise<void> {
    try {
      // Search for related statements in previous meetings
      const keywords = this.extractKeywords(segment.text)
      
      const { data: previousStatements } = await this.supabase
        .from('meeting_transcripts')
        .select('text, speaker, meeting_id, created_at')
        .textSearch('text', keywords.join(' '))
        .neq('meeting_id', segment.meetingId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .limit(10)
      
      if (previousStatements) {
        for (const prev of previousStatements) {
          const contradiction = this.detectContradiction(prev.text, segment.text)
          if (contradiction && contradiction.confidence > 0.7) {
            this.generateFactCheckResult({
              type: 'contradiction',
              severity: 'info',
              originalStatement: segment.text,
              speaker: segment.speaker,
              issue: `Statement may contradict previous statement in another meeting`,
              suggestion: 'Review previous discussion for consistency',
              evidence: {
                source: 'previous-meeting',
                sourceType: 'previous-meeting',
                data: {
                  previousStatement: prev.text,
                  previousSpeaker: prev.speaker,
                  meetingId: prev.meeting_id,
                  date: prev.created_at
                }
              },
              confidence: contradiction.confidence
            }, segment)
          }
        }
      }
    } catch (error) {
      console.error('Error checking contradictions against history:', error)
    }
  }
  
  private detectContradiction(text1: string, text2: string): { confidence: number } | null {
    // Simple contradiction detection based on negation patterns
    const negationPatterns = [
      { positive: /will\s+(\w+)/i, negative: /will\s+not\s+\1/i },
      { positive: /is\s+(\w+)/i, negative: /is\s+not\s+\1/i },
      { positive: /fog\s+(\w+)/i, negative: /nem\s+fog\s+\1/i },
      { positive: /igen/i, negative: /nem/i },
      { positive: /yes/i, negative: /no/i }
    ]
    
    for (const pattern of negationPatterns) {
      if (pattern.positive.test(text1) && pattern.negative.test(text2)) {
        return { confidence: 0.8 }
      }
      if (pattern.negative.test(text1) && pattern.positive.test(text2)) {
        return { confidence: 0.8 }
      }
    }
    
    // Check for opposite terms
    const opposites = [
      ['increase', 'decrease'], ['növekedés', 'csökkenés'],
      ['up', 'down'], ['fel', 'le'],
      ['more', 'less'], ['több', 'kevesebb'],
      ['before', 'after'], ['előtt', 'után']
    ]
    
    for (const [term1, term2] of opposites) {
      if (text1.includes(term1) && text2.includes(term2)) {
        return { confidence: 0.6 }
      }
      if (text1.includes(term2) && text2.includes(term1)) {
        return { confidence: 0.6 }
      }
    }
    
    return null
  }
  
  private generateFactCheckResult(
    result: Omit<FactCheckResult, 'id' | 'timestamp'>,
    segment: TranscriptSegment
  ): void {
    const factCheckResult: FactCheckResult = {
      ...result,
      id: `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: segment.startTime
    }
    
    this.factCheckResults.push(factCheckResult)
    this.emit('fact-check:result', factCheckResult)
    
    // Keep results manageable
    if (this.factCheckResults.length > 100) {
      this.factCheckResults = this.factCheckResults.slice(-50)
    }
  }
  
  private parseNumber(str: string): number {
    // Remove thousand separators and convert decimal comma to dot
    const cleaned = str.replace(/[\s,]/g, '').replace(',', '.')
    return parseFloat(cleaned)
  }
  
  private parseDate(str: string): Date | null {
    const now = new Date()
    const lowerStr = str.toLowerCase()
    
    // Handle relative dates
    if (lowerStr.includes('tomorrow') || lowerStr.includes('holnap')) {
      const date = new Date(now)
      date.setDate(date.getDate() + 1)
      return date
    }
    
    if (lowerStr.includes('yesterday') || lowerStr.includes('tegnap')) {
      const date = new Date(now)
      date.setDate(date.getDate() - 1)
      return date
    }
    
    if (lowerStr.includes('next week') || lowerStr.includes('jövő hét')) {
      const date = new Date(now)
      date.setDate(date.getDate() + 7)
      return date
    }
    
    // Try parsing absolute dates
    const date = new Date(str)
    return isNaN(date.getTime()) ? null : date
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('hu-HU')
  }
  
  private extractContext(text: string, position: number, windowSize: number = 50): string {
    const start = Math.max(0, position - windowSize)
    const end = Math.min(text.length, position + windowSize)
    return text.substring(start, end).trim()
  }
  
  private isSimilarContext(context1: string, context2: string): boolean {
    const words1 = context1.toLowerCase().split(/\s+/)
    const words2 = context2.toLowerCase().split(/\s+/)
    
    const commonWords = words1.filter(w => words2.includes(w) && w.length > 3)
    const similarity = commonWords.length / Math.min(words1.length, words2.length)
    
    return similarity > 0.5
  }
  
  private classifyDateType(text: string, position: number): DateReference['type'] {
    const context = this.extractContext(text, position, 100).toLowerCase()
    
    if (context.includes('deadline') || context.includes('határidő')) {
      return 'deadline'
    }
    if (context.includes('meeting') || context.includes('találkozó')) {
      return 'meeting'
    }
    if (context.includes('milestone') || context.includes('mérföldkő')) {
      return 'milestone'
    }
    
    return 'general'
  }
  
  private extractDeadlineFromText(text: string): Date | null {
    const dateMatch = text.match(this.patterns.dates)
    if (dateMatch) {
      return this.parseDate(dateMatch[1])
    }
    return null
  }
  
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
    
    return words
      .filter(w => w.length > 3 && !stopWords.includes(w))
      .slice(0, 5)
  }
  
  private startPeriodicChecks(): void {
    // Periodic commitment status check
    setInterval(() => {
      this.checkOverdueCommitments()
    }, 300000) // Every 5 minutes
  }
  
  private checkOverdueCommitments(): void {
    const now = new Date()
    
    for (const commitment of this.commitments.values()) {
      if (commitment.status === 'pending' && commitment.deadline && commitment.deadline < now) {
        commitment.status = 'overdue'
        this.emit('commitment:overdue', commitment)
      }
    }
  }
  
  public getResults(type?: FactCheckResult['type']): FactCheckResult[] {
    let results = this.factCheckResults
    
    if (type) {
      results = results.filter(r => r.type === type)
    }
    
    return results.sort((a, b) => {
      // Sort by severity and recency
      const severityWeight = { error: 3, warning: 2, info: 1 }
      const aScore = severityWeight[a.severity] * 1000 + a.timestamp
      const bScore = severityWeight[b.severity] * 1000 + b.timestamp
      return bScore - aScore
    })
  }
  
  public getCommitments(): Commitment[] {
    return Array.from(this.commitments.values())
  }
  
  public resolveFactCheck(factCheckId: string): void {
    this.factCheckResults = this.factCheckResults.filter(r => r.id !== factCheckId)
    this.emit('fact-check:resolved', factCheckId)
  }
  
  public updateCommitmentStatus(commitmentId: string, status: Commitment['status']): void {
    const commitment = this.commitments.get(commitmentId)
    if (commitment) {
      commitment.status = status
      this.emit('commitment:updated', commitment)
    }
  }
  
  public reset(): void {
    this.segments = []
    this.factCheckResults = []
    this.numberReferences.clear()
    this.dateReferences.clear()
    this.commitments.clear()
  }
  
  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

// Export singleton instance
let factChecker: FactChecker | null = null

export function getFactChecker(): FactChecker {
  if (!factChecker) {
    factChecker = new FactChecker()
  }
  return factChecker
}