import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'

export interface MeetingPrediction {
  topics: Array<{
    topic: string
    probability: number
    context: string
  }>
  estimatedDuration: number
  estimatedCost: number
  insights: string[]
  patterns: Array<{
    type: 'recurring_topic' | 'question_pattern' | 'time_pattern' | 'participant_behavior'
    description: string
    confidence: number
  }>
}

export interface ParticipantAnalysis {
  email: string
  name?: string
  meetingCount: number
  averageSpeakingTime: number
  commonTopics: string[]
  preferredMeetingTimes: string[]
  typicalQuestions: string[]
}

export interface MeetingCostEstimate {
  totalCost: number
  breakdown: Array<{
    participant: string
    hourlyRate: number
    estimatedTime: number
    cost: number
  }>
  currency: string
}

export class PredictiveMeetingEngine {
  private supabase = createClient()
  
  /**
   * Predict likely discussion topics based on past meetings
   */
  async predictMeetingTopics(
    organizationId: string,
    participants: string[],
    meetingType?: string
  ): Promise<Array<{ topic: string; probability: number; context: string }>> {
    const startTime = Date.now()
    
    try {
      // Get historical meetings with similar participants
      const { data: historicalMeetings } = await this.supabase
        .from('meetings')
        .select('transcript, summary, action_items, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (!historicalMeetings || historicalMeetings.length === 0) {
        return []
      }
      
      // Analyze topic frequency and patterns
      const topicFrequency = new Map<string, { count: number; contexts: string[] }>()
      
      historicalMeetings.forEach(meeting => {
        // Extract topics from transcript
        if (meeting.transcript && meeting.transcript.topics) {
          meeting.transcript.topics.forEach((topic: string) => {
            const existing = topicFrequency.get(topic) || { count: 0, contexts: [] }
            existing.count++
            if (meeting.summary) {
              existing.contexts.push(meeting.summary.substring(0, 100))
            }
            topicFrequency.set(topic, existing)
          })
        }
        
        // Extract topics from action items
        if (meeting.action_items && Array.isArray(meeting.action_items)) {
          meeting.action_items.forEach((item: any) => {
            if (item.task) {
              const topicFromTask = this.extractTopicFromText(item.task)
              if (topicFromTask) {
                const existing = topicFrequency.get(topicFromTask) || { count: 0, contexts: [] }
                existing.count++
                existing.contexts.push(item.task)
                topicFrequency.set(topicFromTask, existing)
              }
            }
          })
        }
      })
      
      // Calculate probabilities and sort by relevance
      const totalMeetings = historicalMeetings.length
      const predictions = Array.from(topicFrequency.entries())
        .map(([topic, data]) => ({
          topic,
          probability: Math.min((data.count / totalMeetings) * 100, 90), // Cap at 90%
          context: data.contexts[0] || 'Gyakran előforduló téma'
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5)
      
      // Track metrics
      trackMetric('ai.topic_prediction_duration', (Date.now() - startTime) / 1000)
      trackMetric('ai.topics_predicted', predictions.length)
      
      return predictions
    } catch (error) {
      console.error('Error predicting topics:', error)
      trackMetric('ai.topic_prediction_error', 1)
      return []
    }
  }
  
  /**
   * Estimate meeting duration based on type, participants, and history
   */
  async estimateDuration(
    organizationId: string,
    meetingType: string,
    participantCount: number,
    topics?: string[]
  ): Promise<number> {
    try {
      // Get historical meetings of similar type
      const { data: historicalMeetings } = await this.supabase
        .from('meetings')
        .select('duration_seconds, speakers')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .not('duration_seconds', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!historicalMeetings || historicalMeetings.length === 0) {
        // Default estimates by meeting type
        const defaultDurations: Record<string, number> = {
          standup: 15,
          planning: 60,
          retrospective: 90,
          one_on_one: 30,
          review: 45,
          custom: 60
        }
        return defaultDurations[meetingType] || 60
      }
      
      // Calculate average duration based on participant count
      const relevantMeetings = historicalMeetings.filter(m => {
        const speakerCount = m.speakers ? m.speakers.length : 1
        return Math.abs(speakerCount - participantCount) <= 2
      })
      
      if (relevantMeetings.length > 0) {
        const avgSeconds = relevantMeetings.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) / relevantMeetings.length
        const avgMinutes = Math.round(avgSeconds / 60)
        
        // Adjust based on number of topics
        const topicAdjustment = topics ? topics.length * 5 : 0
        
        return Math.min(avgMinutes + topicAdjustment, 180) // Cap at 3 hours
      }
      
      return 60 // Default to 1 hour
    } catch (error) {
      console.error('Error estimating duration:', error)
      return 60
    }
  }
  
  /**
   * Calculate meeting cost based on participant time and hourly rates
   */
  async calculateCosts(
    organizationId: string,
    participants: Array<{ email: string; hourlyRate?: number }>,
    estimatedDuration: number
  ): Promise<MeetingCostEstimate> {
    try {
      // Get organization settings for default hourly rates
      const { data: orgData } = await this.supabase
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single()
      
      const defaultHourlyRate = orgData?.settings?.defaultHourlyRate || 15000 // 15,000 HUF/hour default
      
      // Calculate cost breakdown
      const breakdown = participants.map(participant => {
        const hourlyRate = participant.hourlyRate || defaultHourlyRate
        const estimatedHours = estimatedDuration / 60
        const cost = hourlyRate * estimatedHours
        
        return {
          participant: participant.email,
          hourlyRate,
          estimatedTime: estimatedDuration,
          cost: Math.round(cost)
        }
      })
      
      const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0)
      
      trackMetric('ai.meeting_cost_calculated', totalCost, {
        participants: participants.length,
        duration: estimatedDuration
      })
      
      return {
        totalCost,
        breakdown,
        currency: 'HUF'
      }
    } catch (error) {
      console.error('Error calculating costs:', error)
      return {
        totalCost: 0,
        breakdown: [],
        currency: 'HUF'
      }
    }
  }
  
  /**
   * Generate insights based on meeting patterns
   */
  async generateInsights(
    organizationId: string,
    participants: string[],
    meetingType?: string
  ): Promise<string[]> {
    try {
      const insights: string[] = []
      
      // Get historical meetings
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!meetings || meetings.length === 0) {
        return ['Ez lesz az első rögzített meeting ezekkel a résztvevőkkel.']
      }
      
      // Analyze patterns
      const patterns = this.analyzePatterns(meetings, participants)
      
      // Generate insights based on patterns
      if (patterns.recurringQuestions.length > 0) {
        insights.push(`Gyakran felmerülő kérdések: ${patterns.recurringQuestions.slice(0, 2).join(', ')}`)
      }
      
      if (patterns.commonActionItems.length > 0) {
        insights.push(`Tipikus akciók: ${patterns.commonActionItems.slice(0, 2).join(', ')}`)
      }
      
      if (patterns.averageDuration) {
        insights.push(`Átlagos időtartam: ${patterns.averageDuration} perc`)
      }
      
      if (patterns.bestDay) {
        insights.push(`Leggyakoribb nap: ${patterns.bestDay}`)
      }
      
      if (patterns.followUpRate > 0.7) {
        insights.push('Magas követési arány - a megbeszélt akciók általában megvalósulnak')
      }
      
      // Meeting type specific insights
      if (meetingType === 'standup' && patterns.averageDuration > 20) {
        insights.push('A standup meetingek hosszabbak a szokásosnál - érdemes lehet rövidíteni')
      }
      
      if (meetingType === 'retrospective' && patterns.sentimentTrend === 'improving') {
        insights.push('A csapat hangulata javuló tendenciát mutat')
      }
      
      return insights.slice(0, 5) // Return top 5 insights
    } catch (error) {
      console.error('Error generating insights:', error)
      return []
    }
  }
  
  /**
   * Analyze participant history
   */
  async analyzeParticipant(
    organizationId: string,
    participantEmail: string
  ): Promise<ParticipantAnalysis> {
    try {
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (!meetings) {
        return this.getDefaultParticipantAnalysis(participantEmail)
      }
      
      // Filter meetings where participant was present
      const participantMeetings = meetings.filter(m => 
        m.speakers?.some((s: any) => s.email === participantEmail || s.name === participantEmail)
      )
      
      if (participantMeetings.length === 0) {
        return this.getDefaultParticipantAnalysis(participantEmail)
      }
      
      // Analyze speaking time
      let totalSpeakingTime = 0
      const topics = new Map<string, number>()
      const meetingTimes = new Map<string, number>()
      const questions: string[] = []
      
      participantMeetings.forEach(meeting => {
        // Calculate speaking time
        const speaker = meeting.speakers?.find((s: any) => 
          s.email === participantEmail || s.name === participantEmail
        )
        if (speaker?.speakingTime) {
          totalSpeakingTime += speaker.speakingTime
        }
        
        // Extract topics
        if (meeting.transcript?.topics) {
          meeting.transcript.topics.forEach((topic: string) => {
            topics.set(topic, (topics.get(topic) || 0) + 1)
          })
        }
        
        // Track meeting times
        const meetingHour = new Date(meeting.created_at).getHours()
        const timeSlot = this.getTimeSlot(meetingHour)
        meetingTimes.set(timeSlot, (meetingTimes.get(timeSlot) || 0) + 1)
        
        // Extract questions (simplified)
        if (meeting.transcript?.text) {
          const questionMatches = meeting.transcript.text.match(/[^.!?]*\?/g) || []
          questions.push(...questionMatches.slice(0, 2))
        }
      })
      
      // Sort and get top items
      const commonTopics = Array.from(topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic)
      
      const preferredMeetingTimes = Array.from(meetingTimes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([time]) => time)
      
      return {
        email: participantEmail,
        meetingCount: participantMeetings.length,
        averageSpeakingTime: Math.round(totalSpeakingTime / participantMeetings.length),
        commonTopics,
        preferredMeetingTimes,
        typicalQuestions: questions.slice(0, 5)
      }
    } catch (error) {
      console.error('Error analyzing participant:', error)
      return this.getDefaultParticipantAnalysis(participantEmail)
    }
  }
  
  /**
   * Helper: Extract topic from text
   */
  private extractTopicFromText(text: string): string | null {
    // Simple keyword extraction - could be enhanced with NLP
    const keywords = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !this.isCommonWord(word))
    
    return keywords[0] || null
  }
  
  /**
   * Helper: Check if word is common
   */
  private isCommonWord(word: string): boolean {
    const commonWords = ['hogy', 'vagy', 'akkor', 'most', 'lehet', 'kell', 'lesz', 'volt']
    return commonWords.includes(word)
  }
  
  /**
   * Helper: Analyze meeting patterns
   */
  private analyzePatterns(meetings: any[], participants: string[]) {
    const questions: string[] = []
    const actionItems: string[] = []
    const durations: number[] = []
    const days: string[] = []
    let completedActions = 0
    let totalActions = 0
    
    meetings.forEach(meeting => {
      // Duration
      if (meeting.duration_seconds) {
        durations.push(Math.round(meeting.duration_seconds / 60))
      }
      
      // Day of week
      const day = new Date(meeting.created_at).toLocaleDateString('hu-HU', { weekday: 'long' })
      days.push(day)
      
      // Action items
      if (meeting.action_items && Array.isArray(meeting.action_items)) {
        meeting.action_items.forEach((item: any) => {
          actionItems.push(item.task)
          totalActions++
          if (item.completed) completedActions++
        })
      }
    })
    
    // Calculate most common values
    const dayFreq = this.getMostFrequent(days)
    const avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null
    
    return {
      recurringQuestions: questions.slice(0, 5),
      commonActionItems: this.getMostFrequent(actionItems, 5),
      averageDuration: avgDuration,
      bestDay: dayFreq[0] || null,
      followUpRate: totalActions > 0 ? completedActions / totalActions : 0,
      sentimentTrend: 'neutral' // Could be enhanced with sentiment analysis
    }
  }
  
  /**
   * Helper: Get most frequent items
   */
  private getMostFrequent(items: string[], limit: number = 1): string[] {
    const frequency = new Map<string, number>()
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1)
    })
    
    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([item]) => item)
  }
  
  /**
   * Helper: Get time slot
   */
  private getTimeSlot(hour: number): string {
    if (hour < 9) return 'Kora reggel'
    if (hour < 12) return 'Délelőtt'
    if (hour < 14) return 'Ebédidő'
    if (hour < 17) return 'Délután'
    if (hour < 20) return 'Este'
    return 'Késő este'
  }
  
  /**
   * Helper: Get default participant analysis
   */
  private getDefaultParticipantAnalysis(email: string): ParticipantAnalysis {
    return {
      email,
      meetingCount: 0,
      averageSpeakingTime: 0,
      commonTopics: [],
      preferredMeetingTimes: [],
      typicalQuestions: []
    }
  }
}

// Export singleton instance
export const predictiveMeetingEngine = new PredictiveMeetingEngine()