import { TemplateEngine, ExportTemplate } from './template-engine'
import { PDFGenerator } from './pdf-generator'
import { generateMeetingWord } from './word-generator'
import { createClient } from '@/lib/supabase/server'
import { QueueService } from '@/lib/queue/queue.service'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import puppeteer from 'puppeteer-core'
import { convert } from 'html-to-text'
import { OrganizationBranding } from './branding'

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'html' | 'txt' | 'csv'
  templateId?: string
  includeTranscript?: boolean
  includeSummary?: boolean
  includeActionItems?: boolean
  includeAnalytics?: boolean
  branding?: {
    logo?: string
    primaryColor?: string
    companyName?: string
  }
}

export interface MeetingExportData {
  id: string
  title: string
  date: Date
  duration: number
  participants: string[]
  transcript?: Array<{
    speaker: string
    text: string
    timestamp: number
  }>
  summary?: string
  actionItems?: Array<{
    text: string
    assignee?: string
    dueDate?: string
    priority?: 'low' | 'medium' | 'high'
  }>
  keyPoints?: string[]
  decisions?: string[]
  sentiment?: {
    overall: string
    distribution: Record<string, number>
  }
  organization?: {
    name: string
    logo?: string
  }
}

export class ExportService {
  private templateEngine = new TemplateEngine()
  
  /**
   * Export meeting with custom template
   */
  async exportMeeting(
    meetingId: string,
    options: ExportOptions
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const supabase = await createClient()
      
      // Get meeting data
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select(`
          *,
          organization:organizations!meetings_organization_id_fkey(name, logo_url)
        `)
        .eq('id', meetingId)
        .single()
      
      if (meetingError || !meeting) {
        return { success: false, error: 'Meeting not found' }
      }
      
      // Prepare export data
      const exportData: MeetingExportData = {
        id: meeting.id,
        title: meeting.title || 'Névtelen megbeszélés',
        date: new Date(meeting.created_at),
        duration: meeting.duration_seconds || 0,
        participants: meeting.speakers?.map((s: any) => s.name) || [],
        transcript: options.includeTranscript ? meeting.transcript?.segments : undefined,
        summary: options.includeSummary ? meeting.summary : undefined,
        actionItems: options.includeActionItems ? meeting.action_items : undefined,
        keyPoints: meeting.key_points,
        decisions: meeting.decisions,
        sentiment: meeting.sentiment_analysis,
        organization: meeting.organization ? {
          name: meeting.organization.name,
          logo: options.branding?.logo || meeting.organization.logo_url
        } : undefined
      }
      
      // Add custom branding
      if (options.branding) {
        exportData.organization = {
          ...exportData.organization,
          name: options.branding.companyName || exportData.organization?.name || '',
          logo: options.branding.logo
        }
      }
      
      let exportUrl: string
      
      switch (options.format) {
        case 'html':
          exportUrl = await this.exportAsHTML(exportData, options)
          break
          
        case 'pdf':
          exportUrl = await this.exportAsPDF(exportData, options)
          break
          
        case 'docx':
          exportUrl = await this.exportAsWord(exportData, options)
          break
          
        case 'txt':
          exportUrl = await this.exportAsText(exportData, options)
          break
          
        case 'csv':
          exportUrl = await this.exportAsCSV(exportData, options)
          break
          
        default:
          return { success: false, error: 'Unsupported format' }
      }
      
      return { success: true, url: exportUrl }
      
    } catch (error) {
      console.error('Export error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      }
    }
  }
  
  /**
   * Export as HTML using template
   */
  private async exportAsHTML(
    data: MeetingExportData,
    options: ExportOptions
  ): Promise<string> {
    let template: ExportTemplate | undefined
    
    if (options.templateId) {
      const supabase = await createClient()
      const { data: customTemplate } = await supabase
        .from('export_templates')
        .select('*')
        .eq('id', options.templateId)
        .single()
      
      template = customTemplate
    }
    
    // Use default template if no custom template
    if (!template) {
      const { DEFAULT_TEMPLATES } = await import('./template-engine')
      template = {
        id: 'business',
        organization_id: '',
        name: 'Business Template',
        template: DEFAULT_TEMPLATES.business.template,
        type: 'html',
        category: 'business',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }
    
    const html = this.templateEngine.renderTemplate(template, { meeting: data })
    
    // Save to storage
    const fileName = `export-${data.id}-${Date.now()}.html`
    const filePath = join(process.env.TEMP_DIR || '/tmp', fileName)
    await writeFile(filePath, html, 'utf-8')
    
    // Upload to Supabase storage
    const supabase = await createClient()
    const { data: upload, error } = await supabase.storage
      .from('exports')
      .upload(fileName, html, {
        contentType: 'text/html',
        cacheControl: '3600'
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
  
  /**
   * Export as PDF
   */
  private async exportAsPDF(
    data: MeetingExportData,
    options: ExportOptions
  ): Promise<string> {
    const supabase = await createClient()
    const pdfGenerator = new PDFGenerator()
    
    try {
      // Get organization branding settings
      let branding: OrganizationBranding = {}
      
      if (data.organization) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('branding_settings')
          .eq('name', data.organization.name)
          .single()
        
        if (orgData?.branding_settings) {
          branding = orgData.branding_settings
        }
      }
      
      // Override with custom branding from options
      if (options.branding) {
        branding = {
          ...branding,
          logo: options.branding.logo ? {
            url: options.branding.logo,
            position: 'left'
          } : branding.logo,
          colors: {
            ...branding.colors,
            primary: options.branding.primaryColor || branding.colors?.primary
          }
        }
      }
      
      // Get template
      let template: ExportTemplate | string
      if (options.templateId) {
        const { data: templateData } = await supabase
          .from('export_templates')
          .select('template')
          .eq('id', options.templateId)
          .single()
        
        template = templateData?.template || 'business_summary'
      } else {
        template = 'business_summary' // default template
      }
      
      // Generate branded PDF
      const buffer = await pdfGenerator.generateBrandedPDF(
        template,
        {
          meeting: data,
          organization: data.organization,
          generatedAt: new Date(),
          options: {
            includeTranscript: options.includeTranscript,
            includeSummary: options.includeSummary,
            includeActionItems: options.includeActionItems,
            includeAnalytics: options.includeAnalytics
          }
        },
        branding
      )
      
      // Upload to storage
      const fileName = `export-${data.id}-${Date.now()}.pdf`
      const { data: upload, error } = await supabase.storage
        .from('exports')
        .upload(fileName, buffer, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        })
      
      if (error) throw error
      
      // Track export in database
      await supabase.from('meeting_exports').insert({
        meeting_id: data.id,
        format: 'pdf',
        template_id: options.templateId,
        exported_by: (await supabase.auth.getUser()).data.user?.id,
        file_url: fileName,
        options: options
      })
      
      const { data: { publicUrl } } = supabase.storage
        .from('exports')
        .getPublicUrl(fileName)
      
      return publicUrl
    } finally {
      await pdfGenerator.cleanup()
    }
    
    // Convert HTML to PDF using Puppeteer
    // For production, use a PDF generation service or queue this job
    // This is a simplified example
    return html // Return HTML for now, actual PDF conversion would be queued
  }
  
  /**
   * Export as Word document
   */
  private async exportAsWord(
    data: MeetingExportData,
    options: ExportOptions
  ): Promise<string> {
    const blob = await generateMeetingWord(data)
    const buffer = await blob.arrayBuffer()
    
    const fileName = `export-${data.id}-${Date.now()}.docx`
    const supabase = await createClient()
    const { data: upload, error } = await supabase.storage
      .from('exports')
      .upload(fileName, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        cacheControl: '3600'
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
  
  /**
   * Export as plain text
   */
  private async exportAsText(
    data: MeetingExportData,
    options: ExportOptions
  ): Promise<string> {
    // Generate HTML first
    const html = await this.exportAsHTML(data, options)
    
    // Convert HTML to plain text
    const text = convert(html, {
      wordwrap: 80,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' }
      ]
    })
    
    const fileName = `export-${data.id}-${Date.now()}.txt`
    const supabase = await createClient()
    const { data: upload, error } = await supabase.storage
      .from('exports')
      .upload(fileName, text, {
        contentType: 'text/plain',
        cacheControl: '3600'
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
  
  /**
   * Export as CSV (for action items)
   */
  private async exportAsCSV(
    data: MeetingExportData,
    options: ExportOptions
  ): Promise<string> {
    const rows: string[] = ['Task,Assignee,Due Date,Priority,Status']
    
    if (data.actionItems) {
      data.actionItems.forEach(item => {
        const row = [
          `"${item.text.replace(/"/g, '""')}"`,
          item.assignee || '',
          item.dueDate || '',
          item.priority || 'medium',
          'pending'
        ].join(',')
        rows.push(row)
      })
    }
    
    const csv = rows.join('\n')
    
    const fileName = `export-${data.id}-${Date.now()}.csv`
    const supabase = await createClient()
    const { data: upload, error } = await supabase.storage
      .from('exports')
      .upload(fileName, csv, {
        contentType: 'text/csv',
        cacheControl: '3600'
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(fileName)
    
    return publicUrl
  }
  
  /**
   * Queue bulk export job
   */
  async queueBulkExport(
    meetingIds: string[],
    options: ExportOptions,
    email?: string
  ): Promise<string> {
    const jobId = await QueueService.addExportJob({
      meetingIds,
      format: options.format,
      options,
      email,
      type: 'bulk'
    } as any)
    
    return jobId
  }
}