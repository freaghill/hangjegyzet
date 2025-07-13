import puppeteer from 'puppeteer'
import { ExportResult, BrandingOptions, ExportTemplate } from '../types'

export class PDFExporter {
  async export(
    data: any,
    template: ExportTemplate,
    branding?: BrandingOptions
  ): Promise<ExportResult> {
    try {
      const html = this.generateHTML(data, template, branding)
      const buffer = await this.generatePDF(html)
      
      return {
        success: true,
        buffer,
        filename: `${data.title}-${new Date().toISOString().split('T')[0]}.pdf`,
        mimeType: 'application/pdf'
      }
    } catch (error) {
      console.error('PDF export error:', error)
      throw error
    }
  }

  private generateHTML(data: any, template: ExportTemplate, branding?: BrandingOptions): string {
    const styles = this.generateStyles(template.styles, branding)
    const sections = template.sections
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)
      .map(section => this.renderSection(section, data, branding))
      .join('')

    return `
      <!DOCTYPE html>
      <html lang="hu">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        <style>${styles}</style>
      </head>
      <body>
        ${branding?.watermark ? this.renderWatermark(branding) : ''}
        <div class="container">
          ${this.renderHeader(data, branding)}
          ${sections}
          ${this.renderFooter(branding)}
        </div>
      </body>
      </html>
    `
  }

  private generateStyles(templateStyles: any, branding?: BrandingOptions): string {
    const primaryColor = branding?.primaryColor || templateStyles.primaryColor || '#2563eb'
    const secondaryColor = branding?.secondaryColor || templateStyles.secondaryColor || '#64748b'
    const fontFamily = branding?.fontFamily || templateStyles.fontFamily || 'Arial, sans-serif'
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${fontFamily};
        color: #1f2937;
        line-height: 1.6;
        background: white;
      }
      
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: ${templateStyles.pageMargins.top}mm ${templateStyles.pageMargins.right}mm ${templateStyles.pageMargins.bottom}mm ${templateStyles.pageMargins.left}mm;
      }
      
      .watermark {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: 120px;
        opacity: 0.05;
        z-index: -1;
        font-weight: bold;
        color: ${primaryColor};
      }
      
      .header {
        margin-bottom: ${templateStyles.spacing.section}mm;
        padding-bottom: ${templateStyles.spacing.paragraph}mm;
        border-bottom: 2px solid ${primaryColor};
      }
      
      .header-logo {
        max-height: 60px;
        margin-bottom: 10px;
      }
      
      .header-company {
        font-size: ${templateStyles.fontSize.heading}pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5px;
      }
      
      .header-contact {
        font-size: ${templateStyles.fontSize.small}pt;
        color: ${secondaryColor};
      }
      
      h1 {
        font-size: ${templateStyles.fontSize.title}pt;
        color: ${primaryColor};
        margin-bottom: ${templateStyles.spacing.paragraph}mm;
      }
      
      h2 {
        font-size: ${templateStyles.fontSize.heading}pt;
        color: ${primaryColor};
        margin-top: ${templateStyles.spacing.section}mm;
        margin-bottom: ${templateStyles.spacing.paragraph}mm;
      }
      
      p {
        font-size: ${templateStyles.fontSize.body}pt;
        margin-bottom: ${templateStyles.spacing.paragraph}mm;
        text-align: justify;
      }
      
      .metadata {
        background: #f3f4f6;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: ${templateStyles.spacing.section}mm;
      }
      
      .metadata-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: ${templateStyles.fontSize.body}pt;
      }
      
      .metadata-label {
        font-weight: bold;
        color: ${secondaryColor};
      }
      
      .action-items {
        margin-top: ${templateStyles.spacing.paragraph}mm;
      }
      
      .action-item {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 12px;
        margin-bottom: 10px;
      }
      
      .action-item-task {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .action-item-meta {
        font-size: ${templateStyles.fontSize.small}pt;
        color: ${secondaryColor};
      }
      
      .transcript-segment {
        margin-bottom: ${templateStyles.spacing.paragraph}mm;
        padding: 10px;
        background: #f9fafb;
        border-radius: 4px;
      }
      
      .transcript-speaker {
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5px;
      }
      
      .transcript-text {
        font-size: ${templateStyles.fontSize.body}pt;
      }
      
      .footer {
        margin-top: ${templateStyles.spacing.section}mm;
        padding-top: ${templateStyles.spacing.paragraph}mm;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        font-size: ${templateStyles.fontSize.small}pt;
        color: ${secondaryColor};
      }
      
      @page {
        margin: 20mm;
      }
      
      @media print {
        .container {
          padding: 0;
        }
      }
    `
  }

  private renderHeader(data: any, branding?: BrandingOptions): string {
    if (!branding?.includeBranding) return ''
    
    return `
      <div class="header">
        ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" class="header-logo">` : ''}
        ${branding.companyName ? `<div class="header-company">${branding.companyName}</div>` : ''}
        ${branding.includeContactInfo && branding.contactInfo ? `
          <div class="header-contact">
            ${branding.contactInfo.email ? `Email: ${branding.contactInfo.email} | ` : ''}
            ${branding.contactInfo.phone ? `Tel: ${branding.contactInfo.phone} | ` : ''}
            ${branding.contactInfo.website ? `Web: ${branding.contactInfo.website}` : ''}
            ${branding.contactInfo.address ? `<br>${branding.contactInfo.address}` : ''}
          </div>
        ` : ''}
        ${branding.headerText ? `<div style="margin-top: 10px; font-style: italic;">${branding.headerText}</div>` : ''}
      </div>
    `
  }

  private renderFooter(branding?: BrandingOptions): string {
    return `
      <div class="footer">
        ${branding?.footerText || 'Készült a HangJegyzet rendszerrel'}
        <br>
        <small>Generálva: ${new Date().toLocaleDateString('hu-HU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</small>
      </div>
    `
  }

  private renderWatermark(branding: BrandingOptions): string {
    return `<div class="watermark">${branding.companyName || 'BIZALMAS'}</div>`
  }

  private renderSection(section: any, data: any, branding?: BrandingOptions): string {
    switch (section.type) {
      case 'header':
        return `<h1>${data.title}</h1>`
      
      case 'metadata':
        return this.renderMetadata(data)
      
      case 'summary':
        return data.summary ? `
          <section>
            <h2>${section.title || 'Összefoglaló'}</h2>
            <p>${data.summary}</p>
          </section>
        ` : ''
      
      case 'action-items':
        return data.actionItems?.length ? this.renderActionItems(data.actionItems, section.title) : ''
      
      case 'transcript':
        return data.transcript ? this.renderTranscript(data.transcript, section.title) : ''
      
      default:
        return ''
    }
  }

  private renderMetadata(data: any): string {
    return `
      <div class="metadata">
        <div class="metadata-item">
          <span class="metadata-label">Dátum:</span>
          <span>${new Date(data.date).toLocaleDateString('hu-HU', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Időtartam:</span>
          <span>${data.duration}</span>
        </div>
        ${data.participants ? `
          <div class="metadata-item">
            <span class="metadata-label">Résztvevők:</span>
            <span>${data.participants.join(', ')}</span>
          </div>
        ` : ''}
      </div>
    `
  }

  private renderActionItems(actionItems: any[], title?: string): string {
    return `
      <section>
        <h2>${title || 'Akció pontok'}</h2>
        <div class="action-items">
          ${actionItems.map(item => `
            <div class="action-item">
              <div class="action-item-task">${item.task}</div>
              <div class="action-item-meta">
                ${item.assignee ? `Felelős: ${item.assignee}` : ''}
                ${item.deadline ? ` | Határidő: ${item.deadline}` : ''}
                ${item.priority ? ` | Prioritás: ${this.translatePriority(item.priority)}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `
  }

  private renderTranscript(transcript: any, title?: string): string {
    if (!transcript.segments && !transcript.fullText) return ''
    
    return `
      <section>
        <h2>${title || 'Átírat'}</h2>
        ${transcript.segments ? 
          transcript.segments.map((segment: any) => `
            <div class="transcript-segment">
              ${segment.speaker ? `<div class="transcript-speaker">${segment.speaker}:</div>` : ''}
              <div class="transcript-text">${segment.text}</div>
            </div>
          `).join('') :
          `<p>${transcript.fullText}</p>`
        }
      </section>
    `
  }

  private translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      'high': 'Magas',
      'medium': 'Közepes',
      'low': 'Alacsony'
    }
    return translations[priority] || priority
  }

  private async generatePDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: false,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        }
      })
      
      return Buffer.from(pdfBuffer)
    } finally {
      await browser.close()
    }
  }
}