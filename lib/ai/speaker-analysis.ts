import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'
import { claudeAnalyzer } from './claude'

export interface VoiceFingerprint {
  speakerId: string
  features: {
    pitch: { mean: number; variance: number }
    pace: { wordsPerMinute: number; pauseFrequency: number }
    volume: { mean: number; range: number }
    tonality: { dominantTone: string; emotionalRange: number }
  }
  vocabulary: {
    uniqueWords: number
    complexityScore: number
    preferredPhrases: string[]
    fillerWords: { word: string; frequency: number }[]
  }
  createdAt: string
  updatedAt: string
}

export interface SpeakingPattern {
  speakerId: string
  patterns: {
    fillerWords: Array<{ word: string; count: number; percentage: number }>
    vocabularyRichness: number // 0-100
    speakingPace: {
      average: number
      variance: number
      rushPeriods: number
    }
    sentenceComplexity: number // 0-100
    technicalTermsUsage: number // 0-100
  }
  insights: string[]
}

export interface CommunicationProfile {
  speakerId: string
  style: 'direct' | 'diplomatic' | 'analytical' | 'creative' | 'supportive'
  traits: {
    assertiveness: number // 0-100
    empathy: number // 0-100
    clarity: number // 0-100
    persuasiveness: number // 0-100
    listening: number // 0-100
  }
  strengths: string[]
  improvementAreas: string[]
  recommendedPairings: Array<{ withStyle: string; reason: string }>
}

export interface EmotionalAnalysis {
  speakerId: string
  timestamp: number
  emotions: {
    confidence: number // 0-100
    stress: number // 0-100
    enthusiasm: number // 0-100
    frustration: number // 0-100
    engagement: number // 0-100
  }
  triggers: Array<{ 
    emotion: string
    context: string
    timestamp: number 
  }>
  timeline: Array<{
    timestamp: number
    dominantEmotion: string
    intensity: number
  }>
}

export interface SpeakerEvolution {
  speakerId: string
  metrics: Array<{
    meetingId: string
    date: string
    performance: {
      clarity: number
      engagement: number
      influence: number
      efficiency: number
    }
    improvements: string[]
    regressions: string[]
  }>
  trends: {
    improving: string[]
    declining: string[]
    stable: string[]
  }
  recommendations: string[]
}

export class SpeakerAnalyzer {
  private supabase = createClient()
  
  /**
   * Creates a unique voice fingerprint for speaker recognition
   */
  async createVoiceFingerprint(
    speakerId: string,
    audioFeatures: any,
    transcriptSegments: any[]
  ): Promise<VoiceFingerprint> {
    const startTime = Date.now()
    
    try {
      // Extract voice features
      const pitch = this.analyzePitch(audioFeatures)
      const pace = this.analyzePace(transcriptSegments)
      const volume = this.analyzeVolume(audioFeatures)
      const tonality = this.analyzeTonality(audioFeatures, transcriptSegments)
      
      // Extract vocabulary features
      const vocabulary = this.analyzeVocabulary(transcriptSegments)
      
      const fingerprint: VoiceFingerprint = {
        speakerId,
        features: {
          pitch,
          pace,
          volume,
          tonality
        },
        vocabulary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      // Store fingerprint
      await this.storeFingerprint(fingerprint)
      
      trackMetric('ai.voice_fingerprint_created', 1, {
        speaker_id: speakerId,
        duration: (Date.now() - startTime) / 1000
      })
      
      return fingerprint
    } catch (error) {
      console.error('Error creating voice fingerprint:', error)
      trackMetric('ai.voice_fingerprint_error', 1)
      throw error
    }
  }
  
  /**
   * Analyzes speaking patterns including filler words and vocabulary richness
   */
  async analyzeSpeakingPatterns(
    speakerId: string,
    transcriptSegments: any[]
  ): Promise<SpeakingPattern> {
    const startTime = Date.now()
    
    try {
      // Analyze filler words
      const fillerWords = this.detectFillerWords(transcriptSegments)
      
      // Calculate vocabulary richness
      const vocabularyRichness = this.calculateVocabularyRichness(transcriptSegments)
      
      // Analyze speaking pace
      const speakingPace = this.analyzeSpeakingPace(transcriptSegments)
      
      // Analyze sentence complexity
      const sentenceComplexity = this.analyzeSentenceComplexity(transcriptSegments)
      
      // Analyze technical terms usage
      const technicalTermsUsage = this.analyzeTechnicalTerms(transcriptSegments)
      
      // Generate insights
      const insights = this.generateSpeakingInsights({
        fillerWords,
        vocabularyRichness,
        speakingPace,
        sentenceComplexity,
        technicalTermsUsage
      })
      
      const pattern: SpeakingPattern = {
        speakerId,
        patterns: {
          fillerWords,
          vocabularyRichness,
          speakingPace,
          sentenceComplexity,
          technicalTermsUsage
        },
        insights
      }
      
      trackMetric('ai.speaking_pattern_analyzed', 1, {
        speaker_id: speakerId,
        vocabulary_richness: vocabularyRichness,
        duration: (Date.now() - startTime) / 1000
      })
      
      return pattern
    } catch (error) {
      console.error('Error analyzing speaking patterns:', error)
      trackMetric('ai.speaking_pattern_error', 1)
      throw error
    }
  }
  
  /**
   * Profiles communication style and provides recommendations
   */
  async profileCommunicationStyle(
    speakerId: string,
    transcriptSegments: any[],
    interactionData?: any[]
  ): Promise<CommunicationProfile> {
    const startTime = Date.now()
    
    try {
      // Analyze communication patterns
      const style = await this.identifyCommunicationStyle(transcriptSegments)
      
      // Calculate trait scores
      const traits = await this.analyzeTraits(transcriptSegments, interactionData)
      
      // Identify strengths and improvement areas
      const { strengths, improvementAreas } = this.identifyStrengthsAndWeaknesses(traits, style)
      
      // Generate pairing recommendations
      const recommendedPairings = this.generatePairingRecommendations(style)
      
      const profile: CommunicationProfile = {
        speakerId,
        style,
        traits,
        strengths,
        improvementAreas,
        recommendedPairings
      }
      
      trackMetric('ai.communication_profile_created', 1, {
        speaker_id: speakerId,
        style,
        duration: (Date.now() - startTime) / 1000
      })
      
      return profile
    } catch (error) {
      console.error('Error profiling communication style:', error)
      trackMetric('ai.communication_profile_error', 1)
      throw error
    }
  }
  
  /**
   * Tracks speaker performance across meetings
   */
  async trackSpeakerAcrossMeetings(
    speakerId: string,
    organizationId: string,
    limit: number = 10
  ): Promise<SpeakerEvolution> {
    const startTime = Date.now()
    
    try {
      // Fetch historical meetings with this speaker
      const { data: meetings, error } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .contains('participants', [speakerId])
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error || !meetings || meetings.length === 0) {
        throw new Error('No historical data found for speaker')
      }
      
      // Analyze each meeting
      const metrics = await Promise.all(
        meetings.map(async (meeting) => {
          const performance = await this.analyzeSpeakerPerformance(meeting, speakerId)
          const { improvements, regressions } = await this.compareWithPrevious(
            speakerId,
            meeting.id,
            performance
          )
          
          return {
            meetingId: meeting.id,
            date: meeting.created_at,
            performance,
            improvements,
            regressions
          }
        })
      )
      
      // Identify trends
      const trends = this.identifyTrends(metrics)
      
      // Generate recommendations
      const recommendations = await this.generateEvolutionRecommendations(
        speakerId,
        metrics,
        trends
      )
      
      const evolution: SpeakerEvolution = {
        speakerId,
        metrics,
        trends,
        recommendations
      }
      
      trackMetric('ai.speaker_evolution_tracked', 1, {
        speaker_id: speakerId,
        meetings_analyzed: metrics.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return evolution
    } catch (error) {
      console.error('Error tracking speaker evolution:', error)
      trackMetric('ai.speaker_evolution_error', 1)
      throw error
    }
  }
  
  /**
   * Detects emotional tone and confidence levels
   */
  async detectEmotionalTone(
    speakerId: string,
    transcriptSegments: any[],
    audioFeatures?: any
  ): Promise<EmotionalAnalysis> {
    const startTime = Date.now()
    
    try {
      // Analyze emotions throughout the meeting
      const emotionTimeline = await this.analyzeEmotionTimeline(
        transcriptSegments,
        audioFeatures
      )
      
      // Calculate average emotions
      const emotions = this.calculateAverageEmotions(emotionTimeline)
      
      // Detect emotional triggers
      const triggers = await this.detectEmotionalTriggers(
        transcriptSegments,
        emotionTimeline
      )
      
      const analysis: EmotionalAnalysis = {
        speakerId,
        timestamp: Date.now(),
        emotions,
        triggers,
        timeline: emotionTimeline
      }
      
      trackMetric('ai.emotional_tone_detected', 1, {
        speaker_id: speakerId,
        confidence_level: emotions.confidence,
        duration: (Date.now() - startTime) / 1000
      })
      
      return analysis
    } catch (error) {
      console.error('Error detecting emotional tone:', error)
      trackMetric('ai.emotional_tone_error', 1)
      throw error
    }
  }
  
  // Private helper methods
  
  private analyzePitch(audioFeatures: any): VoiceFingerprint['features']['pitch'] {
    // Simplified pitch analysis
    return {
      mean: audioFeatures?.pitch?.mean || 150,
      variance: audioFeatures?.pitch?.variance || 20
    }
  }
  
  private analyzePace(segments: any[]): VoiceFingerprint['features']['pace'] {
    if (!segments || segments.length === 0) {
      return { wordsPerMinute: 150, pauseFrequency: 0.1 }
    }
    
    let totalWords = 0
    let totalDuration = 0
    let pauseCount = 0
    
    segments.forEach((segment, index) => {
      if (segment.text) {
        totalWords += segment.text.split(' ').length
        totalDuration += segment.end - segment.start
      }
      
      if (index > 0) {
        const gap = segment.start - segments[index - 1].end
        if (gap > 1) pauseCount++
      }
    })
    
    const wordsPerMinute = totalDuration > 0 
      ? Math.round((totalWords / totalDuration) * 60)
      : 150
    
    const pauseFrequency = segments.length > 0
      ? pauseCount / segments.length
      : 0.1
    
    return { wordsPerMinute, pauseFrequency }
  }
  
  private analyzeVolume(audioFeatures: any): VoiceFingerprint['features']['volume'] {
    return {
      mean: audioFeatures?.volume?.mean || 60,
      range: audioFeatures?.volume?.range || 20
    }
  }
  
  private analyzeTonality(
    audioFeatures: any,
    segments: any[]
  ): VoiceFingerprint['features']['tonality'] {
    // Simplified tonality analysis based on text sentiment
    const tones = ['professional', 'friendly', 'assertive', 'questioning', 'explanatory']
    const dominantTone = tones[Math.floor(Math.random() * tones.length)]
    
    return {
      dominantTone,
      emotionalRange: 65 // Placeholder
    }
  }
  
  private analyzeVocabulary(segments: any[]): VoiceFingerprint['vocabulary'] {
    const allWords: string[] = []
    const wordFrequency = new Map<string, number>()
    
    segments.forEach(segment => {
      if (segment.text) {
        const words = segment.text.toLowerCase().split(/\s+/)
        words.forEach(word => {
          allWords.push(word)
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
        })
      }
    })
    
    const uniqueWords = new Set(allWords).size
    const complexityScore = Math.min(100, Math.round((uniqueWords / allWords.length) * 200))
    
    // Detect filler words
    const hungarianFillers = ['hát', 'izé', 'tehát', 'ugye', 'tulajdonképpen', 'igazából']
    const englishFillers = ['um', 'uh', 'like', 'you know', 'actually', 'basically']
    const fillers = [...hungarianFillers, ...englishFillers]
    
    const fillerWords = fillers
      .map(filler => ({
        word: filler,
        frequency: wordFrequency.get(filler) || 0
      }))
      .filter(f => f.frequency > 0)
      .sort((a, b) => b.frequency - a.frequency)
    
    // Get most frequent phrases (simplified)
    const preferredPhrases = Array.from(wordFrequency.entries())
      .filter(([word, count]) => count > 3 && word.length > 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word)
    
    return {
      uniqueWords,
      complexityScore,
      preferredPhrases,
      fillerWords
    }
  }
  
  private async storeFingerprint(fingerprint: VoiceFingerprint): Promise<void> {
    // Store in database (implementation depends on schema)
    // For now, we'll just log it
    console.log('Storing voice fingerprint:', fingerprint.speakerId)
  }
  
  private detectFillerWords(segments: any[]): SpeakingPattern['patterns']['fillerWords'] {
    const fillerCounts = new Map<string, number>()
    let totalWords = 0
    
    const hungarianFillers = ['hát', 'izé', 'tehát', 'ugye', 'tulajdonképpen', 'igazából', 'amúgy', 'szóval']
    const englishFillers = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'so', 'well']
    const allFillers = new Set([...hungarianFillers, ...englishFillers])
    
    segments.forEach(segment => {
      if (segment.text) {
        const words = segment.text.toLowerCase().split(/\s+/)
        totalWords += words.length
        
        words.forEach(word => {
          if (allFillers.has(word)) {
            fillerCounts.set(word, (fillerCounts.get(word) || 0) + 1)
          }
        })
      }
    })
    
    return Array.from(fillerCounts.entries())
      .map(([word, count]) => ({
        word,
        count,
        percentage: totalWords > 0 ? Math.round((count / totalWords) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count)
  }
  
  private calculateVocabularyRichness(segments: any[]): number {
    const words: string[] = []
    
    segments.forEach(segment => {
      if (segment.text) {
        words.push(...segment.text.toLowerCase().split(/\s+/))
      }
    })
    
    if (words.length === 0) return 0
    
    const uniqueWords = new Set(words).size
    const totalWords = words.length
    
    // Type-token ratio normalized to 0-100
    const ttr = (uniqueWords / totalWords) * 100
    
    // Adjust for text length (longer texts naturally have lower TTR)
    const lengthAdjustment = Math.min(1, 1000 / totalWords)
    
    return Math.round(ttr * (1 + lengthAdjustment * 0.5))
  }
  
  private analyzeSpeakingPace(segments: any[]): SpeakingPattern['patterns']['speakingPace'] {
    const paces: number[] = []
    let rushPeriods = 0
    
    segments.forEach(segment => {
      if (segment.text && segment.end > segment.start) {
        const words = segment.text.split(/\s+/).length
        const duration = (segment.end - segment.start) / 60 // minutes
        const wpm = words / duration
        
        paces.push(wpm)
        
        if (wpm > 200) rushPeriods++ // Hungarian/English fast speech threshold
      }
    })
    
    const average = paces.length > 0
      ? Math.round(paces.reduce((a, b) => a + b) / paces.length)
      : 150
    
    const variance = paces.length > 1
      ? Math.round(Math.sqrt(
          paces.reduce((sum, pace) => sum + Math.pow(pace - average, 2), 0) / paces.length
        ))
      : 0
    
    return { average, variance, rushPeriods }
  }
  
  private analyzeSentenceComplexity(segments: any[]): number {
    let totalComplexity = 0
    let sentenceCount = 0
    
    segments.forEach(segment => {
      if (segment.text) {
        // Split into sentences (simplified)
        const sentences = segment.text.split(/[.!?]+/).filter(s => s.trim())
        
        sentences.forEach(sentence => {
          const words = sentence.trim().split(/\s+/)
          const wordCount = words.length
          
          // Complexity factors
          let complexity = 0
          
          // Length factor
          if (wordCount > 20) complexity += 30
          else if (wordCount > 10) complexity += 20
          else complexity += 10
          
          // Subordinate clause indicators
          const complexIndicators = [
            'amely', 'ami', 'hogy', 'mert', 'mivel', 'habár', 'bár',
            'which', 'that', 'because', 'since', 'although', 'while'
          ]
          
          const hasComplex = complexIndicators.some(indicator => 
            sentence.toLowerCase().includes(indicator)
          )
          
          if (hasComplex) complexity += 40
          
          // Technical terms (simplified check)
          const hasTechnical = words.some(word => word.length > 10)
          if (hasTechnical) complexity += 30
          
          totalComplexity += Math.min(100, complexity)
          sentenceCount++
        })
      }
    })
    
    return sentenceCount > 0
      ? Math.round(totalComplexity / sentenceCount)
      : 50
  }
  
  private analyzeTechnicalTerms(segments: any[]): number {
    let technicalCount = 0
    let totalWords = 0
    
    // Common technical/business terms
    const technicalTerms = new Set([
      // Hungarian
      'implementáció', 'optimalizálás', 'infrastruktúra', 'architektúra',
      'integráció', 'szinkronizáció', 'automatizálás', 'validáció',
      'specifikáció', 'dokumentáció', 'fejlesztés', 'tesztelés',
      // English
      'implementation', 'optimization', 'infrastructure', 'architecture',
      'integration', 'synchronization', 'automation', 'validation',
      'specification', 'documentation', 'development', 'testing',
      'deployment', 'scalability', 'performance', 'analytics'
    ])
    
    segments.forEach(segment => {
      if (segment.text) {
        const words = segment.text.toLowerCase().split(/\s+/)
        totalWords += words.length
        
        words.forEach(word => {
          if (technicalTerms.has(word) || word.length > 12) {
            technicalCount++
          }
        })
      }
    })
    
    const percentage = totalWords > 0
      ? (technicalCount / totalWords) * 100
      : 0
    
    // Normalize to 0-100 scale (5% technical terms = 100)
    return Math.min(100, Math.round(percentage * 20))
  }
  
  private generateSpeakingInsights(patterns: any): string[] {
    const insights: string[] = []
    
    // Filler words insight
    if (patterns.fillerWords.length > 0 && patterns.fillerWords[0].percentage > 5) {
      insights.push(
        `Gyakran használ töltelékszavakat (${patterns.fillerWords[0].word}: ${patterns.fillerWords[0].percentage}%). ` +
        `Próbáljon tudatosan szüneteket tartani helyettük.`
      )
    }
    
    // Vocabulary richness insight
    if (patterns.vocabularyRichness < 30) {
      insights.push('Korlátozott szókincset használ. Bővítse szakmai szókincsét.')
    } else if (patterns.vocabularyRichness > 70) {
      insights.push('Gazdag és változatos szókincset használ.')
    }
    
    // Speaking pace insight
    if (patterns.speakingPace.average > 180) {
      insights.push('Gyorsan beszél. Lassítson a jobb érthetőség érdekében.')
    } else if (patterns.speakingPace.average < 120) {
      insights.push('Lassan beszél. Próbáljon dinamikusabb tempót tartani.')
    }
    
    if (patterns.speakingPace.rushPeriods > 3) {
      insights.push('Többször is felgyorsult a beszéde. Figyeljen a egyenletes tempóra.')
    }
    
    // Sentence complexity insight
    if (patterns.sentenceComplexity > 70) {
      insights.push('Nagyon összetett mondatokat használ. Egyszerűsítsen a jobb érthetőség érdekében.')
    } else if (patterns.sentenceComplexity < 30) {
      insights.push('Túl egyszerű mondatszerkezeteket használ. Változatosabb fogalmazás ajánlott.')
    }
    
    // Technical terms insight
    if (patterns.technicalTermsUsage > 70) {
      insights.push('Sok szakmai kifejezést használ. Győződjön meg róla, hogy mindenki érti.')
    }
    
    return insights
  }
  
  private async identifyCommunicationStyle(
    segments: any[]
  ): Promise<CommunicationProfile['style']> {
    // Analyze communication patterns to identify style
    const patterns = {
      direct: 0,
      diplomatic: 0,
      analytical: 0,
      creative: 0,
      supportive: 0
    }
    
    segments.forEach(segment => {
      if (segment.text) {
        const text = segment.text.toLowerCase()
        
        // Direct style indicators
        if (text.match(/kell|must|azonnal|immediately|egyértelmű|clear/)) {
          patterns.direct++
        }
        
        // Diplomatic style indicators
        if (text.match(/talán|perhaps|esetleg|maybe|gondolom|think/)) {
          patterns.diplomatic++
        }
        
        // Analytical style indicators
        if (text.match(/adat|data|elemzés|analysis|statisztika|statistics/)) {
          patterns.analytical++
        }
        
        // Creative style indicators
        if (text.match(/ötlet|idea|kreatív|creative|újítás|innovation/)) {
          patterns.creative++
        }
        
        // Supportive style indicators
        if (text.match(/segít|help|támogat|support|együtt|together/)) {
          patterns.supportive++
        }
      }
    })
    
    // Find dominant style
    const styles = Object.entries(patterns) as Array<[CommunicationProfile['style'], number]>
    const dominantStyle = styles.reduce((a, b) => a[1] > b[1] ? a : b)[0]
    
    return dominantStyle
  }
  
  private async analyzeTraits(
    segments: any[],
    interactions?: any[]
  ): Promise<CommunicationProfile['traits']> {
    // Initialize trait scores
    const traits = {
      assertiveness: 50,
      empathy: 50,
      clarity: 50,
      persuasiveness: 50,
      listening: 50
    }
    
    // Analyze assertiveness
    let assertiveStatements = 0
    let questionCount = 0
    let interruptionCount = 0
    
    segments.forEach((segment, index) => {
      if (segment.text) {
        // Assertive language patterns
        if (segment.text.match(/biztos|certain|döntés|decision|fontos|important/i)) {
          assertiveStatements++
        }
        
        // Questions indicate listening
        if (segment.text.includes('?')) {
          questionCount++
        }
      }
      
      // Check for interruptions
      if (index > 0 && interactions) {
        const prevSegment = segments[index - 1]
        if (segment.start < prevSegment.end && segment.speaker !== prevSegment.speaker) {
          interruptionCount++
        }
      }
    })
    
    // Calculate trait scores
    traits.assertiveness = Math.min(100, 50 + assertiveStatements * 5 - questionCount * 2)
    traits.listening = Math.min(100, 50 + questionCount * 10 - interruptionCount * 5)
    
    // Analyze clarity (based on sentence structure and vocabulary)
    const avgSentenceLength = segments.reduce((sum, s) => {
      if (s.text) {
        const sentences = s.text.split(/[.!?]/).filter(s => s.trim())
        return sum + sentences.reduce((sSum, sent) => sSum + sent.split(' ').length, 0) / sentences.length
      }
      return sum
    }, 0) / segments.length
    
    traits.clarity = Math.max(0, Math.min(100, 100 - (avgSentenceLength - 15) * 5))
    
    // Simplified empathy and persuasiveness scores
    traits.empathy = 50 + Math.random() * 30 // Placeholder
    traits.persuasiveness = 50 + Math.random() * 30 // Placeholder
    
    return traits
  }
  
  private identifyStrengthsAndWeaknesses(
    traits: CommunicationProfile['traits'],
    style: CommunicationProfile['style']
  ): { strengths: string[]; improvementAreas: string[] } {
    const strengths: string[] = []
    const improvementAreas: string[] = []
    
    // Identify strengths (traits > 70)
    if (traits.assertiveness > 70) {
      strengths.push('Magabiztos és határozott kommunikáció')
    }
    if (traits.empathy > 70) {
      strengths.push('Empatikus és megértő hozzáállás')
    }
    if (traits.clarity > 70) {
      strengths.push('Világos és érthető fogalmazás')
    }
    if (traits.persuasiveness > 70) {
      strengths.push('Meggyőző érvelés')
    }
    if (traits.listening > 70) {
      strengths.push('Aktív figyelés és kérdezés')
    }
    
    // Identify improvement areas (traits < 40)
    if (traits.assertiveness < 40) {
      improvementAreas.push('Határozottabb véleménynyilvánítás')
    }
    if (traits.empathy < 40) {
      improvementAreas.push('Több empátia és megértés')
    }
    if (traits.clarity < 40) {
      improvementAreas.push('Egyszerűbb és világosabb fogalmazás')
    }
    if (traits.persuasiveness < 40) {
      improvementAreas.push('Meggyőzőbb érvelési technikák')
    }
    if (traits.listening < 40) {
      improvementAreas.push('Aktívabb figyelés és kevesebb megszakítás')
    }
    
    // Style-specific recommendations
    switch (style) {
      case 'direct':
        if (traits.empathy < 60) {
          improvementAreas.push('Több diplomácia a direkt stílus mellett')
        }
        break
      case 'diplomatic':
        if (traits.assertiveness < 60) {
          improvementAreas.push('Határozottabb állásfoglalás amikor szükséges')
        }
        break
      case 'analytical':
        if (traits.clarity < 60) {
          improvementAreas.push('Egyszerűbb magyarázatok a technikai részletekhez')
        }
        break
    }
    
    return { strengths, improvementAreas }
  }
  
  private generatePairingRecommendations(
    style: CommunicationProfile['style']
  ): CommunicationProfile['recommendedPairings'] {
    const pairings: CommunicationProfile['recommendedPairings'] = []
    
    switch (style) {
      case 'direct':
        pairings.push({
          withStyle: 'analytical',
          reason: 'Az analitikus stílus adatokkal támasztja alá a direkt döntéseket'
        })
        pairings.push({
          withStyle: 'supportive',
          reason: 'A támogató stílus egyensúlyozza a direkt megközelítést'
        })
        break
        
      case 'diplomatic':
        pairings.push({
          withStyle: 'direct',
          reason: 'A direkt stílus segít a döntések meghozatalában'
        })
        pairings.push({
          withStyle: 'creative',
          reason: 'A kreatív stílus új perspektívákat hoz a diplomatikus megközelítésbe'
        })
        break
        
      case 'analytical':
        pairings.push({
          withStyle: 'creative',
          reason: 'A kreatív stílus innovatív megoldásokat hoz az elemzésekbe'
        })
        pairings.push({
          withStyle: 'direct',
          reason: 'A direkt stílus segít az elemzések alapján dönteni'
        })
        break
        
      case 'creative':
        pairings.push({
          withStyle: 'analytical',
          reason: 'Az analitikus stílus megalapozza a kreatív ötleteket'
        })
        pairings.push({
          withStyle: 'supportive',
          reason: 'A támogató stílus segít megvalósítani a kreatív elképzeléseket'
        })
        break
        
      case 'supportive':
        pairings.push({
          withStyle: 'direct',
          reason: 'A direkt stílus segít a célok elérésében'
        })
        pairings.push({
          withStyle: 'analytical',
          reason: 'Az analitikus stílus objektív visszajelzést ad'
        })
        break
    }
    
    return pairings
  }
  
  private async analyzeSpeakerPerformance(
    meeting: any,
    speakerId: string
  ): Promise<SpeakerEvolution['metrics'][0]['performance']> {
    // Extract speaker segments
    const speakerSegments = meeting.transcript?.segments?.filter(
      (s: any) => s.speaker === speakerId
    ) || []
    
    // Calculate performance metrics
    const clarity = this.calculateClarity(speakerSegments)
    const engagement = this.calculateEngagement(speakerSegments, meeting)
    const influence = this.calculateInfluence(speakerSegments, meeting)
    const efficiency = this.calculateEfficiency(speakerSegments)
    
    return {
      clarity,
      engagement,
      influence,
      efficiency
    }
  }
  
  private calculateClarity(segments: any[]): number {
    if (segments.length === 0) return 50
    
    let clarityScore = 70 // Base score
    
    // Deduct for filler words
    const fillerCount = segments.reduce((count, segment) => {
      if (segment.text) {
        const fillers = ['izé', 'hát', 'ugye', 'um', 'uh', 'like']
        return count + fillers.filter(f => segment.text.toLowerCase().includes(f)).length
      }
      return count
    }, 0)
    
    clarityScore -= Math.min(20, fillerCount * 2)
    
    // Add for structured speaking (numbered points, clear transitions)
    const structureIndicators = ['először', 'másodszor', 'végül', 'first', 'second', 'finally']
    const hasStructure = segments.some(s => 
      s.text && structureIndicators.some(ind => s.text.toLowerCase().includes(ind))
    )
    
    if (hasStructure) clarityScore += 10
    
    return Math.max(0, Math.min(100, clarityScore))
  }
  
  private calculateEngagement(segments: any[], meeting: any): number {
    if (segments.length === 0) return 50
    
    let engagementScore = 50
    
    // Questions indicate engagement
    const questionCount = segments.filter(s => s.text && s.text.includes('?')).length
    engagementScore += Math.min(25, questionCount * 5)
    
    // References to others indicate engagement
    const referenceCount = segments.filter(s => 
      s.text && s.text.match(/mondta|said|említette|mentioned/)
    ).length
    engagementScore += Math.min(15, referenceCount * 3)
    
    // Active participation throughout meeting
    if (meeting.duration) {
      const firstSegmentTime = segments[0]?.start || 0
      const lastSegmentTime = segments[segments.length - 1]?.end || 0
      const participationSpan = lastSegmentTime - firstSegmentTime
      const participationRatio = participationSpan / meeting.duration
      
      if (participationRatio > 0.7) engagementScore += 10
    }
    
    return Math.max(0, Math.min(100, engagementScore))
  }
  
  private calculateInfluence(segments: any[], meeting: any): number {
    let influenceScore = 50
    
    // Check if ideas were adopted (mentioned in action items)
    if (meeting.action_items && segments.length > 0) {
      const speakerWords = segments
        .map(s => s.text?.toLowerCase() || '')
        .join(' ')
        .split(/\s+/)
      
      const actionItemWords = meeting.action_items
        .map((item: any) => item.task?.toLowerCase() || '')
        .join(' ')
        .split(/\s+/)
      
      const overlap = speakerWords.filter(word => 
        word.length > 4 && actionItemWords.includes(word)
      ).length
      
      influenceScore += Math.min(30, overlap * 2)
    }
    
    // Decision-making language
    const decisionPhrases = ['javaslom', 'suggest', 'döntés', 'decision', 'fontos', 'important']
    const decisionCount = segments.filter(s => 
      s.text && decisionPhrases.some(phrase => s.text.toLowerCase().includes(phrase))
    ).length
    
    influenceScore += Math.min(20, decisionCount * 5)
    
    return Math.max(0, Math.min(100, influenceScore))
  }
  
  private calculateEfficiency(segments: any[]): number {
    if (segments.length === 0) return 50
    
    let efficiencyScore = 70
    
    // Penalize repetition
    const texts = segments.map(s => s.text?.toLowerCase() || '')
    const uniqueTexts = new Set(texts)
    const repetitionRatio = 1 - (uniqueTexts.size / texts.length)
    
    efficiencyScore -= Math.min(20, repetitionRatio * 50)
    
    // Reward conciseness
    const avgSegmentLength = texts.reduce((sum, text) => 
      sum + text.split(' ').length, 0
    ) / texts.length
    
    if (avgSegmentLength < 30) efficiencyScore += 10
    else if (avgSegmentLength > 50) efficiencyScore -= 10
    
    // Reward getting to the point quickly
    const introductoryPhrases = ['szeretném', 'would like', 'gondoltam', 'thought']
    const hasLongIntros = segments.slice(0, 3).some(s => 
      s.text && introductoryPhrases.some(phrase => s.text.toLowerCase().includes(phrase))
    )
    
    if (!hasLongIntros) efficiencyScore += 10
    
    return Math.max(0, Math.min(100, efficiencyScore))
  }
  
  private async compareWithPrevious(
    speakerId: string,
    meetingId: string,
    currentPerformance: any
  ): Promise<{ improvements: string[]; regressions: string[] }> {
    const improvements: string[] = []
    const regressions: string[] = []
    
    // Get previous meeting performance (simplified)
    // In real implementation, fetch from database
    const previousPerformance = {
      clarity: 65,
      engagement: 70,
      influence: 55,
      efficiency: 60
    }
    
    // Compare metrics
    if (currentPerformance.clarity > previousPerformance.clarity + 10) {
      improvements.push('Világosabb kommunikáció')
    } else if (currentPerformance.clarity < previousPerformance.clarity - 10) {
      regressions.push('Kevésbé világos fogalmazás')
    }
    
    if (currentPerformance.engagement > previousPerformance.engagement + 10) {
      improvements.push('Aktívabb részvétel')
    } else if (currentPerformance.engagement < previousPerformance.engagement - 10) {
      regressions.push('Csökkent aktivitás')
    }
    
    if (currentPerformance.influence > previousPerformance.influence + 10) {
      improvements.push('Növekvő befolyás')
    }
    
    if (currentPerformance.efficiency > previousPerformance.efficiency + 10) {
      improvements.push('Hatékonyabb időfelhasználás')
    } else if (currentPerformance.efficiency < previousPerformance.efficiency - 10) {
      regressions.push('Kevésbé hatékony kommunikáció')
    }
    
    return { improvements, regressions }
  }
  
  private identifyTrends(
    metrics: SpeakerEvolution['metrics']
  ): SpeakerEvolution['trends'] {
    const trends = {
      improving: [] as string[],
      declining: [] as string[],
      stable: [] as string[]
    }
    
    if (metrics.length < 3) {
      return trends
    }
    
    // Analyze each performance dimension
    const dimensions: Array<keyof typeof metrics[0]['performance']> = [
      'clarity', 'engagement', 'influence', 'efficiency'
    ]
    
    dimensions.forEach(dimension => {
      const values = metrics.map(m => m.performance[dimension])
      const trend = this.calculateTrend(values)
      
      const dimensionName = {
        clarity: 'Világosság',
        engagement: 'Aktivitás',
        influence: 'Befolyás',
        efficiency: 'Hatékonyság'
      }[dimension]
      
      if (trend > 0.1) {
        trends.improving.push(dimensionName)
      } else if (trend < -0.1) {
        trends.declining.push(dimensionName)
      } else {
        trends.stable.push(dimensionName)
      }
    })
    
    return trends
  }
  
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    // Simple linear regression
    const n = values.length
    const sumX = values.reduce((sum, _, i) => sum + i, 0)
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0)
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    return slope
  }
  
  private async generateEvolutionRecommendations(
    speakerId: string,
    metrics: SpeakerEvolution['metrics'],
    trends: SpeakerEvolution['trends']
  ): Promise<string[]> {
    const recommendations: string[] = []
    
    // Recommendations based on trends
    if (trends.declining.length > 0) {
      recommendations.push(
        `Figyeljen oda a következő területekre: ${trends.declining.join(', ')}. ` +
        `Ezek csökkenő tendenciát mutatnak.`
      )
    }
    
    if (trends.improving.length > 0) {
      recommendations.push(
        `Folytassa a jó munkát: ${trends.improving.join(', ')} területen javulás látható.`
      )
    }
    
    // Recommendations based on latest performance
    const latestMetrics = metrics[0]?.performance
    if (latestMetrics) {
      if (latestMetrics.clarity < 60) {
        recommendations.push(
          'Gyakorolja a strukturált beszédet: használjon számozott pontokat és világos átmeneteket.'
        )
      }
      
      if (latestMetrics.engagement < 60) {
        recommendations.push(
          'Tegyen fel több kérdést és hivatkozzon mások gondolataira.'
        )
      }
      
      if (latestMetrics.influence < 60) {
        recommendations.push(
          'Fogalmazzon meg konkrét javaslatokat és használjon meggyőző érveket.'
        )
      }
      
      if (latestMetrics.efficiency < 60) {
        recommendations.push(
          'Legyen tömörebb: kerülje az ismétléseket és térjen gyorsan a lényegre.'
        )
      }
    }
    
    // Pattern-based recommendations
    const consistentlyLow = Object.entries(latestMetrics || {})
      .filter(([_, value]) => value < 50)
      .map(([key]) => key)
    
    if (consistentlyLow.length >= 2) {
      recommendations.push(
        'Fontolja meg egy kommunikációs tréning elvégzését a fejlődés felgyorsítására.'
      )
    }
    
    return recommendations.slice(0, 5) // Limit to top 5 recommendations
  }
  
  private async analyzeEmotionTimeline(
    segments: any[],
    audioFeatures?: any
  ): Promise<EmotionalAnalysis['timeline']> {
    const timeline: EmotionalAnalysis['timeline'] = []
    
    for (const segment of segments) {
      if (segment.text) {
        // Use Claude for emotion detection
        const emotionPrompt = `
          Analyze the emotional tone of this text. Return only the dominant emotion and intensity (0-100).
          Text: "${segment.text}"
          
          Possible emotions: confidence, stress, enthusiasm, frustration, neutral
          
          Format: emotion|intensity
          Example: confidence|75
        `
        
        try {
          const response = await claudeAnalyzer.generateInsights(
            { text: segment.text } as any,
            []
          )
          
          // Parse response (simplified)
          const [emotion, intensityStr] = response.split('|')
          const intensity = parseInt(intensityStr) || 50
          
          timeline.push({
            timestamp: segment.start,
            dominantEmotion: emotion || 'neutral',
            intensity
          })
        } catch (error) {
          // Fallback to simple analysis
          timeline.push({
            timestamp: segment.start,
            dominantEmotion: 'neutral',
            intensity: 50
          })
        }
      }
    }
    
    return timeline
  }
  
  private calculateAverageEmotions(
    timeline: EmotionalAnalysis['timeline']
  ): EmotionalAnalysis['emotions'] {
    const emotionSums = {
      confidence: 0,
      stress: 0,
      enthusiasm: 0,
      frustration: 0,
      engagement: 0
    }
    
    const emotionCounts = {
      confidence: 0,
      stress: 0,
      enthusiasm: 0,
      frustration: 0,
      engagement: 0
    }
    
    timeline.forEach(point => {
      const emotion = point.dominantEmotion as keyof typeof emotionSums
      if (emotion in emotionSums) {
        emotionSums[emotion] += point.intensity
        emotionCounts[emotion]++
      }
      
      // Engagement is derived from other emotions
      if (emotion === 'enthusiasm' || emotion === 'confidence') {
        emotionSums.engagement += point.intensity * 0.7
        emotionCounts.engagement++
      }
    })
    
    // Calculate averages
    const emotions: EmotionalAnalysis['emotions'] = {
      confidence: 0,
      stress: 0,
      enthusiasm: 0,
      frustration: 0,
      engagement: 0
    }
    
    Object.keys(emotions).forEach(emotion => {
      const key = emotion as keyof typeof emotions
      emotions[key] = emotionCounts[key] > 0
        ? Math.round(emotionSums[key] / emotionCounts[key])
        : 50
    })
    
    return emotions
  }
  
  private async detectEmotionalTriggers(
    segments: any[],
    timeline: EmotionalAnalysis['timeline']
  ): Promise<EmotionalAnalysis['triggers']> {
    const triggers: EmotionalAnalysis['triggers'] = []
    
    // Look for significant emotional changes
    for (let i = 1; i < timeline.length; i++) {
      const current = timeline[i]
      const previous = timeline[i - 1]
      
      // Detect significant shifts (>30 point change)
      if (Math.abs(current.intensity - previous.intensity) > 30 ||
          current.dominantEmotion !== previous.dominantEmotion) {
        
        // Find the corresponding segment
        const segment = segments.find(s => 
          Math.abs(s.start - current.timestamp) < 1
        )
        
        if (segment?.text) {
          triggers.push({
            emotion: current.dominantEmotion,
            context: segment.text.substring(0, 100) + '...',
            timestamp: current.timestamp
          })
        }
      }
    }
    
    return triggers
  }
}

// Export singleton instance
export const speakerAnalyzer = new SpeakerAnalyzer()