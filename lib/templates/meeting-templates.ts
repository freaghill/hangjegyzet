import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'

export type TemplateType = 'standup' | 'planning' | 'retrospective' | 'one_on_one' | 'review' | 'custom'

export interface TemplateSection {
  name: string
  description: string
  required?: boolean
}

export interface TemplatePrompts {
  summary?: string
  actionItems?: string
  [key: string]: string | undefined
}

export interface TemplateAnalysisConfig {
  extractActionItems: boolean
  generateSummary: boolean
  identifySections: boolean
  trackMetrics: boolean
  customPrompts: string[]
}

export interface MeetingTemplate {
  id: string
  organization_id: string | null
  name: string
  slug: string
  description: string | null
  is_default: boolean
  is_active: boolean
  template_type: TemplateType
  sections: TemplateSection[]
  prompts: TemplatePrompts
  fields: Record<string, string | number | boolean | null>
  analysis_config: TemplateAnalysisConfig
  created_by: string | null
  created_at: string
  updated_at: string
}

export class MeetingTemplateManager {
  private supabase = createClient()

  /**
   * Get all available templates for an organization
   */
  async getTemplates(organizationId: string): Promise<MeetingTemplate[]> {
    const { data, error } = await this.supabase
      .from('meeting_templates')
      .select('*')
      .or(`organization_id.eq.${organizationId},is_default.eq.true`)
      .eq('is_active', true)
      .order('template_type', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching templates:', error)
    }

    return data || []
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<MeetingTemplate | null> {
    const { data, error } = await this.supabase
      .from('meeting_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (error) {
      console.error('Error fetching template:', error)
      return null
    }

    return data
  }

  /**
   * Get template by slug
   */
  async getTemplateBySlug(organizationId: string, slug: string): Promise<MeetingTemplate | null> {
    // First try to get organization-specific template
    const { data: orgTemplate } = await this.supabase
      .from('meeting_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (orgTemplate) return orgTemplate

    // Fall back to default template
    const { data: defaultTemplate } = await this.supabase
      .from('meeting_templates')
      .select('*')
      .is('organization_id', null)
      .eq('slug', slug)
      .eq('is_default', true)
      .single()

    return defaultTemplate
  }

  /**
   * Create a new custom template
   */
  async createTemplate(
    organizationId: string,
    template: Omit<MeetingTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<MeetingTemplate | null> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await this.supabase
      .from('meeting_templates')
      .insert({
        ...template,
        organization_id: organizationId,
        created_by: user.id,
        is_default: false,
        template_type: 'custom'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating template:', error)
      return null
    }

    return data
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<MeetingTemplate>
  ): Promise<MeetingTemplate | null> {
    const { data, error } = await this.supabase
      .from('meeting_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (error) {
      console.error('Error updating template:', error)
      return null
    }

    return data
  }

  /**
   * Delete a template (soft delete by setting is_active to false)
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('meeting_templates')
      .update({ is_active: false })
      .eq('id', templateId)

    if (error) {
      console.error('Error deleting template:', error)
      return false
    }

    return true
  }

  /**
   * Apply a template to a meeting
   */
  async applyTemplateToMeeting(meetingId: string, templateId: string): Promise<boolean> {
    const template = await this.getTemplate(templateId)
    if (!template) return false

    const { error } = await this.supabase
      .from('meetings')
      .update({
        template_id: templateId,
        template_data: {
          sections: template.sections,
          prompts: template.prompts,
          analysis_config: template.analysis_config
        }
      })
      .eq('id', meetingId)

    if (error) {
      console.error('Error applying template:', error)
      return false
    }

    return true
  }

  /**
   * Generate template-specific AI prompts
   */
  generateAIPrompts(template: MeetingTemplate, transcript: string): string {
    const basePrompt = `Analyze this ${template.name} meeting transcript according to the template structure.`
    
    // Add section-specific analysis
    const sectionPrompts = template.sections
      .map(section => `Identify and analyze the "${section.name}" section: ${section.description}`)
      .join('\n')

    // Add custom prompts
    const customPrompts = template.analysis_config.customPrompts
      .map(prompt => `- ${prompt}`)
      .join('\n')

    // Combine all prompts
    return `${basePrompt}

Expected sections:
${sectionPrompts}

Additional analysis requirements:
${customPrompts}

Template-specific prompts:
${Object.entries(template.prompts)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Transcript:
${transcript}`
  }

  /**
   * Detect sections in a transcript based on template
   */
  detectSections(template: MeetingTemplate, transcript: string): Array<{
    section: string
    content: string
    startIndex: number
    endIndex: number
  }> {
    const sections: Array<{
      section: string
      content: string
      startIndex: number
      endIndex: number
    }> = []

    // Simple section detection based on keywords
    // In production, this would use more sophisticated NLP
    template.sections.forEach(section => {
      const regex = new RegExp(`(${section.name}|${section.description})`, 'gi')
      const matches = [...transcript.matchAll(regex)]
      
      matches.forEach(match => {
        if (match.index !== undefined) {
          sections.push({
            section: section.name,
            content: '', // Would extract actual content
            startIndex: match.index,
            endIndex: match.index + match[0].length
          })
        }
      })
    })

    return sections.sort((a, b) => a.startIndex - b.startIndex)
  }

  /**
   * Validate meeting against template requirements
   */
  validateMeetingAgainstTemplate(
    template: MeetingTemplate,
    meetingData: {
      detectedSections?: string[]
      [key: string]: unknown
    }
  ): {
    isValid: boolean
    missingRequiredSections: string[]
    warnings: string[]
  } {
    const requiredSections = template.sections
      .filter(s => s.required)
      .map(s => s.name)

    const detectedSections = meetingData.detectedSections || []
    const missingSections = requiredSections.filter(
      section => !detectedSections.includes(section)
    )

    const warnings: string[] = []
    
    // Check for minimum content in each section
    if (detectedSections.length < template.sections.length * 0.5) {
      warnings.push('Less than 50% of expected sections were detected')
    }

    return {
      isValid: missingSections.length === 0,
      missingRequiredSections: missingSections,
      warnings
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    template_id: string
    template_name: string
    usage_count: number
    avg_intelligence_score: number
  }>> {
    let query = this.supabase
      .from('meetings')
      .select(`
        template_id,
        intelligence_score,
        meeting_templates!inner(name)
      `)
      .eq('organization_id', organizationId)
      .not('template_id', 'is', null)

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data, error } = await query

    if (error || !data) {
      console.error('Error fetching template usage:', error)
      return []
    }

    // Group by template and calculate stats
    const stats = new Map<string, {
      name: string
      count: number
      totalScore: number
    }>()

    data.forEach(meeting => {
      const templateId = meeting.template_id!
      const current = stats.get(templateId) || {
        name: (meeting as { meeting_templates: { name: string } }).meeting_templates.name,
        count: 0,
        totalScore: 0
      }

      current.count++
      current.totalScore += meeting.intelligence_score || 0
      stats.set(templateId, current)
    })

    return Array.from(stats.entries()).map(([templateId, data]) => ({
      template_id: templateId,
      template_name: data.name,
      usage_count: data.count,
      avg_intelligence_score: data.count > 0 ? data.totalScore / data.count : 0
    }))
  }
}

// Export singleton instance
export const templateManager = new MeetingTemplateManager()