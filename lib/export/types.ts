export type ExportFormat = 'pdf' | 'docx' | 'txt'

export type ExportTemplate = 'legal' | 'business' | 'medical' | 'custom'

export interface ExportOptions {
  format: ExportFormat
  template: ExportTemplate
  includeBranding: boolean
  includeTranscript: boolean
  includeSummary: boolean
  includeActionItems: boolean
  includeMetadata: boolean
  customBranding?: BrandingOptions
  language?: 'hu' | 'en'
}

export interface BrandingOptions {
  logoUrl?: string
  companyName?: string
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  headerText?: string
  footerText?: string
  watermark?: boolean
  includeContactInfo?: boolean
  contactInfo?: {
    email?: string
    phone?: string
    website?: string
    address?: string
  }
}

export interface ExportTemplate {
  id: string
  name: string
  type: ExportTemplate
  description: string
  sections: TemplateSection[]
  styles: TemplateStyles
  metadata?: Record<string, any>
}

export interface TemplateSection {
  id: string
  type: 'header' | 'summary' | 'transcript' | 'action-items' | 'metadata' | 'custom'
  title?: string
  visible: boolean
  order: number
  config?: Record<string, any>
}

export interface TemplateStyles {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  fontSize: {
    title: number
    heading: number
    body: number
    small: number
  }
  spacing: {
    section: number
    paragraph: number
    line: number
  }
  pageMargins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface ExportResult {
  success: boolean
  url?: string
  buffer?: Buffer
  filename: string
  mimeType: string
  error?: string
}