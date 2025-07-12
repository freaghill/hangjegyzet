import puppeteer, { Browser, PDFOptions } from 'puppeteer'
import { templateEngine, TemplateData } from './template-engine'
import { ExportTemplate } from './templates/default-templates'
import { 
  OrganizationBranding, 
  generateBrandedCSS, 
  generateHeaderTemplate, 
  generateFooterTemplate 
} from './branding'

export interface PDFGeneratorOptions {
  format?: 'A4' | 'Letter' | 'Legal'
  landscape?: boolean
  margin?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
  preferCSSPageSize?: boolean
  printBackground?: boolean
  scale?: number
}

export class PDFGenerator {
  private browser: Browser | null = null
  
  /**
   * Initialize the PDF generator
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      })
    }
  }
  
  /**
   * Generate PDF from template
   */
  async generatePDF(
    template: ExportTemplate | string,
    data: TemplateData,
    options: PDFGeneratorOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    const page = await this.browser!.newPage()
    
    try {
      // Render HTML from template
      const html = templateEngine.renderTemplate(template, data)
      
      // Add page numbers to HTML if requested
      const finalHtml = options.displayHeaderFooter 
        ? templateEngine.addPageNumbers(html, 'pdf')
        : html
      
      // Set content
      await page.setContent(finalHtml, {
        waitUntil: 'networkidle0'
      })
      
      // Default PDF options
      const pdfOptions: PDFOptions = {
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            <span class="title"></span>
          </div>
        `,
        footerTemplate: options.footerTemplate || `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            <span class="pageNumber"></span> / <span class="totalPages"></span>
          </div>
        `,
        preferCSSPageSize: options.preferCSSPageSize ?? false,
        printBackground: options.printBackground ?? true,
        scale: options.scale || 1
      }
      
      // Generate PDF
      const pdf = await page.pdf(pdfOptions)
      
      return pdf
    } finally {
      await page.close()
    }
  }
  
  /**
   * Generate multiple PDFs
   */
  async generateMultiplePDFs(
    jobs: Array<{
      template: ExportTemplate | string
      data: TemplateData
      options?: PDFGeneratorOptions
    }>
  ): Promise<Buffer[]> {
    await this.initialize()
    
    const results: Buffer[] = []
    
    for (const job of jobs) {
      const pdf = await this.generatePDF(job.template, job.data, job.options)
      results.push(pdf)
    }
    
    return results
  }
  
  /**
   * Generate PDF with custom CSS
   */
  async generatePDFWithCustomCSS(
    template: string,
    data: TemplateData,
    customCSS: string,
    options: PDFGeneratorOptions = {}
  ): Promise<Buffer> {
    // Render with custom styles
    const html = templateEngine.renderWithStyles(template, data, customCSS)
    
    return this.generatePDF(html, data, options)
  }
  
  /**
   * Generate PDF from URL
   */
  async generatePDFFromURL(
    url: string,
    options: PDFGeneratorOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    const page = await this.browser!.newPage()
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle0'
      })
      
      const pdfOptions: PDFOptions = {
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        printBackground: options.printBackground ?? true,
        scale: options.scale || 1
      }
      
      const pdf = await page.pdf(pdfOptions)
      
      return pdf
    } finally {
      await page.close()
    }
  }
  
  /**
   * Generate branded PDF with organization styling
   */
  async generateBrandedPDF(
    template: ExportTemplate | string,
    data: TemplateData,
    branding: OrganizationBranding,
    options: PDFGeneratorOptions = {}
  ): Promise<Buffer> {
    await this.initialize()
    
    const page = await this.browser!.newPage()
    
    try {
      // Generate branded CSS
      const brandedCSS = generateBrandedCSS(branding)
      
      // Generate header and footer templates
      const headerHTML = generateHeaderTemplate(branding, data.meeting?.title)
      const footerHTML = generateFooterTemplate(branding)
      
      // Render HTML from template
      let html = templateEngine.renderTemplate(template, data)
      
      // Add branding elements
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>${brandedCSS}</style>
        </head>
        <body>
          ${branding.document?.watermark ? `<div class="watermark">${branding.document.watermark}</div>` : ''}
          ${branding.document?.confidentialityNotice ? `<div class="confidential-notice">${branding.document.confidentialityNotice}</div>` : ''}
          ${headerHTML}
          ${html}
          ${footerHTML}
        </body>
        </html>
      `
      
      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      })
      
      // Configure PDF options with branding
      const pdfOptions: PDFOptions = {
        format: options.format || 'A4',
        landscape: options.landscape || false,
        margin: options.margin || {
          top: branding.header?.show ? '30mm' : '20mm',
          bottom: branding.footer?.show ? '30mm' : '20mm',
          left: '20mm',
          right: '20mm'
        },
        displayHeaderFooter: true,
        headerTemplate: options.headerTemplate || `
          <div style="font-size: 10px; width: 100%; margin: 0 20mm;">
            ${branding.header?.includePageNumbers ? '<span style="float: right;"><span class="pageNumber"></span> / <span class="totalPages"></span></span>' : ''}
          </div>
        `,
        footerTemplate: options.footerTemplate || `
          <div style="font-size: 9px; width: 100%; margin: 0 20mm; text-align: center; color: #666;">
            ${branding.footer?.text || ''} ${branding.footer?.includeDate ? '• ' + new Date().toLocaleDateString('hu-HU') : ''}
          </div>
        `,
        preferCSSPageSize: options.preferCSSPageSize ?? false,
        printBackground: options.printBackground ?? true,
        scale: options.scale || 1
      }
      
      // Generate PDF
      const pdf = await page.pdf(pdfOptions)
      
      return pdf
    } finally {
      await page.close()
    }
  }
  
  /**
   * Cleanup browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
  
  /**
   * Generate table of contents PDF
   */
  async generateTOCPDF(
    meetings: Array<{
      id: string
      title: string
      date: Date
      duration: number
      summary?: string
    }>,
    organizationName: string
  ): Promise<Buffer> {
    const tocTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meeting tartalomjegyzék</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 40px;
    }
    .header {
      text-align: center;
      margin-bottom: 50px;
    }
    h1 {
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .org-name {
      color: #666;
      font-size: 18px;
    }
    .toc-entry {
      margin-bottom: 25px;
      padding: 20px;
      background: #f8f9fa;
      border-left: 4px solid #007bff;
      page-break-inside: avoid;
    }
    .meeting-title {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .meeting-meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .meeting-summary {
      font-size: 14px;
      line-height: 1.5;
    }
    .page-break {
      page-break-after: always;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Meeting Tartalomjegyzék</h1>
    <div class="org-name">{{organizationName}}</div>
    <div class="date">{{formatDate now}}</div>
  </div>
  
  {{#each meetings}}
  <div class="toc-entry">
    <div class="meeting-title">{{title}}</div>
    <div class="meeting-meta">
      {{formatDate date}} • {{formatDuration duration}}
    </div>
    {{#if summary}}
    <div class="meeting-summary">{{summary}}</div>
    {{/if}}
  </div>
  {{/each}}
</body>
</html>
    `
    
    const data = {
      organizationName,
      meetings,
      now: new Date()
    }
    
    return this.generatePDF(tocTemplate, data as any, {
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true
    })
  }
  
  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator()

// Cleanup on process exit
process.on('exit', () => {
  pdfGenerator.close()
})

process.on('SIGINT', () => {
  pdfGenerator.close().then(() => process.exit(0))
})

process.on('SIGTERM', () => {
  pdfGenerator.close().then(() => process.exit(0))
})