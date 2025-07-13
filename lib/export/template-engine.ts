import Handlebars from 'handlebars'
import { format, formatDuration as formatDurationFns } from 'date-fns'
import { hu } from 'date-fns/locale'
// import juice from 'juice' - Removed due to build issues with undici

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: string | Date, formatStr?: string) => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr || 'yyyy. MM. dd. HH:mm', { locale: hu })
})

Handlebars.registerHelper('formatDuration', (seconds: number) => {
  if (!seconds) return '0 perc'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} óra ${minutes} perc`
  }
  return `${minutes} perc`
})

Handlebars.registerHelper('formatTime', (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${minutes}:${secs.toString().padStart(2, '0')}`
})

Handlebars.registerHelper('translatePriority', (priority: string) => {
  const translations: Record<string, string> = {
    high: 'Magas',
    medium: 'Közepes',
    low: 'Alacsony'
  }
  return translations[priority] || priority
})

Handlebars.registerHelper('now', () => new Date())

Handlebars.registerHelper('eq', (a: any, b: any) => a === b)
Handlebars.registerHelper('gt', (a: any, b: any) => a > b)
Handlebars.registerHelper('lt', (a: any, b: any) => a < b)

// Keep backward compatibility
Handlebars.registerHelper('hungarianDate', function(date: Date | string) {
  return format(new Date(date), 'yyyy. MMMM d. EEEE', { locale: hu })
})

Handlebars.registerHelper('duration', function(seconds: number) {
  if (!seconds) return '0 perc'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours} óra ${minutes} perc`
  }
  return `${minutes} perc`
})

Handlebars.registerHelper('timestamp', function(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
  return arg1 === arg2 ? options.fn(this) : options.inverse(this)
})

// Default templates for different industries
export const DEFAULT_TEMPLATES = {
  legal: {
    name: 'Jogi jegyzőkönyv',
    description: 'Ügyvédi irodák és jogi szakemberek számára',
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .section { margin-bottom: 30px; }
    .section-title { font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
    .participant { margin-left: 20px; }
    .transcript-entry { margin-bottom: 15px; }
    .speaker { font-weight: bold; }
    .timestamp { color: #666; font-size: 0.9em; }
    .footer { margin-top: 50px; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MEGBESZÉLÉS JEGYZŐKÖNYV</h1>
    <p>Készült: {{hungarianDate meeting.date}}</p>
  </div>

  <div class="section">
    <div class="section-title">ÁLTALÁNOS INFORMÁCIÓK</div>
    <p><strong>Tárgy:</strong> {{meeting.title}}</p>
    <p><strong>Időtartam:</strong> {{duration meeting.duration}}</p>
    <p><strong>Helyszín:</strong> {{#if meeting.location}}{{meeting.location}}{{else}}Online{{/if}}</p>
  </div>

  <div class="section">
    <div class="section-title">RÉSZTVEVŐK</div>
    {{#each meeting.participants}}
    <div class="participant">- {{this}}</div>
    {{/each}}
  </div>

  {{#if meeting.agenda}}
  <div class="section">
    <div class="section-title">NAPIREND</div>
    {{#each meeting.agenda}}
    <p>{{@index}}. {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  <div class="section">
    <div class="section-title">MEGBESZÉLÉS MENETE</div>
    {{#each meeting.transcript}}
    <div class="transcript-entry">
      <span class="timestamp">[{{timestamp this.timestamp}}]</span>
      <span class="speaker">{{this.speaker}}:</span> {{this.text}}
    </div>
    {{/each}}
  </div>

  {{#if meeting.decisions}}
  <div class="section">
    <div class="section-title">HATÁROZATOK</div>
    {{#each meeting.decisions}}
    <p>{{@index}}. {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.actionItems}}
  <div class="section">
    <div class="section-title">TEENDŐK</div>
    {{#each meeting.actionItems}}
    <p>- {{this.text}} {{#if this.assignee}}(Felelős: {{this.assignee}}){{/if}} {{#if this.dueDate}}(Határidő: {{hungarianDate this.dueDate}}){{/if}}</p>
    {{/each}}
  </div>
  {{/if}}

  <div class="footer">
    <p>A jegyzőkönyv hitelesítése:</p>
    <br><br>
    <p>_______________________</p>
    <p>Jegyzőkönyvvezető</p>
  </div>
</body>
</html>`
  },
  
  business: {
    name: 'Üzleti összefoglaló',
    description: 'Vezetői megbeszélések és projekt meetingek számára',
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 30px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    h1 { color: #2c3e50; margin: 0; }
    .meta { color: #666; font-size: 14px; margin-top: 10px; }
    .summary-box { background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 25px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 5px; }
    .action-item { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 5px; }
    .priority-high { border-left: 4px solid #dc3545; }
    .priority-medium { border-left: 4px solid #ffc107; }
    .priority-low { border-left: 4px solid #28a745; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{meeting.title}}</h1>
    <div class="meta">
      <strong>Dátum:</strong> {{hungarianDate meeting.date}} | 
      <strong>Időtartam:</strong> {{duration meeting.duration}} |
      <strong>Résztvevők:</strong> {{meeting.participants.length}} fő
    </div>
  </div>

  {{#if meeting.summary}}
  <div class="summary-box">
    <h3>Vezetői összefoglaló</h3>
    <p>{{meeting.summary}}</p>
  </div>
  {{/if}}

  {{#if meeting.keyPoints}}
  <div class="section">
    <h2>Főbb pontok</h2>
    <ul>
    {{#each meeting.keyPoints}}
      <li>{{this}}</li>
    {{/each}}
    </ul>
  </div>
  {{/if}}

  {{#if meeting.decisions}}
  <div class="section">
    <h2>Döntések</h2>
    {{#each meeting.decisions}}
    <p>✓ {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.actionItems}}
  <div class="section">
    <h2>Feladatok</h2>
    {{#each meeting.actionItems}}
    <div class="action-item priority-{{this.priority}}">
      <strong>{{this.text}}</strong>
      {{#if this.assignee}}<br>Felelős: {{this.assignee}}{{/if}}
      {{#if this.dueDate}}<br>Határidő: {{hungarianDate this.dueDate}}{{/if}}
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.nextSteps}}
  <div class="section">
    <h2>Következő lépések</h2>
    <ol>
    {{#each meeting.nextSteps}}
      <li>{{this}}</li>
    {{/each}}
    </ol>
  </div>
  {{/if}}
</body>
</html>`
  },
  
  medical: {
    name: 'Egészségügyi konzultáció',
    description: 'Orvosi konzultációk és esetmegbeszélések dokumentálása',
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 30px; }
    .confidential { background: #ffebee; color: #c62828; padding: 10px; text-align: center; margin-bottom: 20px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #1565c0; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <div class="confidential">BIZALMAS - EGÉSZSÉGÜGYI DOKUMENTUM</div>
  
  <div class="header">
    <h1>Konzultációs jegyzőkönyv</h1>
    <div class="info-grid">
      <span class="label">Dátum:</span> <span>{{hungarianDate meeting.date}}</span>
      <span class="label">Időtartam:</span> <span>{{duration meeting.duration}}</span>
      <span class="label">Típus:</span> <span>{{meeting.consultationType}}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">RÉSZTVEVŐK</div>
    {{#each meeting.participants}}
    <p>{{this.role}}: {{this.name}}</p>
    {{/each}}
  </div>

  <div class="section">
    <div class="section-title">KONZULTÁCIÓ TÁRGYA</div>
    <p>{{meeting.subject}}</p>
  </div>

  {{#if meeting.observations}}
  <div class="section">
    <div class="section-title">MEGFIGYELÉSEK</div>
    {{#each meeting.observations}}
    <p>• {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.recommendations}}
  <div class="section">
    <div class="section-title">JAVASLATOK</div>
    {{#each meeting.recommendations}}
    <p>{{@index}}. {{this}}</p>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.followUp}}
  <div class="section">
    <div class="section-title">TOVÁBBI TEENDŐK</div>
    <p>{{meeting.followUp}}</p>
  </div>
  {{/if}}

  <div class="section">
    <p><em>Ez a dokumentum kizárólag szakmai célokat szolgál és bizalmasan kezelendő.</em></p>
  </div>
</body>
</html>`
  },
  
  education: {
    name: 'Oktatási jegyzet',
    description: 'Tanári értekezletek és oktatási megbeszélések',
    template: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Calibri', sans-serif; line-height: 1.8; margin: 30px; }
    .header { text-align: center; background: #4caf50; color: white; padding: 20px; margin: -30px -30px 30px -30px; }
    .topic { background: #f5f5f5; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; }
    .action { background: #fff9c4; padding: 10px; margin: 10px 0; }
    .participant-list { columns: 2; column-gap: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{meeting.title}}</h1>
    <p>{{meeting.type}} - {{hungarianDate meeting.date}}</p>
  </div>

  <div class="section">
    <h2>Résztvevők</h2>
    <div class="participant-list">
      {{#each meeting.participants}}
      <p>• {{this}}</p>
      {{/each}}
    </div>
  </div>

  {{#each meeting.topics}}
  <div class="topic">
    <h3>{{this.title}}</h3>
    <p>{{this.discussion}}</p>
    {{#if this.decision}}
    <p><strong>Döntés:</strong> {{this.decision}}</p>
    {{/if}}
  </div>
  {{/each}}

  {{#if meeting.actionItems}}
  <div class="section">
    <h2>Feladatok és felelősök</h2>
    {{#each meeting.actionItems}}
    <div class="action">
      <strong>{{this.task}}</strong>
      <br>Felelős: {{this.responsible}} | Határidő: {{hungarianDate this.deadline}}
    </div>
    {{/each}}
  </div>
  {{/if}}

  {{#if meeting.nextMeeting}}
  <div class="section">
    <p><strong>Következő értekezlet:</strong> {{hungarianDate meeting.nextMeeting}}</p>
  </div>
  {{/if}}
</body>
</html>`
  }
}

export interface ExportTemplate {
  id: string
  organization_id: string
  name: string
  description?: string
  template: string
  type: 'html' | 'text' | 'markdown'
  category: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface TemplateData {
  // Meeting data
  title: string
  description?: string
  created_at: Date
  duration_seconds: number
  status: string
  
  // Organization
  organization: {
    name: string
    logo?: string
    address?: string
    phone?: string
    email?: string
  }
  
  // Content
  summary?: string
  key_points?: string[]
  action_items?: Array<{
    text: string
    assignee?: {
      name: string
      email: string
    }
    due_date?: Date
    priority: 'high' | 'medium' | 'low'
    status: string
  }>
  decisions?: string[]
  segments?: Array<{
    speaker: string
    content: string
    start_time: number
    end_time: number
  }>
  
  // Participants
  participants?: Array<{
    name: string
    email: string
    role?: string
  }>
  
  // Custom fields for specific templates
  [key: string]: any
}

export class TemplateEngine {
  private compiledTemplates = new Map<string, HandlebarsTemplateDelegate>()
  
  /**
   * Compile and cache a template
   */
  compileTemplate(templateId: string, templateString: string): HandlebarsTemplateDelegate {
    if (!this.compiledTemplates.has(templateId)) {
      const compiled = Handlebars.compile(templateString)
      this.compiledTemplates.set(templateId, compiled)
    }
    return this.compiledTemplates.get(templateId)!
  }
  
  /**
   * Render a template with data
   */
  renderTemplate(template: ExportTemplate | string, data: any): string {
    const templateString = typeof template === 'string' ? template : template.template
    const templateId = typeof template === 'string' ? 'inline' : template.id
    
    const compiled = this.compileTemplate(templateId, templateString)
    const html = compiled(data)
    
    // Return HTML directly without CSS inlining
    // CSS is already included in the template
    return html
  }
  
  /**
   * Render with custom styles
   */
  renderWithStyles(template: string, data: TemplateData, styles?: string): string {
    const compiled = Handlebars.compile(template)
    const html = compiled({
      ...data,
      styles: styles || ''
    })
    
    // If styles are provided separately, inline them
    if (styles && html.includes('<style>{{{styles}}}</style>')) {
      return html.replace('<style>{{{styles}}}</style>', `<style>${styles}</style>`)
    }
    
    // Return HTML directly without CSS inlining
    // CSS is already included in the template
    return html
  }
  
  /**
   * Validate template syntax
   */
  validateTemplate(templateString: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(templateString)
      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Invalid template syntax' 
      }
    }
  }
  
  /**
   * Extract text content from HTML
   */
  extractText(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ')
    // Replace multiple spaces with single space
    text = text.replace(/\s+/g, ' ')
    // Trim
    return text.trim()
  }
  
  /**
   * Generate table of contents from headings
   */
  generateTOC(html: string): Array<{ level: number; text: string; id: string }> {
    const headings: Array<{ level: number; text: string; id: string }> = []
    const regex = /<h([1-6])(?:\s+id="([^"]*)")?[^>]*>([^<]+)<\/h[1-6]>/gi
    
    let match
    while ((match = regex.exec(html)) !== null) {
      const level = parseInt(match[1])
      const id = match[2] || match[3].toLowerCase().replace(/\s+/g, '-')
      const text = match[3]
      
      headings.push({ level, text, id })
    }
    
    return headings
  }
  
  /**
   * Add page numbers for PDF export
   */
  addPageNumbers(html: string, format: 'pdf' | 'docx' = 'pdf'): string {
    if (format === 'pdf') {
      // Add CSS for page numbers
      const pageNumberCSS = `
        @page {
          @bottom-center {
            content: counter(page) " / " counter(pages);
          }
        }
      `
      
      if (html.includes('</style>')) {
        return html.replace('</style>', `${pageNumberCSS}</style>`)
      } else if (html.includes('</head>')) {
        return html.replace('</head>', `<style>${pageNumberCSS}</style></head>`)
      }
    }
    
    return html
  }
  
  /**
   * Get available variables for templates
   */
  getAvailableVariables(): Record<string, string> {
    return {
      'title': 'Meeting címe',
      'description': 'Meeting leírása',
      'created_at': 'Létrehozás dátuma',
      'duration_seconds': 'Időtartam másodpercben',
      'organization.name': 'Szervezet neve',
      'organization.logo': 'Szervezet logó URL',
      'summary': 'AI összefoglaló',
      'key_points': 'Főbb pontok listája',
      'action_items': 'Feladatok listája',
      'decisions': 'Döntések listája',
      'segments': 'Átirat szegmensek',
      'participants': 'Résztvevők listája',
    }
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine()