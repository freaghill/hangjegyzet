import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'
import { meetingAnalyticsEngine } from './meeting-analytics'
import { speakerAnalyzer } from './speaker-analysis'

export interface OptimalParticipants {
  required: Array<{
    userId: string
    name: string
    reason: string
    expertise: string[]
  }>
  optional: Array<{
    userId: string
    name: string
    reason: string
    contribution: string
  }>
  notRecommended: Array<{
    userId: string
    name: string
    reason: string
  }>
  suggestedAdditions: Array<{
    role: string
    expertise: string
    reason: string
  }>
}

export interface OptimalTimeSlot {
  start: Date
  end: Date
  score: number // 0-100
  factors: {
    productivity: number
    availability: number
    energyLevel: number
    conflictFree: boolean
  }
  conflicts: Array<{
    type: 'calendar' | 'pattern' | 'preference'
    description: string
  }>
}

export interface MeetingROI {
  costAnalysis: {
    totalCost: number
    breakdown: Array<{
      participant: string
      hourlyRate: number
      duration: number
      cost: number
    }>
    opportunityCost: number
  }
  valueAnalysis: {
    decisionsValue: number
    actionItemsValue: number
    knowledgeTransferValue: number
    relationshipValue: number
    totalValue: number
  }
  roi: number // percentage
  recommendation: 'high_value' | 'acceptable' | 'low_value' | 'cancel'
  alternatives: string[]
}

export interface MeetingQualityPrediction {
  predictedScore: number // 0-100
  confidence: number // 0-100
  factors: {
    participantMix: number
    timing: number
    agenda: number
    duration: number
    preparation: number
  }
  risks: Array<{
    type: string
    probability: number
    impact: string
    mitigation: string
  }>
  successFactors: string[]
}

export interface MeetingStructureSuggestion {
  recommendedDuration: number // minutes
  agendaItems: Array<{
    topic: string
    duration: number
    owner: string
    type: 'discussion' | 'decision' | 'update' | 'brainstorm'
    priority: 'high' | 'medium' | 'low'
  }>
  breakpoints: Array<{
    afterMinutes: number
    duration: number
    purpose: string
  }>
  facilitation: {
    technique: string
    tools: string[]
    roles: Array<{
      role: string
      assignee: string
      responsibilities: string[]
    }>
  }
}

export class MeetingOptimizer {
  private supabase = createClient()
  
  /**
   * Suggests optimal participants based on topic and history
   */
  async suggestOptimalParticipants(
    topic: string,
    organizationId: string,
    requiredParticipants: string[] = []
  ): Promise<OptimalParticipants> {
    const startTime = Date.now()
    
    try {
      // Analyze topic to determine required expertise
      const requiredExpertise = await this.analyzeTopicExpertise(topic)
      
      // Get all organization members
      const { data: members } = await this.supabase
        .from('organization_members')
        .select('user_id, role, expertise')
        .eq('organization_id', organizationId)
      
      if (!members) {
        throw new Error('No organization members found')
      }
      
      // Get historical meeting data for each member
      const memberAnalysis = await Promise.all(
        members.map(async (member) => {
          const history = await this.analyzeMemberHistory(
            member.user_id,
            organizationId,
            topic
          )
          
          return {
            ...member,
            ...history
          }
        })
      )
      
      // Categorize participants
      const required: OptimalParticipants['required'] = []
      const optional: OptimalParticipants['optional'] = []
      const notRecommended: OptimalParticipants['notRecommended'] = []
      
      memberAnalysis.forEach(member => {
        // Check if explicitly required
        if (requiredParticipants.includes(member.user_id)) {
          required.push({
            userId: member.user_id,
            name: member.name || 'Unknown',
            reason: 'Kötelező résztvevő',
            expertise: member.expertise || []
          })
          return
        }
        
        // Analyze fit for this meeting
        const fit = this.calculateParticipantFit(
          member,
          requiredExpertise,
          topic
        )
        
        if (fit.score > 80) {
          required.push({
            userId: member.user_id,
            name: member.name || 'Unknown',
            reason: fit.reason,
            expertise: member.expertise || []
          })
        } else if (fit.score > 50) {
          optional.push({
            userId: member.user_id,
            name: member.name || 'Unknown',
            reason: fit.reason,
            contribution: fit.contribution
          })
        } else if (fit.score < 20 && !requiredParticipants.includes(member.user_id)) {
          notRecommended.push({
            userId: member.user_id,
            name: member.name || 'Unknown',
            reason: fit.reason
          })
        }
      })
      
      // Suggest additional roles if expertise gaps exist
      const suggestedAdditions = this.identifyExpertiseGaps(
        requiredExpertise,
        [...required, ...optional]
      )
      
      const result: OptimalParticipants = {
        required,
        optional,
        notRecommended,
        suggestedAdditions
      }
      
      trackMetric('ai.optimal_participants_suggested', 1, {
        organization_id: organizationId,
        required_count: required.length,
        optional_count: optional.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return result
    } catch (error) {
      console.error('Error suggesting optimal participants:', error)
      trackMetric('ai.optimal_participants_error', 1)
      throw error
    }
  }
  
  /**
   * Finds best time slots based on productivity patterns
   */
  async findBestTimeSlots(
    organizationId: string,
    duration: number, // minutes
    participants: string[],
    dateRange: { start: Date; end: Date }
  ): Promise<OptimalTimeSlot[]> {
    const startTime = Date.now()
    
    try {
      // Get historical meeting patterns
      const patterns = await this.analyzeMeetingPatterns(organizationId)
      
      // Get participant availability (simplified - would integrate with calendar)
      const availability = await this.getParticipantAvailability(
        participants,
        dateRange
      )
      
      // Generate potential time slots
      const potentialSlots = this.generateTimeSlots(
        dateRange,
        duration,
        availability
      )
      
      // Score each slot
      const scoredSlots = await Promise.all(
        potentialSlots.map(async (slot) => {
          const score = await this.scoreTimeSlot(
            slot,
            patterns,
            participants,
            organizationId
          )
          
          return {
            ...slot,
            ...score
          }
        })
      )
      
      // Sort by score and return top 5
      const bestSlots = scoredSlots
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
      
      trackMetric('ai.best_time_slots_found', 1, {
        organization_id: organizationId,
        slots_analyzed: potentialSlots.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return bestSlots
    } catch (error) {
      console.error('Error finding best time slots:', error)
      trackMetric('ai.best_time_slots_error', 1)
      throw error
    }
  }
  
  /**
   * Calculates meeting ROI with cost/productivity analysis
   */
  async calculateMeetingROI(
    meeting: {
      participants: Array<{ userId: string; role: string }>
      duration: number // minutes
      agenda: string[]
      expectedOutcomes: string[]
    },
    organizationId: string
  ): Promise<MeetingROI> {
    const startTime = Date.now()
    
    try {
      // Calculate costs
      const costAnalysis = await this.calculateMeetingCost(
        meeting.participants,
        meeting.duration,
        organizationId
      )
      
      // Estimate value
      const valueAnalysis = await this.estimateMeetingValue(
        meeting,
        organizationId
      )
      
      // Calculate ROI
      const roi = costAnalysis.totalCost > 0
        ? Math.round(((valueAnalysis.totalValue - costAnalysis.totalCost) / costAnalysis.totalCost) * 100)
        : 0
      
      // Determine recommendation
      let recommendation: MeetingROI['recommendation']
      if (roi > 200) recommendation = 'high_value'
      else if (roi > 50) recommendation = 'acceptable'
      else if (roi > -50) recommendation = 'low_value'
      else recommendation = 'cancel'
      
      // Generate alternatives for low-value meetings
      const alternatives = recommendation === 'low_value' || recommendation === 'cancel'
        ? this.generateMeetingAlternatives(meeting, roi)
        : []
      
      const result: MeetingROI = {
        costAnalysis,
        valueAnalysis,
        roi,
        recommendation,
        alternatives
      }
      
      trackMetric('ai.meeting_roi_calculated', 1, {
        organization_id: organizationId,
        roi,
        recommendation,
        duration: (Date.now() - startTime) / 1000
      })
      
      return result
    } catch (error) {
      console.error('Error calculating meeting ROI:', error)
      trackMetric('ai.meeting_roi_error', 1)
      throw error
    }
  }
  
  /**
   * Predicts if a meeting will be productive
   */
  async predictMeetingQuality(
    meeting: {
      participants: string[]
      scheduledTime: Date
      duration: number
      agenda: string[]
      hasPreRead: boolean
    },
    organizationId: string
  ): Promise<MeetingQualityPrediction> {
    const startTime = Date.now()
    
    try {
      // Analyze participant mix
      const participantMixScore = await this.analyzeParticipantMix(
        meeting.participants,
        organizationId
      )
      
      // Analyze timing
      const timingScore = await this.analyzeTimingQuality(
        meeting.scheduledTime,
        meeting.duration,
        organizationId
      )
      
      // Analyze agenda
      const agendaScore = this.analyzeAgendaQuality(
        meeting.agenda,
        meeting.duration
      )
      
      // Analyze duration appropriateness
      const durationScore = this.analyzeDurationAppropriateness(
        meeting.agenda,
        meeting.duration,
        meeting.participants.length
      )
      
      // Analyze preparation
      const preparationScore = meeting.hasPreRead ? 80 : 40
      
      // Calculate overall prediction
      const factors = {
        participantMix: participantMixScore,
        timing: timingScore,
        agenda: agendaScore,
        duration: durationScore,
        preparation: preparationScore
      }
      
      const weights = {
        participantMix: 0.25,
        timing: 0.20,
        agenda: 0.25,
        duration: 0.15,
        preparation: 0.15
      }
      
      const predictedScore = Math.round(
        Object.entries(factors).reduce((sum, [key, value]) => {
          return sum + value * weights[key as keyof typeof weights]
        }, 0)
      )
      
      // Calculate confidence based on data availability
      const confidence = this.calculatePredictionConfidence(
        meeting,
        organizationId
      )
      
      // Identify risks
      const risks = this.identifyMeetingRisks(factors, meeting)
      
      // Identify success factors
      const successFactors = this.identifySuccessFactors(factors, meeting)
      
      const prediction: MeetingQualityPrediction = {
        predictedScore,
        confidence,
        factors,
        risks,
        successFactors
      }
      
      trackMetric('ai.meeting_quality_predicted', 1, {
        organization_id: organizationId,
        predicted_score: predictedScore,
        confidence,
        duration: (Date.now() - startTime) / 1000
      })
      
      return prediction
    } catch (error) {
      console.error('Error predicting meeting quality:', error)
      trackMetric('ai.meeting_quality_prediction_error', 1)
      throw error
    }
  }
  
  /**
   * Suggests optimal meeting structure
   */
  async suggestMeetingStructure(
    topic: string,
    participants: Array<{ userId: string; role: string }>,
    objectives: string[],
    constraints?: {
      maxDuration?: number
      mustInclude?: string[]
      preferredStyle?: 'formal' | 'informal' | 'workshop'
    }
  ): Promise<MeetingStructureSuggestion> {
    const startTime = Date.now()
    
    try {
      // Analyze topic complexity
      const complexity = await this.analyzeTopicComplexity(topic, objectives)
      
      // Determine optimal duration
      const recommendedDuration = this.calculateOptimalDuration(
        complexity,
        objectives.length,
        participants.length,
        constraints?.maxDuration
      )
      
      // Generate agenda items
      const agendaItems = await this.generateAgendaItems(
        topic,
        objectives,
        participants,
        recommendedDuration
      )
      
      // Determine break points
      const breakpoints = this.calculateBreakpoints(
        recommendedDuration,
        agendaItems
      )
      
      // Suggest facilitation approach
      const facilitation = await this.suggestFacilitation(
        constraints?.preferredStyle || 'formal',
        participants,
        complexity
      )
      
      const structure: MeetingStructureSuggestion = {
        recommendedDuration,
        agendaItems,
        breakpoints,
        facilitation
      }
      
      trackMetric('ai.meeting_structure_suggested', 1, {
        topic_complexity: complexity,
        recommended_duration: recommendedDuration,
        agenda_items: agendaItems.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return structure
    } catch (error) {
      console.error('Error suggesting meeting structure:', error)
      trackMetric('ai.meeting_structure_error', 1)
      throw error
    }
  }
  
  // Private helper methods
  
  private async analyzeTopicExpertise(topic: string): Promise<string[]> {
    // Analyze topic to determine required expertise areas
    const expertiseKeywords = {
      'technical': ['fejlesztés', 'development', 'architektúra', 'architecture', 'implementáció'],
      'product': ['termék', 'product', 'feature', 'funkció', 'user experience'],
      'sales': ['értékesítés', 'sales', 'ügyfél', 'customer', 'deal'],
      'marketing': ['marketing', 'kampány', 'campaign', 'brand', 'márka'],
      'finance': ['pénzügy', 'finance', 'költségvetés', 'budget', 'ROI'],
      'hr': ['HR', 'munkaerő', 'toborzás', 'recruitment', 'csapat'],
      'strategy': ['stratégia', 'strategy', 'terv', 'plan', 'vision'],
      'operations': ['működés', 'operations', 'folyamat', 'process', 'efficiency']
    }
    
    const requiredExpertise: string[] = []
    const topicLower = topic.toLowerCase()
    
    Object.entries(expertiseKeywords).forEach(([expertise, keywords]) => {
      if (keywords.some(keyword => topicLower.includes(keyword))) {
        requiredExpertise.push(expertise)
      }
    })
    
    // Default to general if no specific expertise detected
    if (requiredExpertise.length === 0) {
      requiredExpertise.push('general')
    }
    
    return requiredExpertise
  }
  
  private async analyzeMemberHistory(
    userId: string,
    organizationId: string,
    topic: string
  ): Promise<any> {
    // Get member's meeting history
    const { data: meetings } = await this.supabase
      .from('meetings')
      .select('id, title, summary, effectiveness_score')
      .eq('organization_id', organizationId)
      .contains('participants', [userId])
      .limit(20)
    
    if (!meetings || meetings.length === 0) {
      return {
        participationRate: 0,
        averageEffectiveness: 50,
        topicRelevance: 0,
        recentActivity: false
      }
    }
    
    // Calculate metrics
    const participationRate = meetings.length / 20 * 100
    const averageEffectiveness = meetings.reduce((sum, m) => 
      sum + (m.effectiveness_score || 50), 0
    ) / meetings.length
    
    // Check topic relevance
    const topicWords = topic.toLowerCase().split(' ')
    const relevantMeetings = meetings.filter(m => 
      topicWords.some(word => 
        (m.title?.toLowerCase().includes(word) || 
         m.summary?.toLowerCase().includes(word))
      )
    )
    const topicRelevance = (relevantMeetings.length / meetings.length) * 100
    
    // Check recent activity (within last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentActivity = meetings.some(m => 
      new Date(m.created_at) > thirtyDaysAgo
    )
    
    return {
      participationRate,
      averageEffectiveness,
      topicRelevance,
      recentActivity,
      name: userId // Would be fetched from user profile
    }
  }
  
  private calculateParticipantFit(
    member: any,
    requiredExpertise: string[],
    topic: string
  ): { score: number; reason: string; contribution: string } {
    let score = 50 // Base score
    const reasons: string[] = []
    let contribution = ''
    
    // Check expertise match
    const expertiseMatch = member.expertise?.filter((e: string) => 
      requiredExpertise.includes(e)
    ).length || 0
    
    if (expertiseMatch > 0) {
      score += expertiseMatch * 20
      reasons.push(`${expertiseMatch} releváns szakterület`)
      contribution = 'Szakmai tudás'
    }
    
    // Check topic relevance from history
    if (member.topicRelevance > 50) {
      score += 20
      reasons.push('Tapasztalat hasonló témákban')
      contribution = 'Korábbi tapasztalat'
    }
    
    // Check effectiveness in past meetings
    if (member.averageEffectiveness > 70) {
      score += 15
      reasons.push('Magas hatékonyság korábbi meetingeken')
    }
    
    // Penalize low participation
    if (member.participationRate < 30 && !member.recentActivity) {
      score -= 20
      reasons.push('Alacsony részvételi arány')
    }
    
    // Special roles
    if (member.role === 'decision_maker' && topic.includes('döntés')) {
      score += 30
      reasons.push('Döntéshozó')
      contribution = 'Döntéshozatal'
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      reason: reasons.join(', ') || 'Általános résztvevő',
      contribution: contribution || 'Általános hozzájárulás'
    }
  }
  
  private identifyExpertiseGaps(
    requiredExpertise: string[],
    selectedParticipants: any[]
  ): OptimalParticipants['suggestedAdditions'] {
    const gaps: OptimalParticipants['suggestedAdditions'] = []
    
    // Check which expertise areas are not covered
    const coveredExpertise = new Set(
      selectedParticipants.flatMap(p => p.expertise || [])
    )
    
    requiredExpertise.forEach(expertise => {
      if (!coveredExpertise.has(expertise)) {
        const suggestion = {
          'technical': {
            role: 'Technikai szakértő',
            expertise: 'Fejlesztés és architektúra',
            reason: 'Technikai kérdések megválaszolása'
          },
          'product': {
            role: 'Termékmenedzser',
            expertise: 'Termékstratégia és UX',
            reason: 'Termék perspektíva biztosítása'
          },
          'sales': {
            role: 'Értékesítési vezető',
            expertise: 'Ügyfélkapcsolatok és értékesítés',
            reason: 'Piaci visszajelzés és üzleti szempont'
          },
          'finance': {
            role: 'Pénzügyi kontrolling',
            expertise: 'Költségvetés és pénzügyi elemzés',
            reason: 'Pénzügyi hatások értékelése'
          }
        }[expertise]
        
        if (suggestion) {
          gaps.push(suggestion)
        }
      }
    })
    
    return gaps
  }
  
  private async analyzeMeetingPatterns(organizationId: string): Promise<any> {
    // Get historical meeting data
    const { data: meetings } = await this.supabase
      .from('meetings')
      .select('created_at, actual_duration, effectiveness_score')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (!meetings || meetings.length === 0) {
      return {
        productiveHours: [9, 10, 14, 15], // Default productive hours
        averageDuration: 60,
        effectivenessByHour: {}
      }
    }
    
    // Analyze patterns
    const effectivenessByHour: Record<number, { total: number; count: number }> = {}
    
    meetings.forEach(meeting => {
      const hour = new Date(meeting.created_at).getHours()
      if (!effectivenessByHour[hour]) {
        effectivenessByHour[hour] = { total: 0, count: 0 }
      }
      
      effectivenessByHour[hour].total += meeting.effectiveness_score || 50
      effectivenessByHour[hour].count++
    })
    
    // Find most productive hours
    const hourScores = Object.entries(effectivenessByHour)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        score: data.total / data.count
      }))
      .sort((a, b) => b.score - a.score)
    
    const productiveHours = hourScores
      .slice(0, 4)
      .map(h => h.hour)
      .sort((a, b) => a - b)
    
    const averageDuration = meetings.reduce((sum, m) => 
      sum + (m.actual_duration || 60), 0
    ) / meetings.length
    
    return {
      productiveHours,
      averageDuration: Math.round(averageDuration),
      effectivenessByHour
    }
  }
  
  private async getParticipantAvailability(
    participants: string[],
    dateRange: { start: Date; end: Date }
  ): Promise<any> {
    // Simplified availability - would integrate with calendar API
    // For now, assume standard working hours with some blocked slots
    const availability: Record<string, Array<{ start: Date; end: Date }>> = {}
    
    participants.forEach(participant => {
      availability[participant] = []
      
      // Generate available slots for each day
      const current = new Date(dateRange.start)
      while (current <= dateRange.end) {
        // Skip weekends
        if (current.getDay() !== 0 && current.getDay() !== 6) {
          // Morning slot
          const morningStart = new Date(current)
          morningStart.setHours(9, 0, 0, 0)
          const morningEnd = new Date(current)
          morningEnd.setHours(12, 0, 0, 0)
          
          // Afternoon slot
          const afternoonStart = new Date(current)
          afternoonStart.setHours(14, 0, 0, 0)
          const afternoonEnd = new Date(current)
          afternoonEnd.setHours(17, 0, 0, 0)
          
          availability[participant].push(
            { start: morningStart, end: morningEnd },
            { start: afternoonStart, end: afternoonEnd }
          )
        }
        
        current.setDate(current.getDate() + 1)
      }
    })
    
    return availability
  }
  
  private generateTimeSlots(
    dateRange: { start: Date; end: Date },
    duration: number,
    availability: any
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = []
    const slotDuration = duration * 60 * 1000 // Convert to milliseconds
    
    // Find common available times
    const participants = Object.keys(availability)
    if (participants.length === 0) return slots
    
    // Get first participant's availability as base
    const baseSlots = availability[participants[0]] || []
    
    baseSlots.forEach(baseSlot => {
      // Check if all participants are available
      const allAvailable = participants.every(participant => {
        return availability[participant].some((slot: any) => 
          slot.start <= baseSlot.start && slot.end >= baseSlot.end
        )
      })
      
      if (allAvailable) {
        // Generate slots within this time window
        let currentStart = new Date(baseSlot.start)
        
        while (currentStart.getTime() + slotDuration <= baseSlot.end.getTime()) {
          const slotEnd = new Date(currentStart.getTime() + slotDuration)
          slots.push({ start: new Date(currentStart), end: slotEnd })
          
          // Move to next 30-minute increment
          currentStart.setMinutes(currentStart.getMinutes() + 30)
        }
      }
    })
    
    return slots
  }
  
  private async scoreTimeSlot(
    slot: { start: Date; end: Date },
    patterns: any,
    participants: string[],
    organizationId: string
  ): Promise<Omit<OptimalTimeSlot, 'start' | 'end'>> {
    const hour = slot.start.getHours()
    const dayOfWeek = slot.start.getDay()
    
    // Calculate productivity score based on historical patterns
    const productivityScore = patterns.effectivenessByHour[hour]
      ? (patterns.effectivenessByHour[hour].total / patterns.effectivenessByHour[hour].count)
      : 50
    
    // Calculate availability score (simplified)
    const availabilityScore = 100 // Assume full availability for generated slots
    
    // Calculate energy level based on time of day
    let energyLevel = 50
    if (hour >= 9 && hour <= 11) energyLevel = 85 // Morning peak
    else if (hour >= 14 && hour <= 16) energyLevel = 75 // Afternoon focus
    else if (hour === 13) energyLevel = 40 // Post-lunch dip
    else if (hour >= 17) energyLevel = 60 // End of day
    
    // Check for conflicts
    const conflicts: OptimalTimeSlot['conflicts'] = []
    
    // Check if it's a typical meeting-heavy time
    if (dayOfWeek === 1 && hour >= 9 && hour <= 11) {
      conflicts.push({
        type: 'pattern',
        description: 'Hétfő reggel - gyakran túlterhelt időszak'
      })
    }
    
    if (hour === 12 || hour === 13) {
      conflicts.push({
        type: 'preference',
        description: 'Ebédidő - alacsonyabb koncentráció'
      })
    }
    
    // Calculate overall score
    const score = Math.round(
      productivityScore * 0.4 +
      availabilityScore * 0.3 +
      energyLevel * 0.3
    )
    
    return {
      score,
      factors: {
        productivity: Math.round(productivityScore),
        availability: availabilityScore,
        energyLevel,
        conflictFree: conflicts.length === 0
      },
      conflicts
    }
  }
  
  private async calculateMeetingCost(
    participants: Array<{ userId: string; role: string }>,
    duration: number,
    organizationId: string
  ): Promise<MeetingROI['costAnalysis']> {
    // Get hourly rates (simplified - would come from HR system)
    const hourlyRates: Record<string, number> = {
      'executive': 150000, // HUF/hour
      'manager': 80000,
      'senior': 60000,
      'mid': 40000,
      'junior': 25000
    }
    
    const breakdown = participants.map(participant => {
      const hourlyRate = hourlyRates[participant.role] || 40000
      const cost = (hourlyRate / 60) * duration
      
      return {
        participant: participant.userId,
        hourlyRate,
        duration,
        cost: Math.round(cost)
      }
    })
    
    const totalCost = breakdown.reduce((sum, p) => sum + p.cost, 0)
    
    // Calculate opportunity cost (what could be done instead)
    const opportunityCost = totalCost * 0.3 // 30% opportunity cost factor
    
    return {
      totalCost,
      breakdown,
      opportunityCost: Math.round(opportunityCost)
    }
  }
  
  private async estimateMeetingValue(
    meeting: any,
    organizationId: string
  ): Promise<MeetingROI['valueAnalysis']> {
    // Estimate value based on expected outcomes
    let decisionsValue = 0
    let actionItemsValue = 0
    let knowledgeTransferValue = 0
    let relationshipValue = 0
    
    // Decision value estimation
    const decisionKeywords = ['döntés', 'decision', 'választ', 'choose', 'approve', 'jóváhagy']
    const hasDecisions = meeting.agenda.some((item: string) => 
      decisionKeywords.some(keyword => item.toLowerCase().includes(keyword))
    )
    
    if (hasDecisions) {
      decisionsValue = 500000 // Base value for decisions
      
      // Adjust based on participants
      if (meeting.participants.some((p: any) => p.role === 'executive')) {
        decisionsValue *= 2 // Executive decisions have higher value
      }
    }
    
    // Action items value
    const expectedActionItems = Math.ceil(meeting.agenda.length / 2)
    actionItemsValue = expectedActionItems * 100000 // 100k HUF per action item
    
    // Knowledge transfer value
    const knowledgeKeywords = ['képzés', 'training', 'bemutató', 'demo', 'review']
    const hasKnowledgeTransfer = meeting.agenda.some((item: string) => 
      knowledgeKeywords.some(keyword => item.toLowerCase().includes(keyword))
    )
    
    if (hasKnowledgeTransfer) {
      knowledgeTransferValue = meeting.participants.length * 50000 // 50k per participant
    }
    
    // Relationship value (team building, alignment)
    if (meeting.participants.length > 5) {
      relationshipValue = 200000 // Base value for team alignment
    }
    
    const totalValue = decisionsValue + actionItemsValue + knowledgeTransferValue + relationshipValue
    
    return {
      decisionsValue,
      actionItemsValue,
      knowledgeTransferValue,
      relationshipValue,
      totalValue
    }
  }
  
  private generateMeetingAlternatives(
    meeting: any,
    roi: number
  ): string[] {
    const alternatives: string[] = []
    
    if (roi < 0) {
      // Very low value meeting
      alternatives.push('Email-ben való egyeztetés')
      alternatives.push('Rövid (15 perces) státusz update')
      alternatives.push('Írásos jelentés megosztása')
      alternatives.push('Async kommunikáció Slack-en')
    } else if (roi < 50) {
      // Low value meeting
      alternatives.push('A meeting időtartamának csökkentése 50%-kal')
      alternatives.push('Csak a kulcs döntéshozók bevonása')
      alternatives.push('Előre elkészített anyagok alapján döntés')
      alternatives.push('Online meeting személyes helyett')
    }
    
    // Specific alternatives based on meeting type
    if (meeting.agenda.some((item: string) => item.includes('update') || item.includes('státusz'))) {
      alternatives.push('Heti írásos riport bevezetése')
      alternatives.push('Dashboard létrehozása valós idejű státuszhoz')
    }
    
    if (meeting.participants.length > 8) {
      alternatives.push('Kisebb munkacsoport létrehozása')
      alternatives.push('Képviselők küldése teljes csapat helyett')
    }
    
    return alternatives.slice(0, 4) // Return top 4 alternatives
  }
  
  private async analyzeParticipantMix(
    participants: string[],
    organizationId: string
  ): Promise<number> {
    // Analyze how well participants work together
    let score = 70 // Base score
    
    // Check communication style compatibility
    const styles = await Promise.all(
      participants.map(async (participant) => {
        // Would fetch from speaker analysis
        return 'direct' // Placeholder
      })
    )
    
    const uniqueStyles = new Set(styles).size
    
    // Diversity is good, but too much can be challenging
    if (uniqueStyles === 2 || uniqueStyles === 3) {
      score += 20 // Good mix
    } else if (uniqueStyles === 1) {
      score += 10 // Homogeneous - can be efficient
    } else if (uniqueStyles > 3) {
      score -= 10 // Too diverse - potential conflicts
    }
    
    // Check historical collaboration success
    // (Simplified - would analyze past meetings)
    if (participants.length >= 3 && participants.length <= 6) {
      score += 10 // Optimal group size
    } else if (participants.length > 8) {
      score -= 20 // Too large
    }
    
    return Math.max(0, Math.min(100, score))
  }
  
  private async analyzeTimingQuality(
    scheduledTime: Date,
    duration: number,
    organizationId: string
  ): Promise<number> {
    const hour = scheduledTime.getHours()
    const dayOfWeek = scheduledTime.getDay()
    let score = 70 // Base score
    
    // Best times based on research
    if (hour >= 9 && hour <= 11) {
      score += 20 // Morning productivity peak
    } else if (hour >= 14 && hour <= 16) {
      score += 15 // Afternoon focus time
    } else if (hour === 13) {
      score -= 20 // Post-lunch dip
    } else if (hour >= 17) {
      score -= 10 // End of day fatigue
    }
    
    // Day of week factors
    if (dayOfWeek === 2 || dayOfWeek === 3) {
      score += 10 // Tuesday/Wednesday - peak days
    } else if (dayOfWeek === 1) {
      score -= 5 // Monday - catching up
    } else if (dayOfWeek === 5) {
      score -= 10 // Friday - pre-weekend
    }
    
    // Duration factors
    if (duration > 90 && hour >= 15) {
      score -= 15 // Long meetings late in day
    }
    
    return Math.max(0, Math.min(100, score))
  }
  
  private analyzeAgendaQuality(agenda: string[], duration: number): number {
    let score = 50 // Base score
    
    // Check agenda completeness
    if (agenda.length === 0) return 20 // No agenda
    
    // Ideal: 1 agenda item per 15-20 minutes
    const idealItems = Math.floor(duration / 15)
    const ratio = agenda.length / idealItems
    
    if (ratio >= 0.8 && ratio <= 1.2) {
      score += 30 // Well-balanced
    } else if (ratio > 2) {
      score -= 20 // Too packed
    } else if (ratio < 0.5) {
      score -= 10 // Too sparse
    }
    
    // Check for clear objectives
    const objectiveKeywords = ['dönt', 'decide', 'review', 'áttekint', 'plan', 'tervez']
    const hasObjectives = agenda.filter(item => 
      objectiveKeywords.some(keyword => item.toLowerCase().includes(keyword))
    ).length
    
    score += Math.min(20, hasObjectives * 10)
    
    return Math.max(0, Math.min(100, score))
  }
  
  private analyzeDurationAppropriateness(
    agenda: string[],
    duration: number,
    participantCount: number
  ): number {
    let score = 70 // Base score
    
    // Calculate expected duration
    const baseTime = agenda.length * 15 // 15 min per agenda item
    const participantFactor = Math.max(1, participantCount / 5) // More people = more time
    const expectedDuration = baseTime * participantFactor
    
    const ratio = duration / expectedDuration
    
    if (ratio >= 0.8 && ratio <= 1.2) {
      score += 30 // Appropriate duration
    } else if (ratio > 1.5) {
      score -= 20 // Too long
    } else if (ratio < 0.6) {
      score -= 30 // Too short
    }
    
    // Special cases
    if (duration > 120) {
      score -= 10 // Very long meetings are rarely effective
    }
    
    if (duration < 30 && agenda.length > 2) {
      score -= 20 // Too rushed
    }
    
    return Math.max(0, Math.min(100, score))
  }
  
  private calculatePredictionConfidence(
    meeting: any,
    organizationId: string
  ): number {
    let confidence = 50 // Base confidence
    
    // More data points increase confidence
    if (meeting.agenda.length > 0) confidence += 15
    if (meeting.hasPreRead) confidence += 10
    if (meeting.participants.length >= 3 && meeting.participants.length <= 7) confidence += 10
    
    // Historical data availability would increase confidence
    // (Simplified for now)
    confidence += 15
    
    return Math.min(100, confidence)
  }
  
  private identifyMeetingRisks(
    factors: MeetingQualityPrediction['factors'],
    meeting: any
  ): MeetingQualityPrediction['risks'] {
    const risks: MeetingQualityPrediction['risks'] = []
    
    // Low participant mix score
    if (factors.participantMix < 50) {
      risks.push({
        type: 'Résztvevői dinamika',
        probability: 0.7,
        impact: 'Potenciális konfliktusok vagy alacsony együttműködés',
        mitigation: 'Facilitátor kijelölése és alapszabályok meghatározása'
      })
    }
    
    // Poor timing
    if (factors.timing < 50) {
      risks.push({
        type: 'Időzítés',
        probability: 0.6,
        impact: 'Alacsony energia és koncentráció',
        mitigation: 'Rövid szünetek beiktatása és energizáló gyakorlatok'
      })
    }
    
    // Weak agenda
    if (factors.agenda < 50) {
      risks.push({
        type: 'Agenda minőség',
        probability: 0.8,
        impact: 'Céltalan megbeszélés, időpocsékolás',
        mitigation: 'Tiszta célok meghatározása és időkorlátok felállítása'
      })
    }
    
    // Duration issues
    if (factors.duration < 50) {
      risks.push({
        type: 'Időtartam',
        probability: 0.5,
        impact: 'Befejezetlen témák vagy kifáradás',
        mitigation: 'Prioritások felállítása és parkoló létrehozása'
      })
    }
    
    // Large group
    if (meeting.participants.length > 8) {
      risks.push({
        type: 'Nagy csoport',
        probability: 0.7,
        impact: 'Nehéz döntéshozatal és alacsony részvétel',
        mitigation: 'Kiscsoportos megbeszélések és világos döntési folyamat'
      })
    }
    
    return risks
  }
  
  private identifySuccessFactors(
    factors: MeetingQualityPrediction['factors'],
    meeting: any
  ): string[] {
    const successFactors: string[] = []
    
    if (factors.participantMix > 70) {
      successFactors.push('Kiváló résztvevői összetétel')
    }
    
    if (factors.timing > 80) {
      successFactors.push('Optimális időpont')
    }
    
    if (factors.agenda > 70) {
      successFactors.push('Jól strukturált agenda')
    }
    
    if (factors.preparation > 70) {
      successFactors.push('Megfelelő előkészítés')
    }
    
    if (meeting.participants.length >= 4 && meeting.participants.length <= 6) {
      successFactors.push('Ideális csoportméret')
    }
    
    if (meeting.hasPreRead) {
      successFactors.push('Előzetes anyagok biztosítása')
    }
    
    return successFactors
  }
  
  private async analyzeTopicComplexity(
    topic: string,
    objectives: string[]
  ): Promise<number> {
    let complexity = 30 // Base complexity
    
    // Complex topic indicators
    const complexIndicators = [
      'stratégia', 'strategy', 'architektúra', 'architecture',
      'integráció', 'integration', 'reorganizáció', 'transformation',
      'budget', 'költségvetés', 'compliance', 'szabályozás'
    ]
    
    const topicLower = topic.toLowerCase()
    complexIndicators.forEach(indicator => {
      if (topicLower.includes(indicator)) {
        complexity += 15
      }
    })
    
    // More objectives = more complex
    complexity += objectives.length * 10
    
    // Decision requirements add complexity
    const decisionCount = objectives.filter(obj => 
      obj.toLowerCase().includes('dönt') || obj.toLowerCase().includes('decide')
    ).length
    
    complexity += decisionCount * 15
    
    return Math.min(100, complexity)
  }
  
  private calculateOptimalDuration(
    complexity: number,
    objectiveCount: number,
    participantCount: number,
    maxDuration?: number
  ): number {
    // Base duration calculation
    let duration = 30 // Minimum 30 minutes
    
    // Add time based on objectives (15 min each)
    duration += objectiveCount * 15
    
    // Complexity factor
    if (complexity > 70) {
      duration *= 1.5
    } else if (complexity > 50) {
      duration *= 1.2
    }
    
    // Participant factor (more people = more time needed)
    if (participantCount > 6) {
      duration *= 1.2
    } else if (participantCount > 10) {
      duration *= 1.4
    }
    
    // Round to nearest 15 minutes
    duration = Math.round(duration / 15) * 15
    
    // Apply maximum constraint if provided
    if (maxDuration) {
      duration = Math.min(duration, maxDuration)
    }
    
    // Cap at 120 minutes (research shows effectiveness drops after 2 hours)
    return Math.min(duration, 120)
  }
  
  private async generateAgendaItems(
    topic: string,
    objectives: string[],
    participants: Array<{ userId: string; role: string }>,
    duration: number
  ): Promise<MeetingStructureSuggestion['agendaItems']> {
    const agendaItems: MeetingStructureSuggestion['agendaItems'] = []
    
    // Opening (5 minutes)
    agendaItems.push({
      topic: 'Nyitás és célok áttekintése',
      duration: 5,
      owner: participants.find(p => p.role === 'manager')?.userId || participants[0].userId,
      type: 'update',
      priority: 'high'
    })
    
    // Allocate remaining time
    const contentTime = duration - 15 // Remove opening and closing time
    const timePerObjective = Math.floor(contentTime / objectives.length)
    
    // Create agenda items from objectives
    objectives.forEach((objective, index) => {
      const type = objective.toLowerCase().includes('dönt') ? 'decision' :
                   objective.toLowerCase().includes('ötlet') ? 'brainstorm' :
                   objective.toLowerCase().includes('áttek') ? 'update' :
                   'discussion'
      
      agendaItems.push({
        topic: objective,
        duration: timePerObjective,
        owner: participants[index % participants.length].userId,
        type,
        priority: index === 0 ? 'high' : index < objectives.length / 2 ? 'medium' : 'low'
      })
    })
    
    // Closing (10 minutes)
    agendaItems.push({
      topic: 'Összefoglalás és következő lépések',
      duration: 10,
      owner: participants.find(p => p.role === 'manager')?.userId || participants[0].userId,
      type: 'decision',
      priority: 'high'
    })
    
    return agendaItems
  }
  
  private calculateBreakpoints(
    duration: number,
    agendaItems: MeetingStructureSuggestion['agendaItems']
  ): MeetingStructureSuggestion['breakpoints'] {
    const breakpoints: MeetingStructureSuggestion['breakpoints'] = []
    
    // No breaks for meetings under 60 minutes
    if (duration < 60) return breakpoints
    
    // One break for 60-90 minute meetings
    if (duration >= 60 && duration <= 90) {
      breakpoints.push({
        afterMinutes: Math.floor(duration / 2),
        duration: 5,
        purpose: 'Energizáló szünet'
      })
    }
    
    // Multiple breaks for longer meetings
    if (duration > 90) {
      breakpoints.push({
        afterMinutes: 45,
        duration: 10,
        purpose: 'Kávészünet és informális egyeztetés'
      })
      
      if (duration > 120) {
        breakpoints.push({
          afterMinutes: 90,
          duration: 5,
          purpose: 'Mozgás és frissülés'
        })
      }
    }
    
    return breakpoints
  }
  
  private async suggestFacilitation(
    style: 'formal' | 'informal' | 'workshop',
    participants: Array<{ userId: string; role: string }>,
    complexity: number
  ): Promise<MeetingStructureSuggestion['facilitation']> {
    const techniques = {
      formal: {
        technique: 'Strukturált facilitálás',
        tools: ['Időmérő', 'Beszédidő korlátozás', 'Formális szavazás'],
        description: 'Hagyományos meeting vezetés világos szabályokkal'
      },
      informal: {
        technique: 'Nyílt megbeszélés',
        tools: ['Fehértábla', 'Post-it jegyzetek', 'Informális ötletelés'],
        description: 'Rugalmas, beszélgetés-alapú megközelítés'
      },
      workshop: {
        technique: 'Interaktív workshop',
        tools: ['Breakout csoportok', 'Szerepjátékok', 'Vizuális eszközök'],
        description: 'Aktív részvételt igénylő, gyakorlati munka'
      }
    }
    
    const selectedTechnique = techniques[style]
    
    // Assign roles
    const roles: MeetingStructureSuggestion['facilitation']['roles'] = [
      {
        role: 'Facilitátor',
        assignee: participants.find(p => p.role === 'manager')?.userId || participants[0].userId,
        responsibilities: [
          'Meeting vezetése',
          'Időgazdálkodás',
          'Résztvevők bevonása',
          'Konfliktuskezelés'
        ]
      }
    ]
    
    // Add timekeeper for longer meetings
    if (participants.length > 3) {
      roles.push({
        role: 'Időfelelős',
        assignee: participants[1]?.userId || participants[0].userId,
        responsibilities: [
          'Időkorlátok betartatása',
          'Figyelmeztetés idő lejárta előtt',
          'Szünetek koordinálása'
        ]
      })
    }
    
    // Add note-taker
    roles.push({
      role: 'Jegyzetelő',
      assignee: participants[participants.length - 1]?.userId || participants[0].userId,
      responsibilities: [
        'Kulcs döntések rögzítése',
        'Action itemek követése',
        'Összefoglaló készítése'
      ]
    })
    
    // Add decision maker for formal meetings
    if (style === 'formal' && complexity > 60) {
      const decisionMaker = participants.find(p => p.role === 'executive' || p.role === 'manager')
      if (decisionMaker) {
        roles.push({
          role: 'Döntéshozó',
          assignee: decisionMaker.userId,
          responsibilities: [
            'Végső döntések meghozatala',
            'Konfliktusok feloldása',
            'Stratégiai irány meghatározása'
          ]
        })
      }
    }
    
    return {
      technique: selectedTechnique.technique,
      tools: selectedTechnique.tools,
      roles
    }
  }
}

// Export singleton instance
export const meetingOptimizer = new MeetingOptimizer()