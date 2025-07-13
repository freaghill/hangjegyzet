import { ExportFormat, ExportOptions, ExportResult, BrandingOptions } from './types'
import { PDFExporter } from './exporters/pdf-exporter'
import { WordExporter } from './exporters/word-exporter'
import { TextExporter } from './exporters/text-exporter'
import { getExportTemplate } from './templates'

export interface MeetingData {
  id: string
  title: string
  date: Date
  duration: number
  participants?: string[]
  transcript?: {
    segments?: Array<{
      speaker?: string
      text: string
      timestamp?: number
    }>
    fullText?: string
  }
  summary?: string
  actionItems?: Array<{
    task: string
    assignee?: string
    deadline?: string
    priority?: string
  }>
  metadata?: Record<string, any>
}

export class ExportService {
  private pdfExporter: PDFExporter
  private wordExporter: WordExporter
  private textExporter: TextExporter

  constructor() {
    this.pdfExporter = new PDFExporter()
    this.wordExporter = new WordExporter()
    this.textExporter = new TextExporter()
  }

  async export(
    meetingData: MeetingData,
    options: ExportOptions,
    organizationBranding?: BrandingOptions
  ): Promise<ExportResult> {
    try {
      // Merge organization branding with custom branding
      const branding = this.mergeBranding(organizationBranding, options.customBranding)
      
      // Get template
      const template = await getExportTemplate(options.template)
      
      // Prepare export data
      const exportData = this.prepareExportData(meetingData, options, branding)
      
      // Export based on format
      switch (options.format) {
        case 'pdf':
          return await this.pdfExporter.export(exportData, template, branding)
        case 'docx':
          return await this.wordExporter.export(exportData, template, branding)
        case 'txt':
          return await this.textExporter.export(exportData, template)
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
        filename: this.generateFilename(meetingData.title, options.format),
        mimeType: this.getMimeType(options.format)
      }
    }
  }

  private prepareExportData(
    meetingData: MeetingData,
    options: ExportOptions,
    branding?: BrandingOptions
  ) {
    const data: any = {
      title: meetingData.title,
      date: meetingData.date,
      duration: this.formatDuration(meetingData.duration),
      exportDate: new Date(),
    }

    if (options.includeMetadata && meetingData.metadata) {
      data.metadata = meetingData.metadata
      if (meetingData.participants) {
        data.participants = meetingData.participants
      }
    }

    if (options.includeSummary && meetingData.summary) {
      data.summary = meetingData.summary
    }

    if (options.includeActionItems && meetingData.actionItems) {
      data.actionItems = meetingData.actionItems
    }

    if (options.includeTranscript && meetingData.transcript) {
      data.transcript = meetingData.transcript
    }

    if (branding) {
      data.branding = branding
    }

    return data
  }

  private mergeBranding(
    organizationBranding?: BrandingOptions,
    customBranding?: BrandingOptions
  ): BrandingOptions | undefined {
    if (!organizationBranding && !customBranding) return undefined
    
    return {
      ...organizationBranding,
      ...customBranding,
      contactInfo: {
        ...organizationBranding?.contactInfo,
        ...customBranding?.contactInfo
      }
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours} óra ${minutes} perc`
    }
    return `${minutes} perc`
  }

  private generateFilename(title: string, format: ExportFormat): string {
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9áéíóöőúüű]+/gi, '-')
      .replace(/^-+|-+$/g, '')
    
    const date = new Date().toISOString().split('T')[0]
    return `${sanitized}-${date}.${format}`
  }

  private getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf'
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      case 'txt':
        return 'text/plain'
      default:
        return 'application/octet-stream'
    }
  }
}