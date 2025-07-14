import { EmailTemplate, EmailTemplateType } from './types'
import { welcomeTemplate } from './templates/welcome'
import { transcriptionCompleteTemplate } from './templates/transcription-complete'
import { paymentReceiptTemplate } from './templates/payment-receipt'
// import { teamInvitationTemplate } from './templates/team-invitation'
import { passwordResetTemplate } from './templates/password-reset'
import { emailVerificationTemplate } from './templates/email-verification'

export class EmailTemplateService {
  private templates: Map<string, EmailTemplate>

  constructor() {
    this.templates = new Map()
    this.loadTemplates()
  }

  private loadTemplates() {
    // Register all templates
    this.registerTemplate(welcomeTemplate)
    this.registerTemplate(transcriptionCompleteTemplate)
    this.registerTemplate(paymentReceiptTemplate)
    // this.registerTemplate(teamInvitationTemplate)
    this.registerTemplate(passwordResetTemplate)
    this.registerTemplate(emailVerificationTemplate)
  }

  private registerTemplate(template: EmailTemplate) {
    const key = `${template.id}:${template.language}`
    this.templates.set(key, template)
  }

  async getTemplate(
    type: EmailTemplateType, 
    language: string = 'hu'
  ): Promise<EmailTemplate> {
    const key = `${type}:${language}`
    const template = this.templates.get(key)
    
    if (!template) {
      // Fallback to Hungarian if language not found
      const fallbackKey = `${type}:hu`
      const fallbackTemplate = this.templates.get(fallbackKey)
      
      if (!fallbackTemplate) {
        throw new Error(`Template not found: ${type}`)
      }
      
      return fallbackTemplate
    }
    
    return template
  }

  async processTemplate(
    template: EmailTemplate,
    variables: Record<string, any>
  ): Promise<{
    subject: string
    htmlContent: string
    textContent: string
  }> {
    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in variables)) {
        if (variable.defaultValue) {
          variables[variable.name] = variable.defaultValue
        } else {
          throw new Error(`Missing required variable: ${variable.name}`)
        }
      }
    }

    // Process template content
    const processedSubject = this.interpolate(template.subject, variables)
    const processedHtml = this.interpolate(template.htmlContent, variables)
    const processedText = this.interpolate(template.textContent, variables)

    return {
      subject: processedSubject,
      htmlContent: this.wrapInLayout(processedHtml, variables),
      textContent: processedText
    }
  }

  private interpolate(content: string, variables: Record<string, any>): string {
    return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match
    })
  }

  private wrapInLayout(content: string, variables: Record<string, any>): string {
    return `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${variables.subject || 'Hangjegyzet'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f7f7f7;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #3b82f6;
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      background-color: #f3f4f6;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    h2 {
      color: #1f2937;
      font-size: 24px;
      margin-top: 0;
    }
    h3 {
      color: #374151;
      font-size: 18px;
    }
    p {
      margin: 15px 0;
      color: #4b5563;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background-color: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .alert {
      background-color: #fee2e2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 12px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .success {
      background-color: #d1fae5;
      border: 1px solid #a7f3d0;
      color: #065f46;
      padding: 12px;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Hangjegyzet</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Ez egy automatikus üzenet a Hangjegyzet rendszerből.</p>
      <p>
        <a href="${variables.appUrl || 'https://hangjegyzet.hu'}">hangjegyzet.hu</a> | 
        <a href="${variables.unsubscribeUrl || '#'}">Leiratkozás</a> | 
        <a href="${variables.privacyUrl || '#'}">Adatvédelem</a>
      </p>
      <p>&copy; ${new Date().getFullYear()} Hangjegyzet. Minden jog fenntartva.</p>
    </div>
  </div>
</body>
</html>
    `
  }

  getAvailableTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values())
  }

  getTemplatesByLanguage(language: string): EmailTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.language === language)
  }

  validateVariables(
    templateType: EmailTemplateType,
    variables: Record<string, any>,
    language: string = 'hu'
  ): { valid: boolean; errors: string[] } {
    const template = this.templates.get(`${templateType}:${language}`)
    if (!template) {
      return { valid: false, errors: ['Template not found'] }
    }

    const errors: string[] = []
    
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in variables) && !variable.defaultValue) {
        errors.push(`Missing required variable: ${variable.name}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}