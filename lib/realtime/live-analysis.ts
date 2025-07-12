import { EventEmitter } from 'events'

interface TranscriptSegment {
  id: string
  meetingId: string
  text: string
  speaker: string
  startTime: number
  endTime: number
  confidence: number
  language: string
}

interface VoiceMetrics {
  pitch: number
  pace: number
  volume: number
  pauseDuration: number
}

interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number
  confidence: number
}

interface EmotionDetection {
  primary: 'happy' | 'sad' | 'angry' | 'surprised' | 'neutral' | 'anxious' | 'confused'
  secondary?: string
  confidence: number
  indicators: string[]
}

interface TopicShift {
  fromTopic: string
  toTopic: string
  timestamp: number
  speaker: string
  transitionType: 'natural' | 'abrupt' | 'question-driven'
}

interface ParticipantEngagement {
  participantId: string
  engagementLevel: number // 0-100
  speakingTime: number
  interactionCount: number
  questionCount: number
  energy: number
  enthusiasm: number
}

interface LiveAnalysisResult {
  sentiment: SentimentAnalysis
  emotion: EmotionDetection
  topics: string[]
  topicShifts: TopicShift[]
  engagement: ParticipantEngagement[]
  overallEnergy: number
  conversationDynamics: {
    type: 'monologue' | 'dialogue' | 'discussion' | 'debate'
    balance: number // 0-1, where 1 is perfectly balanced
    dominantSpeaker?: string
  }
}

export class LiveAnalysisEngine extends EventEmitter {
  private slidingWindow: TranscriptSegment[] = []
  private windowSizeMs = 30000 // 30 second window
  private updateIntervalMs = 1000 // Update every second
  private voiceMetricsCache: Map<string, VoiceMetrics[]> = new Map()
  private topicHistory: { topic: string; timestamp: number; speaker: string }[] = []
  private participantStats: Map<string, ParticipantEngagement> = new Map()
  private updateTimer: NodeJS.Timeout | null = null
  
  // Hungarian sentiment and emotion keywords
  private hungarianSentimentKeywords = {
    positive: [
      'örülök', 'nagyszerű', 'kiváló', 'jó', 'remek', 'fantasztikus', 'boldog',
      'elégedett', 'optimista', 'lelkes', 'izgatott', 'köszönöm', 'gratulálok'
    ],
    negative: [
      'sajnálom', 'probléma', 'nehéz', 'rossz', 'aggódom', 'félő', 'kétséges',
      'csalódott', 'frusztrált', 'bosszús', 'szomorú', 'nehézség', 'akadály'
    ],
    anxious: [
      'aggódom', 'félő', 'bizonytalan', 'kérdéses', 'nem tudom', 'talán',
      'esetleg', 'remélem', 'kockázat', 'veszély'
    ]
  }
  
  private emotionIndicators = {
    happy: ['nevetés', 'haha', 'öröm', 'boldog', 'vidám', 'mosolyog'],
    angry: ['dühös', 'mérges', 'felháborító', 'elfogadhatatlan', 'botrány'],
    surprised: ['meglepő', 'váratlan', 'hihetetlen', 'nem gondoltam', 'tényleg?'],
    confused: ['nem értem', 'tisztázzuk', 'magyarázd el', 'hogy érted', 'miről beszélsz']
  }
  
  constructor() {
    super()
    this.startUpdateLoop()
  }
  
  // Add segment to sliding window
  public addSegment(segment: TranscriptSegment, voiceMetrics?: VoiceMetrics): void {
    this.slidingWindow.push(segment)
    
    // Store voice metrics if provided
    if (voiceMetrics) {
      const metrics = this.voiceMetricsCache.get(segment.speaker) || []
      metrics.push(voiceMetrics)
      this.voiceMetricsCache.set(segment.speaker, metrics.slice(-50)) // Keep last 50
    }
    
    // Update participant stats
    this.updateParticipantStats(segment)
    
    // Clean up old segments
    const cutoffTime = Date.now() - this.windowSizeMs
    this.slidingWindow = this.slidingWindow.filter(s => s.endTime > cutoffTime)
    
    // Emit immediate analysis for critical segments
    if (this.isImportantSegment(segment)) {
      this.performAnalysis()
    }
  }
  
  // Start the update loop
  private startUpdateLoop(): void {
    this.updateTimer = setInterval(() => {
      if (this.slidingWindow.length > 0) {
        this.performAnalysis()
      }
    }, this.updateIntervalMs)
  }
  
  // Perform comprehensive analysis
  private performAnalysis(): void {
    const analysis: LiveAnalysisResult = {
      sentiment: this.analyzeSentiment(),
      emotion: this.detectEmotion(),
      topics: this.extractTopics(),
      topicShifts: this.detectTopicShifts(),
      engagement: this.calculateEngagement(),
      overallEnergy: this.calculateOverallEnergy(),
      conversationDynamics: this.analyzeConversationDynamics()
    }
    
    this.emit('analysis:update', analysis)
    
    // Check for significant changes
    this.checkForAlerts(analysis)
  }
  
  // Analyze sentiment from text and voice
  private analyzeSentiment(): SentimentAnalysis {
    const recentSegments = this.slidingWindow.slice(-10)
    let positiveScore = 0
    let negativeScore = 0
    let totalWords = 0
    
    for (const segment of recentSegments) {
      const words = segment.text.toLowerCase().split(/\s+/)
      totalWords += words.length
      
      // Text-based sentiment
      for (const word of words) {
        if (this.hungarianSentimentKeywords.positive.some(p => word.includes(p))) {
          positiveScore += 1
        }
        if (this.hungarianSentimentKeywords.negative.some(n => word.includes(n))) {
          negativeScore += 1
        }
      }
      
      // Voice-based sentiment (if available)
      const voiceMetrics = this.getLatestVoiceMetrics(segment.speaker)
      if (voiceMetrics) {
        // High pitch variation often indicates emotion
        if (voiceMetrics.pitch > 200) positiveScore += 0.5
        if (voiceMetrics.pitch < 100) negativeScore += 0.5
        
        // Fast pace can indicate excitement or anxiety
        if (voiceMetrics.pace > 180) {
          if (positiveScore > negativeScore) positiveScore += 0.5
          else negativeScore += 0.5
        }
      }
    }
    
    const totalScore = positiveScore + negativeScore
    const sentiment = positiveScore > negativeScore ? 'positive' : 
                     negativeScore > positiveScore ? 'negative' : 'neutral'
    
    return {
      sentiment,
      score: totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0,
      confidence: Math.min(totalScore / totalWords, 1)
    }
  }
  
  // Detect emotions from voice and text
  private detectEmotion(): EmotionDetection {
    const recentSegments = this.slidingWindow.slice(-5)
    const emotionScores: Record<string, number> = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 0,
      anxious: 0,
      confused: 0
    }
    
    const indicators: string[] = []
    
    for (const segment of recentSegments) {
      const text = segment.text.toLowerCase()
      
      // Check emotion indicators
      for (const [emotion, keywords] of Object.entries(this.emotionIndicators)) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            emotionScores[emotion] += 1
            indicators.push(`${keyword} (${emotion})`)
          }
        }
      }
      
      // Analyze voice metrics
      const voiceMetrics = this.getLatestVoiceMetrics(segment.speaker)
      if (voiceMetrics) {
        // Emotion detection from voice characteristics
        if (voiceMetrics.pitch > 250 && voiceMetrics.pace > 200) {
          emotionScores.excited = (emotionScores.excited || 0) + 1
          indicators.push('High pitch & fast pace (excited)')
        }
        if (voiceMetrics.volume < 30 && voiceMetrics.pace < 100) {
          emotionScores.sad += 1
          indicators.push('Low volume & slow pace (sad)')
        }
        if (voiceMetrics.volume > 80 && voiceMetrics.pitch > 200) {
          emotionScores.angry += 1
          indicators.push('High volume & pitch (angry)')
        }
      }
      
      // Check for anxiety indicators
      if (this.hungarianSentimentKeywords.anxious.some(word => text.includes(word))) {
        emotionScores.anxious += 1
      }
    }
    
    // Find primary emotion
    let primary: EmotionDetection['primary'] = 'neutral'
    let maxScore = 0
    
    for (const [emotion, score] of Object.entries(emotionScores)) {
      if (score > maxScore) {
        maxScore = score
        primary = emotion as EmotionDetection['primary']
      }
    }
    
    // Find secondary emotion if significant
    const sortedEmotions = Object.entries(emotionScores)
      .sort(([, a], [, b]) => b - a)
    
    const secondary = sortedEmotions[1] && sortedEmotions[1][1] > maxScore * 0.7 
      ? sortedEmotions[1][0] 
      : undefined
    
    return {
      primary,
      secondary,
      confidence: Math.min(maxScore / recentSegments.length, 1),
      indicators: indicators.slice(0, 5) // Top 5 indicators
    }
  }
  
  // Extract current topics
  private extractTopics(): string[] {
    const topicKeywords: Record<string, string[]> = {
      'költségvetés': ['budget', 'költségvetés', 'pénz', 'összeg', 'ár', 'díj'],
      'határidő': ['deadline', 'határidő', 'időpont', 'mikor', 'meddig'],
      'projekt': ['projekt', 'project', 'feladat', 'munka', 'task'],
      'technikai': ['technikai', 'technical', 'fejlesztés', 'kód', 'implementáció'],
      'üzleti': ['üzleti', 'business', 'stratégia', 'piac', 'ügyfél'],
      'HR': ['HR', 'ember', 'csapat', 'kolléga', 'munkatárs'],
      'döntés': ['döntés', 'határozat', 'eldönt', 'választ'],
      'kockázat': ['kockázat', 'risk', 'veszély', 'probléma']
    }
    
    const topics = new Set<string>()
    const recentText = this.slidingWindow
      .slice(-20)
      .map(s => s.text.toLowerCase())
      .join(' ')
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const count = keywords.filter(kw => recentText.includes(kw)).length
      if (count >= 2) {
        topics.add(topic)
      }
    }
    
    return Array.from(topics)
  }
  
  // Detect topic shifts
  private detectTopicShifts(): TopicShift[] {
    const currentTopics = this.extractTopics()
    const shifts: TopicShift[] = []
    
    if (this.topicHistory.length > 0) {
      const lastEntry = this.topicHistory[this.topicHistory.length - 1]
      const lastTopics = lastEntry.topic.split(',')
      
      // Check for topic changes
      for (const newTopic of currentTopics) {
        if (!lastTopics.includes(newTopic)) {
          const recentSegment = this.slidingWindow[this.slidingWindow.length - 1]
          
          // Determine transition type
          let transitionType: TopicShift['transitionType'] = 'natural'
          if (recentSegment.text.includes('?')) {
            transitionType = 'question-driven'
          } else if (this.isAbruptTransition(lastEntry.topic, newTopic)) {
            transitionType = 'abrupt'
          }
          
          shifts.push({
            fromTopic: lastEntry.topic,
            toTopic: newTopic,
            timestamp: recentSegment.startTime,
            speaker: recentSegment.speaker,
            transitionType
          })
        }
      }
    }
    
    // Update topic history
    if (currentTopics.length > 0 && this.slidingWindow.length > 0) {
      const lastSegment = this.slidingWindow[this.slidingWindow.length - 1]
      this.topicHistory.push({
        topic: currentTopics.join(','),
        timestamp: lastSegment.startTime,
        speaker: lastSegment.speaker
      })
      
      // Keep only recent history
      const cutoff = Date.now() - 300000 // 5 minutes
      this.topicHistory = this.topicHistory.filter(h => h.timestamp > cutoff)
    }
    
    return shifts
  }
  
  // Calculate participant engagement
  private calculateEngagement(): ParticipantEngagement[] {
    const engagements: ParticipantEngagement[] = []
    
    for (const [participantId, stats] of this.participantStats.entries()) {
      const voiceMetrics = this.voiceMetricsCache.get(participantId) || []
      
      // Calculate average energy from voice metrics
      const avgEnergy = voiceMetrics.length > 0
        ? voiceMetrics.reduce((sum, m) => sum + (m.volume + m.pace) / 2, 0) / voiceMetrics.length
        : 50
      
      // Calculate enthusiasm from pitch variation and pace
      const enthusiasm = voiceMetrics.length > 0
        ? voiceMetrics.reduce((sum, m) => sum + Math.abs(m.pitch - 150) + (m.pace - 120), 0) / voiceMetrics.length
        : 50
      
      // Calculate engagement level (0-100)
      const engagementLevel = this.calculateEngagementScore(stats, avgEnergy, enthusiasm)
      
      engagements.push({
        ...stats,
        energy: Math.min(avgEnergy, 100),
        enthusiasm: Math.min(enthusiasm / 2, 100),
        engagementLevel
      })
    }
    
    return engagements
  }
  
  // Calculate overall meeting energy
  private calculateOverallEnergy(): number {
    const recentSegments = this.slidingWindow.slice(-20)
    
    if (recentSegments.length === 0) return 50
    
    let totalEnergy = 0
    
    for (const segment of recentSegments) {
      const voiceMetrics = this.getLatestVoiceMetrics(segment.speaker)
      
      if (voiceMetrics) {
        // Energy based on voice characteristics
        const segmentEnergy = (voiceMetrics.volume + voiceMetrics.pace) / 2
        totalEnergy += segmentEnergy
      } else {
        // Estimate energy from text
        const exclamations = (segment.text.match(/[!?]/g) || []).length
        const wordCount = segment.text.split(/\s+/).length
        const textEnergy = 50 + (exclamations * 10) + (wordCount > 20 ? 10 : 0)
        totalEnergy += Math.min(textEnergy, 100)
      }
    }
    
    return Math.min(totalEnergy / recentSegments.length, 100)
  }
  
  // Analyze conversation dynamics
  private analyzeConversationDynamics(): LiveAnalysisResult['conversationDynamics'] {
    const speakerTurns = new Map<string, number>()
    const speakerTime = new Map<string, number>()
    
    for (const segment of this.slidingWindow) {
      speakerTurns.set(segment.speaker, (speakerTurns.get(segment.speaker) || 0) + 1)
      const duration = segment.endTime - segment.startTime
      speakerTime.set(segment.speaker, (speakerTime.get(segment.speaker) || 0) + duration)
    }
    
    const speakers = Array.from(speakerTurns.keys())
    const turnCounts = Array.from(speakerTurns.values())
    const timeCounts = Array.from(speakerTime.values())
    
    // Determine conversation type
    let type: LiveAnalysisResult['conversationDynamics']['type'] = 'dialogue'
    
    if (speakers.length === 1) {
      type = 'monologue'
    } else if (speakers.length === 2 && Math.abs(turnCounts[0] - turnCounts[1]) < 3) {
      type = 'dialogue'
    } else if (speakers.length > 2) {
      const avgTurns = turnCounts.reduce((a, b) => a + b, 0) / turnCounts.length
      const variance = turnCounts.reduce((sum, t) => sum + Math.pow(t - avgTurns, 2), 0) / turnCounts.length
      
      type = variance < 10 ? 'discussion' : 'debate'
    }
    
    // Calculate balance (0-1, where 1 is perfectly balanced)
    const totalTime = timeCounts.reduce((a, b) => a + b, 0)
    let balance = 1
    
    if (speakers.length > 1 && totalTime > 0) {
      const expectedTime = totalTime / speakers.length
      const deviation = timeCounts.reduce((sum, time) => sum + Math.abs(time - expectedTime), 0)
      balance = 1 - (deviation / totalTime)
    }
    
    // Find dominant speaker
    let dominantSpeaker: string | undefined
    if (speakers.length > 1) {
      const maxTime = Math.max(...timeCounts)
      const maxIndex = timeCounts.indexOf(maxTime)
      if (maxTime > totalTime * 0.4) {
        dominantSpeaker = speakers[maxIndex]
      }
    }
    
    return { type, balance, dominantSpeaker }
  }
  
  // Helper methods
  
  private getLatestVoiceMetrics(speaker: string): VoiceMetrics | undefined {
    const metrics = this.voiceMetricsCache.get(speaker)
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : undefined
  }
  
  private updateParticipantStats(segment: TranscriptSegment): void {
    const stats = this.participantStats.get(segment.speaker) || {
      participantId: segment.speaker,
      engagementLevel: 50,
      speakingTime: 0,
      interactionCount: 0,
      questionCount: 0,
      energy: 50,
      enthusiasm: 50
    }
    
    stats.speakingTime += segment.endTime - segment.startTime
    stats.interactionCount += 1
    
    if (segment.text.includes('?')) {
      stats.questionCount += 1
    }
    
    this.participantStats.set(segment.speaker, stats)
  }
  
  private calculateEngagementScore(
    stats: Omit<ParticipantEngagement, 'engagementLevel'>, 
    energy: number, 
    enthusiasm: number
  ): number {
    // Weighted factors for engagement
    const weights = {
      speakingTime: 0.2,
      interactions: 0.3,
      questions: 0.2,
      energy: 0.15,
      enthusiasm: 0.15
    }
    
    // Normalize values
    const normalizedSpeaking = Math.min(stats.speakingTime / 60000, 1) // 1 minute = full score
    const normalizedInteractions = Math.min(stats.interactionCount / 10, 1) // 10 interactions = full
    const normalizedQuestions = Math.min(stats.questionCount / 5, 1) // 5 questions = full
    
    const score = 
      normalizedSpeaking * weights.speakingTime * 100 +
      normalizedInteractions * weights.interactions * 100 +
      normalizedQuestions * weights.questions * 100 +
      energy * weights.energy +
      enthusiasm * weights.enthusiasm
    
    return Math.round(Math.min(score, 100))
  }
  
  private isImportantSegment(segment: TranscriptSegment): boolean {
    const importantPatterns = [
      'döntés', 'határozat', 'megállapodás',
      'deadline', 'határidő',
      'költségvetés', 'budget',
      'probléma', 'akadály',
      'következő lépés', 'action item'
    ]
    
    const text = segment.text.toLowerCase()
    return importantPatterns.some(pattern => text.includes(pattern))
  }
  
  private isAbruptTransition(fromTopic: string, toTopic: string): boolean {
    const relatedTopics: Record<string, string[]> = {
      'költségvetés': ['projekt', 'határidő'],
      'technikai': ['projekt', 'határidő'],
      'HR': ['költségvetés', 'projekt'],
      'döntés': ['költségvetés', 'projekt', 'határidő']
    }
    
    const fromTopics = fromTopic.split(',')
    const relatedToFrom = fromTopics.flatMap(t => relatedTopics[t] || [])
    
    return !fromTopics.includes(toTopic) && !relatedToFrom.includes(toTopic)
  }
  
  private checkForAlerts(analysis: LiveAnalysisResult): void {
    // Check for negative sentiment trend
    if (analysis.sentiment.sentiment === 'negative' && analysis.sentiment.confidence > 0.7) {
      this.emit('alert:sentiment', {
        type: 'negative_sentiment',
        severity: 'warning',
        message: 'Negative sentiment detected in conversation',
        data: analysis.sentiment
      })
    }
    
    // Check for low engagement
    const lowEngagement = analysis.engagement.filter(e => e.engagementLevel < 30)
    if (lowEngagement.length > 0) {
      this.emit('alert:engagement', {
        type: 'low_engagement',
        severity: 'info',
        participants: lowEngagement.map(e => e.participantId),
        message: 'Low engagement detected for some participants'
      })
    }
    
    // Check for conversation imbalance
    if (analysis.conversationDynamics.balance < 0.3 && analysis.conversationDynamics.dominantSpeaker) {
      this.emit('alert:dynamics', {
        type: 'conversation_imbalance',
        severity: 'info',
        dominantSpeaker: analysis.conversationDynamics.dominantSpeaker,
        balance: analysis.conversationDynamics.balance,
        message: 'Conversation is dominated by one speaker'
      })
    }
    
    // Check for abrupt topic shifts
    const abruptShifts = analysis.topicShifts.filter(s => s.transitionType === 'abrupt')
    if (abruptShifts.length > 0) {
      this.emit('alert:topic', {
        type: 'abrupt_topic_shift',
        severity: 'info',
        shifts: abruptShifts,
        message: 'Abrupt topic change detected'
      })
    }
  }
  
  // Get current analysis snapshot
  public getCurrentAnalysis(): LiveAnalysisResult | null {
    if (this.slidingWindow.length === 0) return null
    
    return {
      sentiment: this.analyzeSentiment(),
      emotion: this.detectEmotion(),
      topics: this.extractTopics(),
      topicShifts: this.detectTopicShifts(),
      engagement: this.calculateEngagement(),
      overallEnergy: this.calculateOverallEnergy(),
      conversationDynamics: this.analyzeConversationDynamics()
    }
  }
  
  // Configure sliding window size
  public setWindowSize(sizeMs: number): void {
    this.windowSizeMs = sizeMs
  }
  
  // Configure update interval
  public setUpdateInterval(intervalMs: number): void {
    this.updateIntervalMs = intervalMs
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.startUpdateLoop()
    }
  }
  
  // Clean up resources
  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
    }
    this.slidingWindow = []
    this.voiceMetricsCache.clear()
    this.topicHistory = []
    this.participantStats.clear()
    this.removeAllListeners()
  }
}

// Export singleton instance
let liveAnalysisEngine: LiveAnalysisEngine | null = null

export function getLiveAnalysisEngine(): LiveAnalysisEngine {
  if (!liveAnalysisEngine) {
    liveAnalysisEngine = new LiveAnalysisEngine()
  }
  return liveAnalysisEngine
}