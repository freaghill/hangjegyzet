import { createClient } from '@/lib/supabase/client'
import { MeetingTemplate, TemplateSection } from '@/lib/templates/meeting-templates'
import { trackMetric } from '@/lib/monitoring'
import { claude } from './claude'

export interface DynamicTemplateConfig {
  baseTemplate: MeetingTemplate
  learningEnabled: boolean
  adaptationLevel: 'conservative' | 'moderate' | 'aggressive'
  minUsageForAdaptation: number
}

export interface TemplateUsagePattern {
  templateId: string
  sectionUsage: Record<string, {
    used: number
    skipped: number
    modified: number
    averageDuration: number
  }>
  commonModifications: Array<{
    section: string
    modification: string
    frequency: number
  }>
  participantPatterns: Record<string, string[]> // email -> commonly discussed topics
  timePatterns: {
    averageDuration: number
    optimalTime: string
    dayPreferences: Record<string, number>
  }
}

export interface AdaptedTemplate extends MeetingTemplate {
  adaptations: Array<{
    type: 'section_added' | 'section_removed' | 'section_reordered' | 'content_modified'
    description: string
    confidence: number
  }>
  suggestedAgendaItems: string[]
  predictedParticipants: string[]
  estimatedDuration: number
}

export class AIMeetingTemplates {
  private supabase = createClient()
  
  /**
   * Learn from template usage patterns
   */
  async learnFromUsage(
    meetingId: string,
    templateId: string,
    actualFlow: Array<{ section: string; duration: number; modified: boolean }>
  ): Promise<void> {
    try {
      // Get or create usage pattern
      const { data: pattern } = await this.supabase
        .from('template_usage_patterns')
        .select('*')
        .eq('template_id', templateId)
        .single()
      
      const usagePattern = pattern || this.initializeUsagePattern(templateId)
      
      // Update section usage
      actualFlow.forEach(({ section, duration, modified }) => {
        if (!usagePattern.sectionUsage[section]) {
          usagePattern.sectionUsage[section] = {
            used: 0,
            skipped: 0,
            modified: 0,
            averageDuration: 0
          }
        }
        
        const sectionStats = usagePattern.sectionUsage[section]
        sectionStats.used++
        if (modified) sectionStats.modified++
        
        // Update average duration
        sectionStats.averageDuration = 
          (sectionStats.averageDuration * (sectionStats.used - 1) + duration) / sectionStats.used
      })
      
      // Track skipped sections
      const template = await this.getTemplate(templateId)
      if (template) {
        template.sections.forEach(section => {
          if (!actualFlow.find(f => f.section === section.name)) {
            if (!usagePattern.sectionUsage[section.name]) {
              usagePattern.sectionUsage[section.name] = {
                used: 0,
                skipped: 0,
                modified: 0,
                averageDuration: 0
              }
            }
            usagePattern.sectionUsage[section.name].skipped++
          }
        })
      }
      
      // Save updated pattern
      await this.supabase
        .from('template_usage_patterns')
        .upsert({
          template_id: templateId,
          ...usagePattern,
          updated_at: new Date().toISOString()
        })
      
      trackMetric('ai.template_learning', 1, {
        template_id: templateId,
        sections_tracked: actualFlow.length
      })
    } catch (error) {
      console.error('Error learning from template usage:', error)
    }
  }
  
  /**
   * Adapt template based on usage patterns and context
   */
  async adaptTemplate(
    templateId: string,
    context: {
      participants: string[]
      meetingType?: string
      previousMeetings?: string[]
      timeOfDay?: string
      duration?: number
    },
    config?: Partial<DynamicTemplateConfig>
  ): Promise<AdaptedTemplate | null> {
    try {
      const template = await this.getTemplate(templateId)
      if (!template) return null
      
      const usagePattern = await this.getUsagePattern(templateId)
      const adaptations: AdaptedTemplate['adaptations'] = []
      
      // Clone template for adaptation
      const adaptedTemplate: AdaptedTemplate = {
        ...template,
        sections: [...template.sections],
        adaptations: [],
        suggestedAgendaItems: [],
        predictedParticipants: [],
        estimatedDuration: template.estimatedDuration || 60
      }
      
      // Apply adaptations based on usage patterns
      if (usagePattern && config?.learningEnabled !== false) {
        const adaptationLevel = config?.adaptationLevel || 'moderate'
        const minUsage = config?.minUsageForAdaptation || 5
        
        // Analyze section effectiveness
        const sectionAnalysis = await this.analyzeSectionEffectiveness(usagePattern, minUsage)
        
        // Remove frequently skipped sections
        if (adaptationLevel !== 'conservative') {
          sectionAnalysis.ineffective.forEach(section => {
            const idx = adaptedTemplate.sections.findIndex(s => s.name === section.name)
            if (idx !== -1 && section.skipRate > 0.7) {
              adaptedTemplate.sections.splice(idx, 1)
              adaptations.push({
                type: 'section_removed',
                description: `Eltávolítva: ${section.name} (${Math.round(section.skipRate * 100)}% kihagyási arány)`,
                confidence: section.confidence
              })
            }
          })
        }
        
        // Reorder sections based on typical flow
        if (adaptationLevel === 'aggressive') {
          const optimalOrder = await this.determineOptimalSectionOrder(usagePattern)
          if (optimalOrder.length > 0) {
            adaptedTemplate.sections = this.reorderSections(adaptedTemplate.sections, optimalOrder)
            adaptations.push({
              type: 'section_reordered',
              description: 'Szakaszok átrendezve a tipikus használat alapján',
              confidence: 0.8
            })
          }
        }
        
        // Suggest new sections based on patterns
        const suggestedSections = await this.suggestNewSections(
          templateId,
          context,
          usagePattern
        )
        
        suggestedSections.forEach(suggestion => {
          if (suggestion.confidence > 0.7) {
            adaptedTemplate.sections.push({
              name: suggestion.name,
              description: suggestion.description,
              duration: suggestion.duration,
              required: false,
              aiGenerated: true
            })
            adaptations.push({
              type: 'section_added',
              description: `Hozzáadva: ${suggestion.name}`,
              confidence: suggestion.confidence
            })
          }
        })
      }
      
      // Generate agenda suggestions based on context
      adaptedTemplate.suggestedAgendaItems = await this.generateAgendaSuggestions(
        templateId,
        context,
        usagePattern
      )
      
      // Predict participants
      adaptedTemplate.predictedParticipants = await this.predictParticipants(
        templateId,
        context,
        usagePattern
      )
      
      // Estimate duration
      adaptedTemplate.estimatedDuration = await this.estimateDuration(
        adaptedTemplate,
        context,
        usagePattern
      )
      
      adaptedTemplate.adaptations = adaptations
      
      // Track adaptation
      trackMetric('ai.template_adapted', 1, {
        template_id: templateId,
        adaptations: adaptations.length,
        confidence: adaptations.reduce((sum, a) => sum + a.confidence, 0) / adaptations.length
      })
      
      return adaptedTemplate
    } catch (error) {
      console.error('Error adapting template:', error)
      return null
    }
  }
  
  /**
   * Generate agenda suggestions using AI
   */
  private async generateAgendaSuggestions(
    templateId: string,
    context: any,
    usagePattern: TemplateUsagePattern | null
  ): Promise<string[]> {
    try {
      const prompt = `
        Based on the following meeting context and usage patterns, suggest 5-8 specific agenda items:
        
        Template: ${templateId}
        Participants: ${context.participants.join(', ')}
        Meeting Type: ${context.meetingType || 'general'}
        
        Common topics from past meetings with these participants:
        ${usagePattern?.participantPatterns ? 
          Object.entries(usagePattern.participantPatterns)
            .filter(([email]) => context.participants.includes(email))
            .map(([email, topics]) => `${email}: ${topics.join(', ')}`)
            .join('\n') : 
          'No historical data'
        }
        
        Provide specific, actionable agenda items in Hungarian.
      `
      
      const response = await claude.analyze(prompt, 'agenda_generation')
      
      // Parse response and extract agenda items
      const items = response.split('\n')
        .filter(line => line.trim().length > 0)
        .filter(line => /^[\d\-\*]/.test(line.trim()))
        .map(line => line.replace(/^[\d\-\*\.\)]+\s*/, '').trim())
        .slice(0, 8)
      
      return items
    } catch (error) {
      console.error('Error generating agenda suggestions:', error)
      return []
    }
  }
  
  /**
   * Predict likely participants
   */
  private async predictParticipants(
    templateId: string,
    context: any,
    usagePattern: TemplateUsagePattern | null
  ): Promise<string[]> {
    if (!usagePattern?.participantPatterns) return []
    
    try {
      // Get meeting history with this template
      const { data: meetings } = await this.supabase
        .from('meetings')
        .select('transcript')
        .eq('template_id', templateId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (!meetings || meetings.length === 0) return []
      
      // Count participant frequency
      const participantFrequency: Record<string, number> = {}
      
      meetings.forEach(meeting => {
        const speakers = meeting.transcript?.speakers || []
        speakers.forEach((speaker: any) => {
          const email = speaker.email || speaker.name
          if (email && !context.participants.includes(email)) {
            participantFrequency[email] = (participantFrequency[email] || 0) + 1
          }
        })
      })
      
      // Return top predicted participants
      return Object.entries(participantFrequency)
        .sort(([, a], [, b]) => b - a)
        .filter(([, count]) => count >= 3) // At least 3 meetings together
        .slice(0, 5)
        .map(([email]) => email)
    } catch (error) {
      console.error('Error predicting participants:', error)
      return []
    }
  }
  
  /**
   * Estimate meeting duration
   */
  private async estimateDuration(
    template: AdaptedTemplate,
    context: any,
    usagePattern: TemplateUsagePattern | null
  ): Promise<number> {
    let estimatedDuration = 0
    
    // Sum up section durations
    template.sections.forEach(section => {
      if (usagePattern?.sectionUsage[section.name]) {
        estimatedDuration += usagePattern.sectionUsage[section.name].averageDuration
      } else {
        estimatedDuration += section.duration || 10
      }
    })
    
    // Adjust based on participant count
    const participantFactor = 1 + (context.participants.length - 3) * 0.1
    estimatedDuration *= Math.max(0.8, Math.min(1.5, participantFactor))
    
    // Adjust based on time patterns
    if (usagePattern?.timePatterns?.averageDuration) {
      // Blend estimated with historical average
      estimatedDuration = (estimatedDuration + usagePattern.timePatterns.averageDuration) / 2
    }
    
    return Math.round(estimatedDuration)
  }
  
  /**
   * Analyze section effectiveness
   */
  private async analyzeSectionEffectiveness(
    pattern: TemplateUsagePattern,
    minUsage: number
  ): Promise<{
    effective: Array<{ name: string; score: number }>
    ineffective: Array<{ name: string; skipRate: number; confidence: number }>
  }> {
    const effective: Array<{ name: string; score: number }> = []
    const ineffective: Array<{ name: string; skipRate: number; confidence: number }> = []
    
    Object.entries(pattern.sectionUsage).forEach(([section, stats]) => {
      const totalInteractions = stats.used + stats.skipped
      
      if (totalInteractions >= minUsage) {
        const skipRate = stats.skipped / totalInteractions
        const modificationRate = stats.used > 0 ? stats.modified / stats.used : 0
        
        if (skipRate > 0.5) {
          ineffective.push({
            name: section,
            skipRate,
            confidence: Math.min(1, totalInteractions / (minUsage * 2))
          })
        } else if (skipRate < 0.2 && modificationRate < 0.3) {
          effective.push({
            name: section,
            score: (1 - skipRate) * (1 - modificationRate)
          })
        }
      }
    })
    
    return { effective, ineffective }
  }
  
  /**
   * Determine optimal section order
   */
  private async determineOptimalSectionOrder(
    pattern: TemplateUsagePattern
  ): Promise<string[]> {
    // Analyze typical flow patterns from historical data
    // This would require more complex analysis of actual meeting flows
    // For now, return sections ordered by usage frequency
    
    return Object.entries(pattern.sectionUsage)
      .filter(([, stats]) => stats.used > stats.skipped)
      .sort(([, a], [, b]) => {
        const scoreA = a.used / (a.used + a.skipped)
        const scoreB = b.used / (b.used + b.skipped)
        return scoreB - scoreA
      })
      .map(([section]) => section)
  }
  
  /**
   * Suggest new sections based on patterns
   */
  private async suggestNewSections(
    templateId: string,
    context: any,
    pattern: TemplateUsagePattern | null
  ): Promise<Array<{
    name: string
    description: string
    duration: number
    confidence: number
  }>> {
    const suggestions: Array<{
      name: string
      description: string
      duration: number
      confidence: number
    }> = []
    
    // Analyze common modifications to suggest new sections
    if (pattern?.commonModifications) {
      const frequentMods = pattern.commonModifications
        .filter(mod => mod.frequency > 3)
        .sort((a, b) => b.frequency - a.frequency)
      
      // Use AI to generate section suggestions based on modifications
      if (frequentMods.length > 0) {
        try {
          const prompt = `
            Based on these common modifications to meeting sections:
            ${frequentMods.map(m => `- ${m.section}: ${m.modification} (${m.frequency}x)`).join('\n')}
            
            Suggest 1-3 new meeting sections that would address these needs.
            Format: Section Name | Description | Duration (minutes)
          `
          
          const response = await claude.analyze(prompt, 'section_generation')
          
          // Parse AI response
          const lines = response.split('\n').filter(l => l.includes('|'))
          lines.forEach(line => {
            const [name, description, duration] = line.split('|').map(s => s.trim())
            if (name && description && duration) {
              suggestions.push({
                name,
                description,
                duration: parseInt(duration) || 10,
                confidence: 0.8
              })
            }
          })
        } catch (error) {
          console.error('Error generating section suggestions:', error)
        }
      }
    }
    
    // Add context-specific suggestions
    if (context.meetingType === 'retrospective' && 
        !pattern?.sectionUsage['Akció tervezés']) {
      suggestions.push({
        name: 'Akció tervezés',
        description: 'Konkrét lépések meghatározása a javításokhoz',
        duration: 15,
        confidence: 0.9
      })
    }
    
    return suggestions
  }
  
  /**
   * Helper: Reorder sections
   */
  private reorderSections(
    sections: TemplateSection[],
    optimalOrder: string[]
  ): TemplateSection[] {
    const sectionMap = new Map(sections.map(s => [s.name, s]))
    const reordered: TemplateSection[] = []
    
    // First add sections in optimal order
    optimalOrder.forEach(name => {
      const section = sectionMap.get(name)
      if (section) {
        reordered.push(section)
        sectionMap.delete(name)
      }
    })
    
    // Add remaining sections
    sectionMap.forEach(section => {
      reordered.push(section)
    })
    
    return reordered
  }
  
  /**
   * Helper: Get template
   */
  private async getTemplate(templateId: string): Promise<MeetingTemplate | null> {
    const { data } = await this.supabase
      .from('meeting_templates')
      .select('*')
      .eq('id', templateId)
      .single()
    
    return data
  }
  
  /**
   * Helper: Get usage pattern
   */
  private async getUsagePattern(templateId: string): Promise<TemplateUsagePattern | null> {
    const { data } = await this.supabase
      .from('template_usage_patterns')
      .select('*')
      .eq('template_id', templateId)
      .single()
    
    return data
  }
  
  /**
   * Helper: Initialize usage pattern
   */
  private initializeUsagePattern(templateId: string): TemplateUsagePattern {
    return {
      templateId,
      sectionUsage: {},
      commonModifications: [],
      participantPatterns: {},
      timePatterns: {
        averageDuration: 60,
        optimalTime: '10:00',
        dayPreferences: {}
      }
    }
  }
}

// Export singleton instance
export const aiMeetingTemplates = new AIMeetingTemplates()