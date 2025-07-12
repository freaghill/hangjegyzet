import { EventEmitter } from 'events'

interface TranscriptSegment {
  id: string
  meetingId: string
  text: string
  speaker: string
  startTime: number
  endTime: number
  confidence: number
}

interface ConversationPattern {
  type: 'question-answer' | 'debate' | 'brainstorming' | 'decision-making' | 'information-sharing'
  confidence: number
  segments: string[]
}

interface KeywordFrequency {
  keyword: string
  count: number
  speakers: string[]
  contexts: { text: string; speaker: string; timestamp: number }[]
}

interface TopicDwellTime {
  topic: string
  totalTime: number
  segments: number
  speakers: string[]
  startTime: number
  endTime: number
}

interface ParticipantInteraction {
  participant1: string
  participant2: string
  interactionCount: number
  responseTime: number // Average response time in ms
  topics: string[]
}

interface MeetingEnergyPoint {
  timestamp: number
  energy: number
  contributingFactors: string[]
}

interface RealtimeInsight {
  id: string
  type: 'pattern' | 'keyword' | 'dynamics' | 'energy' | 'interaction' | 'topic'
  title: string
  description: string
  importance: 'low' | 'medium' | 'high'
  data: any
  timestamp: number
}

interface InsightSummary {
  patterns: ConversationPattern[]
  keywordFrequencies: KeywordFrequency[]
  topicDwellTimes: TopicDwellTime[]
  participantInteractions: ParticipantInteraction[]
  energyTimeline: MeetingEnergyPoint[]
  conversationDynamics: {
    monologuePercentage: number
    dialoguePercentage: number
    averageTurnLength: number
    longestMonologue: { speaker: string; duration: number }
  }
}

export class InsightGenerator extends EventEmitter {
  private segmentBuffer: TranscriptSegment[] = []
  private insights: RealtimeInsight[] = []
  private keywordTracking: Map<string, KeywordFrequency> = new Map()
  private topicTracking: Map<string, TopicDwellTime> = new Map()
  private interactionMatrix: Map<string, ParticipantInteraction> = new Map()
  private energyTimeline: MeetingEnergyPoint[] = []
  private lastSpeaker: { speaker: string; timestamp: number } | null = null
  
  // Important keywords to track (Hungarian and English)
  private trackedKeywords = [
    // Business terms
    'projekt', 'project', 'határidő', 'deadline', 'költségvetés', 'budget',
    'feladat', 'task', 'cél', 'goal', 'stratégia', 'strategy',
    // Decision terms
    'döntés', 'decision', 'javaslat', 'proposal', 'megoldás', 'solution',
    'probléma', 'problem', 'kihívás', 'challenge',
    // Action terms
    'következő lépés', 'next step', 'teendő', 'action item', 'felelős', 'responsible',
    // Meeting terms
    'összefoglalva', 'summary', 'kérdés', 'question', 'válasz', 'answer'
  ]
  
  // Pattern detection keywords
  private patternKeywords = {
    'question-answer': ['?', 'kérdés', 'question', 'mi', 'hogyan', 'miért', 'what', 'how', 'why'],
    'debate': ['viszont', 'azonban', 'but', 'however', 'nem értek egyet', 'disagree'],
    'brainstorming': ['ötlet', 'idea', 'mi lenne ha', 'what if', 'próbáljuk', 'let\'s try'],
    'decision-making': ['döntés', 'decision', 'szavazás', 'vote', 'megállapodtunk', 'agreed'],
    'information-sharing': ['tájékoztat', 'inform', 'jelentem', 'report', 'beszámoló', 'update']
  }
  
  constructor() {
    super()
    this.startInsightGeneration()
  }
  
  // Add segment and generate insights
  public addSegment(segment: TranscriptSegment): void {
    this.segmentBuffer.push(segment)
    
    // Track keywords
    this.trackKeywords(segment)
    
    // Track topics and dwell time
    this.trackTopics(segment)
    
    // Track interactions
    this.trackInteractions(segment)
    
    // Update energy timeline
    this.updateEnergyTimeline(segment)
    
    // Detect patterns
    this.detectPatterns()
    
    // Keep buffer size manageable
    if (this.segmentBuffer.length > 1000) {
      this.segmentBuffer = this.segmentBuffer.slice(-500)
    }
  }
  
  // Track keyword frequencies
  private trackKeywords(segment: TranscriptSegment): void {
    const words = segment.text.toLowerCase().split(/\s+/)
    
    for (const keyword of this.trackedKeywords) {
      if (segment.text.toLowerCase().includes(keyword.toLowerCase())) {
        const existing = this.keywordTracking.get(keyword) || {
          keyword,
          count: 0,
          speakers: [],
          contexts: []
        }
        
        existing.count++
        if (!existing.speakers.includes(segment.speaker)) {
          existing.speakers.push(segment.speaker)
        }
        
        existing.contexts.push({
          text: segment.text,
          speaker: segment.speaker,
          timestamp: segment.startTime
        })
        
        // Keep only recent contexts
        if (existing.contexts.length > 10) {
          existing.contexts = existing.contexts.slice(-10)
        }
        
        this.keywordTracking.set(keyword, existing)
        
        // Generate insight if keyword mentioned multiple times
        if (existing.count === 3 || existing.count === 5 || existing.count === 10) {
          this.generateKeywordInsight(existing)
        }
      }
    }
  }
  
  // Track topic dwell times
  private trackTopics(segment: TranscriptSegment): void {
    const topics = this.extractTopics(segment.text)
    
    for (const topic of topics) {
      const existing = this.topicTracking.get(topic) || {
        topic,
        totalTime: 0,
        segments: 0,
        speakers: [],
        startTime: segment.startTime,
        endTime: segment.endTime
      }
      
      existing.totalTime += segment.endTime - segment.startTime
      existing.segments++
      existing.endTime = segment.endTime
      
      if (!existing.speakers.includes(segment.speaker)) {
        existing.speakers.push(segment.speaker)
      }
      
      this.topicTracking.set(topic, existing)
    }
  }
  
  // Extract topics from text
  private extractTopics(text: string): string[] {
    const topics: string[] = []
    const lowerText = text.toLowerCase()
    
    // Topic detection based on keywords
    const topicMap = {
      'budget': ['budget', 'költségvetés', 'pénz', 'money', 'ár', 'price'],
      'timeline': ['deadline', 'határidő', 'időpont', 'when', 'mikor'],
      'technical': ['technical', 'technikai', 'fejlesztés', 'development', 'kód', 'code'],
      'team': ['team', 'csapat', 'kolléga', 'colleague', 'ember', 'people'],
      'planning': ['terv', 'plan', 'stratégia', 'strategy', 'roadmap'],
      'risk': ['kockázat', 'risk', 'probléma', 'problem', 'akadály', 'obstacle']
    }
    
    for (const [topic, keywords] of Object.entries(topicMap)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        topics.push(topic)
      }
    }
    
    return topics
  }
  
  // Track participant interactions
  private trackInteractions(segment: TranscriptSegment): void {
    if (this.lastSpeaker && this.lastSpeaker.speaker !== segment.speaker) {
      const key = [this.lastSpeaker.speaker, segment.speaker].sort().join('-')
      
      const existing = this.interactionMatrix.get(key) || {
        participant1: this.lastSpeaker.speaker,
        participant2: segment.speaker,
        interactionCount: 0,
        responseTime: 0,
        topics: []
      }
      
      existing.interactionCount++
      
      // Calculate response time
      const responseTime = segment.startTime - this.lastSpeaker.timestamp
      existing.responseTime = (existing.responseTime * (existing.interactionCount - 1) + responseTime) / existing.interactionCount
      
      // Add current topics
      const topics = this.extractTopics(segment.text)
      for (const topic of topics) {
        if (!existing.topics.includes(topic)) {
          existing.topics.push(topic)
        }
      }
      
      this.interactionMatrix.set(key, existing)
    }
    
    this.lastSpeaker = {
      speaker: segment.speaker,
      timestamp: segment.endTime
    }
  }
  
  // Update energy timeline
  private updateEnergyTimeline(segment: TranscriptSegment): void {
    const energy = this.calculateSegmentEnergy(segment)
    const factors: string[] = []
    
    // Identify contributing factors
    if (segment.text.includes('!')) factors.push('exclamation')
    if (segment.text.includes('?')) factors.push('question')
    if (segment.text.split(/\s+/).length > 30) factors.push('long_statement')
    if (this.detectLaughter(segment.text)) factors.push('laughter')
    if (this.detectDisagreement(segment.text)) factors.push('disagreement')
    
    this.energyTimeline.push({
      timestamp: segment.startTime,
      energy,
      contributingFactors: factors
    })
    
    // Keep timeline manageable
    if (this.energyTimeline.length > 500) {
      this.energyTimeline = this.energyTimeline.slice(-300)
    }
    
    // Check for energy spikes or drops
    this.checkEnergyChanges()
  }
  
  // Calculate segment energy
  private calculateSegmentEnergy(segment: TranscriptSegment): number {
    let energy = 50 // Base energy
    
    // Factors that increase energy
    const exclamations = (segment.text.match(/!/g) || []).length
    const questions = (segment.text.match(/\?/g) || []).length
    const wordCount = segment.text.split(/\s+/).length
    
    energy += exclamations * 10
    energy += questions * 5
    energy += Math.min(wordCount / 10, 20) // Long statements add energy
    
    // Positive keywords
    const positiveWords = ['nagyszerű', 'kiváló', 'great', 'excellent', 'örülök', 'happy']
    const negativeWords = ['probléma', 'nehéz', 'problem', 'difficult', 'aggódik', 'worried']
    
    for (const word of positiveWords) {
      if (segment.text.toLowerCase().includes(word)) energy += 5
    }
    
    for (const word of negativeWords) {
      if (segment.text.toLowerCase().includes(word)) energy -= 5
    }
    
    // Laughter significantly increases energy
    if (this.detectLaughter(segment.text)) {
      energy += 20
    }
    
    return Math.max(0, Math.min(100, energy))
  }
  
  // Detect laughter in text
  private detectLaughter(text: string): boolean {
    const laughterPatterns = ['haha', 'hehe', 'lol', ':)', ':D', '😄', '😂', 'nevető']
    return laughterPatterns.some(pattern => text.toLowerCase().includes(pattern))
  }
  
  // Detect disagreement
  private detectDisagreement(text: string): boolean {
    const disagreementPatterns = [
      'nem értek egyet', 'disagree', 'viszont', 'azonban', 'but', 'however',
      'nem így van', 'that\'s not right', 'tévedsz', 'wrong'
    ]
    return disagreementPatterns.some(pattern => text.toLowerCase().includes(pattern))
  }
  
  // Detect conversation patterns
  private detectPatterns(): void {
    const recentSegments = this.segmentBuffer.slice(-20)
    if (recentSegments.length < 5) return
    
    for (const [patternType, keywords] of Object.entries(this.patternKeywords)) {
      let matchCount = 0
      const matchingSegments: string[] = []
      
      for (const segment of recentSegments) {
        const hasKeyword = keywords.some(kw => segment.text.toLowerCase().includes(kw))
        if (hasKeyword) {
          matchCount++
          matchingSegments.push(segment.id)
        }
      }
      
      const confidence = matchCount / recentSegments.length
      
      if (confidence > 0.3) {
        const pattern: ConversationPattern = {
          type: patternType as ConversationPattern['type'],
          confidence,
          segments: matchingSegments
        }
        
        this.generatePatternInsight(pattern)
      }
    }
  }
  
  // Check for significant energy changes
  private checkEnergyChanges(): void {
    if (this.energyTimeline.length < 10) return
    
    const recent = this.energyTimeline.slice(-10)
    const avgEnergy = recent.reduce((sum, point) => sum + point.energy, 0) / recent.length
    
    // Check for spike
    const lastPoint = recent[recent.length - 1]
    if (lastPoint.energy > avgEnergy * 1.5 && lastPoint.energy > 70) {
      this.generateEnergyInsight('spike', lastPoint, avgEnergy)
    }
    
    // Check for drop
    if (lastPoint.energy < avgEnergy * 0.5 && lastPoint.energy < 30) {
      this.generateEnergyInsight('drop', lastPoint, avgEnergy)
    }
  }
  
  // Generate keyword frequency insight
  private generateKeywordInsight(frequency: KeywordFrequency): void {
    const insight: RealtimeInsight = {
      id: `keyword-${frequency.keyword}-${Date.now()}`,
      type: 'keyword',
      title: `"${frequency.keyword}" mentioned ${frequency.count} times`,
      description: `The term "${frequency.keyword}" has been mentioned ${frequency.count} times by ${frequency.speakers.length} speaker(s)`,
      importance: frequency.count >= 5 ? 'high' : 'medium',
      data: frequency,
      timestamp: Date.now()
    }
    
    this.insights.push(insight)
    this.emit('insight:generated', insight)
  }
  
  // Generate pattern insight
  private generatePatternInsight(pattern: ConversationPattern): void {
    const descriptions = {
      'question-answer': 'Q&A session detected with multiple questions being asked and answered',
      'debate': 'Debate or disagreement pattern detected in the conversation',
      'brainstorming': 'Brainstorming session identified with multiple ideas being shared',
      'decision-making': 'Decision-making process detected with proposals and agreements',
      'information-sharing': 'Information sharing pattern detected with updates and reports'
    }
    
    const insight: RealtimeInsight = {
      id: `pattern-${pattern.type}-${Date.now()}`,
      type: 'pattern',
      title: `${pattern.type.replace('-', ' ')} pattern detected`,
      description: descriptions[pattern.type],
      importance: pattern.confidence > 0.5 ? 'high' : 'medium',
      data: pattern,
      timestamp: Date.now()
    }
    
    this.insights.push(insight)
    this.emit('insight:generated', insight)
  }
  
  // Generate energy insight
  private generateEnergyInsight(
    type: 'spike' | 'drop',
    point: MeetingEnergyPoint,
    avgEnergy: number
  ): void {
    const insight: RealtimeInsight = {
      id: `energy-${type}-${Date.now()}`,
      type: 'energy',
      title: `Energy ${type} detected`,
      description: type === 'spike' 
        ? `Meeting energy spiked to ${point.energy}% (average: ${Math.round(avgEnergy)}%)`
        : `Meeting energy dropped to ${point.energy}% (average: ${Math.round(avgEnergy)}%)`,
      importance: Math.abs(point.energy - avgEnergy) > 30 ? 'high' : 'medium',
      data: {
        type,
        energy: point.energy,
        average: avgEnergy,
        factors: point.contributingFactors
      },
      timestamp: point.timestamp
    }
    
    this.insights.push(insight)
    this.emit('insight:generated', insight)
  }
  
  // Start periodic insight generation
  private startInsightGeneration(): void {
    // Generate summary insights every 30 seconds
    setInterval(() => {
      this.generateSummaryInsights()
    }, 30000)
    
    // Generate interaction insights every minute
    setInterval(() => {
      this.generateInteractionInsights()
    }, 60000)
    
    // Generate topic insights every 2 minutes
    setInterval(() => {
      this.generateTopicInsights()
    }, 120000)
  }
  
  // Generate summary insights
  private generateSummaryInsights(): void {
    const summary = this.getSummary()
    
    // Check conversation dynamics
    if (summary.conversationDynamics.monologuePercentage > 60) {
      const insight: RealtimeInsight = {
        id: `dynamics-monologue-${Date.now()}`,
        type: 'dynamics',
        title: 'Meeting dominated by monologues',
        description: `${Math.round(summary.conversationDynamics.monologuePercentage)}% of the conversation consists of monologues`,
        importance: 'medium',
        data: summary.conversationDynamics,
        timestamp: Date.now()
      }
      
      this.insights.push(insight)
      this.emit('insight:generated', insight)
    }
  }
  
  // Generate interaction insights
  private generateInteractionInsights(): void {
    // Find most active interaction pairs
    const interactions = Array.from(this.interactionMatrix.values())
      .sort((a, b) => b.interactionCount - a.interactionCount)
    
    if (interactions.length > 0 && interactions[0].interactionCount > 10) {
      const top = interactions[0]
      const insight: RealtimeInsight = {
        id: `interaction-active-${Date.now()}`,
        type: 'interaction',
        title: 'Active discussion between participants',
        description: `${top.participant1} and ${top.participant2} have exchanged ${top.interactionCount} times`,
        importance: 'medium',
        data: {
          participants: [top.participant1, top.participant2],
          count: top.interactionCount,
          avgResponseTime: Math.round(top.responseTime / 1000) + 's',
          topics: top.topics
        },
        timestamp: Date.now()
      }
      
      this.insights.push(insight)
      this.emit('insight:generated', insight)
    }
  }
  
  // Generate topic insights
  private generateTopicInsights(): void {
    const topics = Array.from(this.topicTracking.values())
      .sort((a, b) => b.totalTime - a.totalTime)
    
    // Find topics with significant dwell time
    for (const topic of topics.slice(0, 3)) {
      if (topic.totalTime > 120000) { // More than 2 minutes
        const insight: RealtimeInsight = {
          id: `topic-dwell-${topic.topic}-${Date.now()}`,
          type: 'topic',
          title: `Extended discussion on ${topic.topic}`,
          description: `${topic.topic} has been discussed for ${Math.round(topic.totalTime / 60000)} minutes by ${topic.speakers.length} speakers`,
          importance: topic.totalTime > 300000 ? 'high' : 'medium',
          data: topic,
          timestamp: Date.now()
        }
        
        // Only generate if not already reported
        const alreadyReported = this.insights.some(i => 
          i.type === 'topic' && 
          i.data.topic === topic.topic &&
          Date.now() - i.timestamp < 300000 // Within 5 minutes
        )
        
        if (!alreadyReported) {
          this.insights.push(insight)
          this.emit('insight:generated', insight)
        }
      }
    }
  }
  
  // Analyze conversation dynamics
  private analyzeConversationDynamics() {
    const segments = this.segmentBuffer
    let monologueTime = 0
    let dialogueTime = 0
    let currentSpeaker = ''
    let turnStart = 0
    const turnLengths: number[] = []
    let longestMonologue = { speaker: '', duration: 0 }
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      
      if (segment.speaker !== currentSpeaker) {
        // Speaker changed
        if (currentSpeaker) {
          const turnLength = segment.startTime - turnStart
          turnLengths.push(turnLength)
          
          if (turnLength > longestMonologue.duration) {
            longestMonologue = {
              speaker: currentSpeaker,
              duration: turnLength
            }
          }
          
          // Check if previous was monologue (> 30 seconds)
          if (turnLength > 30000) {
            monologueTime += turnLength
          } else {
            dialogueTime += turnLength
          }
        }
        
        currentSpeaker = segment.speaker
        turnStart = segment.startTime
      }
    }
    
    const totalTime = monologueTime + dialogueTime
    const avgTurnLength = turnLengths.length > 0 
      ? turnLengths.reduce((a, b) => a + b, 0) / turnLengths.length 
      : 0
    
    return {
      monologuePercentage: totalTime > 0 ? (monologueTime / totalTime) * 100 : 0,
      dialoguePercentage: totalTime > 0 ? (dialogueTime / totalTime) * 100 : 0,
      averageTurnLength: avgTurnLength,
      longestMonologue
    }
  }
  
  // Get comprehensive summary
  public getSummary(): InsightSummary {
    const patterns: ConversationPattern[] = []
    
    // Extract recent patterns from insights
    const recentPatternInsights = this.insights
      .filter(i => i.type === 'pattern' && Date.now() - i.timestamp < 300000)
      .map(i => i.data as ConversationPattern)
    
    patterns.push(...recentPatternInsights)
    
    return {
      patterns,
      keywordFrequencies: Array.from(this.keywordTracking.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topicDwellTimes: Array.from(this.topicTracking.values())
        .sort((a, b) => b.totalTime - a.totalTime)
        .slice(0, 5),
      participantInteractions: Array.from(this.interactionMatrix.values())
        .sort((a, b) => b.interactionCount - a.interactionCount)
        .slice(0, 10),
      energyTimeline: this.energyTimeline.slice(-100),
      conversationDynamics: this.analyzeConversationDynamics()
    }
  }
  
  // Get recent insights
  public getRecentInsights(limit: number = 10): RealtimeInsight[] {
    return this.insights
      .slice(-limit)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  // Get insights by type
  public getInsightsByType(type: RealtimeInsight['type']): RealtimeInsight[] {
    return this.insights
      .filter(i => i.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
  }
  
  // Clear old insights
  public clearOldInsights(maxAge: number = 3600000): void {
    const cutoff = Date.now() - maxAge
    this.insights = this.insights.filter(i => i.timestamp > cutoff)
  }
  
  // Reset for new meeting
  public reset(): void {
    this.segmentBuffer = []
    this.insights = []
    this.keywordTracking.clear()
    this.topicTracking.clear()
    this.interactionMatrix.clear()
    this.energyTimeline = []
    this.lastSpeaker = null
  }
  
  // Clean up resources
  public destroy(): void {
    this.reset()
    this.removeAllListeners()
  }
}

// Export singleton instance
let insightGenerator: InsightGenerator | null = null

export function getInsightGenerator(): InsightGenerator {
  if (!insightGenerator) {
    insightGenerator = new InsightGenerator()
  }
  return insightGenerator
}