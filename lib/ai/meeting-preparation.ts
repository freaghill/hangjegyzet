import { createClient } from '@/lib/supabase/client'
import { trackMetric } from '@/lib/monitoring'
import { predictiveMeetingEngine } from './predictive-intelligence'
import { MeetingTemplate } from '@/lib/templates/meeting-templates'

export interface PreMeetingBrief {
  summary: string
  previousContext: Array<{
    meetingId: string
    date: string
    summary: string
    relevantPoints: string[]
  }>
  unresolvedActionItems: Array<{
    task: string
    assignee?: string
    fromMeeting: string
    daysOverdue?: number
  }>
  participantProfiles: Array<{
    email: string
    name?: string
    lastMeetingDate?: string
    commonTopics: string[]
    relationshipSummary: string
  }>
  suggestedAgenda: string[]
  preparationTips: string[]
  estimatedDuration: number
  predictedTopics: Array<{
    topic: string
    probability: number
  }>
}

export interface MeetingContext {
  meetingId: string
  organizationId: string
  participants: string[]
  meetingType?: string
  template?: MeetingTemplate
  scheduledDuration?: number
}

export class MeetingPreparationService {
  private supabase = createClient()
  
  /**
   * Generate comprehensive pre-meeting brief
   */
  async generatePreMeetingBrief(context: MeetingContext): Promise<PreMeetingBrief> {
    const startTime = Date.now()
    
    try {
      // Gather all necessary data in parallel
      const [
        previousContext,
        unresolvedActions,
        participantProfiles,
        predictedTopics,
        estimatedDuration
      ] = await Promise.all([
        this.getPreviousMeetingContext(context.organizationId, context.participants),
        this.getUnresolvedActionItems(context.organizationId, context.participants),
        this.getParticipantProfiles(context.organizationId, context.participants),
        predictiveMeetingEngine.predictMeetingTopics(
          context.organizationId,
          context.participants,
          context.meetingType
        ),
        predictiveMeetingEngine.estimateDuration(
          context.organizationId,
          context.meetingType || 'custom',
          context.participants.length
        )
      ])
      
      // Generate agenda suggestions based on all data
      const suggestedAgenda = await this.generateAgendaSuggestions(
        context,
        previousContext,
        unresolvedActions,
        predictedTopics
      )
      
      // Create preparation tips
      const preparationTips = this.generatePreparationTips(
        context,
        unresolvedActions,
        participantProfiles,
        predictedTopics
      )
      
      // Generate executive summary
      const summary = this.generateExecutiveSummary(
        context,
        previousContext,
        unresolvedActions,
        participantProfiles
      )
      
      const brief: PreMeetingBrief = {
        summary,
        previousContext,
        unresolvedActionItems: unresolvedActions,
        participantProfiles,
        suggestedAgenda,
        preparationTips,
        estimatedDuration,
        predictedTopics: predictedTopics.map(t => ({
          topic: t.topic,
          probability: t.probability
        }))
      }
      
      // Track metrics
      trackMetric('ai.pre_meeting_brief_generated', 1, {
        participants: context.participants.length,
        duration: (Date.now() - startTime) / 1000
      })
      
      return brief
    } catch (error) {
      console.error('Error generating pre-meeting brief:', error)
      trackMetric('ai.pre_meeting_brief_error', 1)
      
      // Return minimal brief on error
      return {
        summary: 'Nem sikerült az előzetes összefoglaló generálása.',
        previousContext: [],
        unresolvedActionItems: [],
        participantProfiles: [],
        suggestedAgenda: [],
        preparationTips: ['Készüljön fel a meeting főbb témáira'],
        estimatedDuration: 60,
        predictedTopics: []
      }
    }
  }
  
  /**
   * Get context from previous meetings with same participants
   */
  async getPreviousMeetingContext(
    organizationId: string,
    participants: string[]
  ): Promise<PreMeetingBrief['previousContext']> {
    try {
      // Get last 5 meetings with any of these participants
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('id, created_at, summary, action_items, transcript')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (!meetings || meetings.length === 0) {
        return []
      }
      
      // Filter meetings that have at least one participant in common
      const relevantMeetings = meetings.filter(meeting => {
        if (!meeting.transcript?.speakers) return false
        const meetingSpeakers = meeting.transcript.speakers.map((s: any) => s.email || s.name)
        return participants.some(p => meetingSpeakers.includes(p))
      })
      
      // Process top 3 most relevant meetings
      return relevantMeetings.slice(0, 3).map(meeting => {
        const relevantPoints = this.extractRelevantPoints(meeting, participants)
        
        return {
          meetingId: meeting.id,
          date: new Date(meeting.created_at).toLocaleDateString('hu-HU'),
          summary: meeting.summary || 'Nincs összefoglaló',
          relevantPoints
        }
      })
    } catch (error) {
      console.error('Error getting previous context:', error)
      return []
    }
  }
  
  /**
   * Get unresolved action items from previous meetings
   */
  async getUnresolvedActionItems(
    organizationId: string,
    participants: string[]
  ): Promise<PreMeetingBrief['unresolvedActionItems']> {
    try {
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('id, title, created_at, action_items')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .not('action_items', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (!meetings) return []
      
      const unresolvedItems: PreMeetingBrief['unresolvedActionItems'] = []
      
      meetings.forEach(meeting => {
        if (!meeting.action_items || !Array.isArray(meeting.action_items)) return
        
        meeting.action_items.forEach((item: any) => {
          // Check if action is unresolved and assigned to one of the participants
          if (!item.completed && item.assignee && participants.includes(item.assignee)) {
            const createdDate = new Date(meeting.created_at)
            const daysAgo = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            
            unresolvedItems.push({
              task: item.task,
              assignee: item.assignee,
              fromMeeting: meeting.title || `Meeting ${meeting.id.slice(0, 8)}`,
              daysOverdue: item.deadline ? this.calculateDaysOverdue(item.deadline) : undefined
            })
          }
        })
      })
      
      // Sort by overdue days (most overdue first)
      return unresolvedItems
        .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
        .slice(0, 10) // Limit to 10 most important items
    } catch (error) {
      console.error('Error getting unresolved actions:', error)
      return []
    }
  }
  
  /**
   * Get participant profiles and history
   */
  async getParticipantProfiles(
    organizationId: string,
    participants: string[]
  ): Promise<PreMeetingBrief['participantProfiles']> {
    try {
      const profiles = await Promise.all(
        participants.map(async (email) => {
          const analysis = await predictiveMeetingEngine.analyzeParticipant(organizationId, email)
          
          // Get last meeting date
          const { data: lastMeeting } = await this.supabase
            .from('meetings')
            .select('created_at')
            .eq('organization_id', organizationId)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
          
          const lastMeetingDate = lastMeeting?.[0]?.created_at
            ? new Date(lastMeeting[0].created_at).toLocaleDateString('hu-HU')
            : undefined
          
          // Generate relationship summary
          const relationshipSummary = this.generateRelationshipSummary(analysis)
          
          return {
            email,
            name: analysis.name,
            lastMeetingDate,
            commonTopics: analysis.commonTopics.slice(0, 3),
            relationshipSummary
          }
        })
      )
      
      return profiles
    } catch (error) {
      console.error('Error getting participant profiles:', error)
      return participants.map(email => ({
        email,
        commonTopics: [],
        relationshipSummary: 'Nincs előzmény'
      }))
    }
  }
  
  /**
   * Generate agenda suggestions based on patterns and context
   */
  async generateAgendaSuggestions(
    context: MeetingContext,
    previousContext: PreMeetingBrief['previousContext'],
    unresolvedActions: PreMeetingBrief['unresolvedActionItems'],
    predictedTopics: Array<{ topic: string; probability: number }>
  ): Promise<string[]> {
    const suggestions: string[] = []
    
    // Add template-based suggestions if applicable
    if (context.template) {
      context.template.sections.forEach(section => {
        if (section.required) {
          suggestions.push(section.name)
        }
      })
    }
    
    // Add unresolved action items review if any
    if (unresolvedActions.length > 0) {
      suggestions.push('Előző akciók áttekintése')
    }
    
    // Add predicted topics with high probability
    predictedTopics
      .filter(t => t.probability > 60)
      .forEach(t => suggestions.push(t.topic))
    
    // Add follow-ups from previous meetings
    if (previousContext.length > 0 && previousContext[0].relevantPoints.length > 0) {
      suggestions.push('Követés: ' + previousContext[0].relevantPoints[0])
    }
    
    // Meeting type specific suggestions
    if (context.meetingType) {
      const typeSpecificSuggestions = this.getMeetingTypeAgenda(context.meetingType)
      suggestions.push(...typeSpecificSuggestions)
    }
    
    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 8)
  }
  
  /**
   * Generate preparation tips
   */
  private generatePreparationTips(
    context: MeetingContext,
    unresolvedActions: PreMeetingBrief['unresolvedActionItems'],
    participantProfiles: PreMeetingBrief['participantProfiles'],
    predictedTopics: Array<{ topic: string; probability: number }>
  ): string[] {
    const tips: string[] = []
    
    // Tips based on unresolved actions
    if (unresolvedActions.length > 3) {
      tips.push(`${unresolvedActions.length} lezáratlan akció van - készüljön fel a státusz megbeszélésére`)
    }
    
    // Tips based on overdue items
    const overdueItems = unresolvedActions.filter(a => a.daysOverdue && a.daysOverdue > 7)
    if (overdueItems.length > 0) {
      tips.push('Több mint egy hete lejárt határidők vannak - készüljön magyarázattal')
    }
    
    // Tips based on predicted topics
    const highProbabilityTopics = predictedTopics.filter(t => t.probability > 80)
    if (highProbabilityTopics.length > 0) {
      tips.push(`Valószínű témák: ${highProbabilityTopics.map(t => t.topic).join(', ')}`)
    }
    
    // Tips based on participant count
    if (context.participants.length > 5) {
      tips.push('Nagy létszámú meeting - készüljön strukturált vezetéssel')
    }
    
    // Tips based on meeting type
    if (context.meetingType === 'retrospective') {
      tips.push('Gyűjtsön konkrét példákat a javítási javaslatokhoz')
    } else if (context.meetingType === 'planning') {
      tips.push('Készítse elő a prioritásokat és erőforrás igényeket')
    }
    
    // Tips based on participant history
    const newParticipants = participantProfiles.filter(p => !p.lastMeetingDate)
    if (newParticipants.length > 0) {
      tips.push(`${newParticipants.length} új résztvevő - kezdjen rövid bemutatkozással`)
    }
    
    return tips.slice(0, 5)
  }
  
  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(
    context: MeetingContext,
    previousContext: PreMeetingBrief['previousContext'],
    unresolvedActions: PreMeetingBrief['unresolvedActionItems'],
    participantProfiles: PreMeetingBrief['participantProfiles']
  ): string {
    const parts: string[] = []
    
    // Meeting type
    if (context.meetingType) {
      parts.push(`${this.getMeetingTypeName(context.meetingType)} meeting`)
    }
    
    // Participant summary
    parts.push(`${context.participants.length} résztvevővel`)
    
    // Previous meeting context
    if (previousContext.length > 0) {
      const lastMeeting = previousContext[0]
      parts.push(`Utolsó találkozó: ${lastMeeting.date}`)
    } else {
      parts.push('Ez az első dokumentált találkozó')
    }
    
    // Unresolved actions
    if (unresolvedActions.length > 0) {
      parts.push(`${unresolvedActions.length} nyitott akció`)
    }
    
    return parts.join('. ') + '.'
  }
  
  /**
   * Helper: Extract relevant points from meeting
   */
  private extractRelevantPoints(meeting: any, participants: string[]): string[] {
    const points: string[] = []
    
    // Extract key decisions
    if (meeting.summary) {
      const sentences = meeting.summary.split('. ')
      points.push(...sentences.slice(0, 2))
    }
    
    // Extract action items related to participants
    if (meeting.action_items && Array.isArray(meeting.action_items)) {
      const relevantActions = meeting.action_items
        .filter((item: any) => participants.includes(item.assignee))
        .map((item: any) => `Akció: ${item.task}`)
      points.push(...relevantActions.slice(0, 2))
    }
    
    return points.slice(0, 3)
  }
  
  /**
   * Helper: Calculate days overdue
   */
  private calculateDaysOverdue(deadline: string): number {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diffTime = today.getTime() - deadlineDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }
  
  /**
   * Helper: Generate relationship summary
   */
  private generateRelationshipSummary(analysis: any): string {
    if (analysis.meetingCount === 0) {
      return 'Új kapcsolat'
    }
    
    const parts: string[] = []
    
    if (analysis.meetingCount > 10) {
      parts.push('Gyakori együttműködés')
    } else if (analysis.meetingCount > 5) {
      parts.push('Rendszeres kapcsolat')
    } else {
      parts.push('Alkalmi találkozók')
    }
    
    if (analysis.averageSpeakingTime > 20) {
      parts.push('aktív résztvevő')
    } else if (analysis.averageSpeakingTime > 10) {
      parts.push('mérsékelt aktivitás')
    } else {
      parts.push('csendes megfigyelő')
    }
    
    return parts.join(', ')
  }
  
  /**
   * Helper: Get meeting type specific agenda
   */
  private getMeetingTypeAgenda(meetingType: string): string[] {
    const agendas: Record<string, string[]> = {
      standup: ['Tegnapi munka', 'Mai tervek', 'Akadályok'],
      planning: ['Sprint célok', 'Feladat becslések', 'Erőforrás allokáció'],
      retrospective: ['Mi ment jól', 'Mi lehetne jobb', 'Akciók'],
      one_on_one: ['Visszajelzés', 'Fejlődési célok', 'Támogatási igények'],
      review: ['Eredmények áttekintése', 'Tanulságok', 'Következő lépések']
    }
    
    return agendas[meetingType] || []
  }
  
  /**
   * Helper: Get meeting type name in Hungarian
   */
  private getMeetingTypeName(meetingType: string): string {
    const names: Record<string, string> = {
      standup: 'Napi státusz',
      planning: 'Tervezési',
      retrospective: 'Visszatekintő',
      one_on_one: 'Személyes',
      review: 'Áttekintő',
      custom: 'Egyéni'
    }
    
    return names[meetingType] || meetingType
  }
}

// Export singleton instance
export const meetingPreparationService = new MeetingPreparationService()