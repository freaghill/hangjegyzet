import { ExportResult, ExportTemplate } from '../types'

export class TextExporter {
  async export(data: any, template: ExportTemplate): Promise<ExportResult> {
    try {
      const content = this.generateText(data, template)
      const buffer = Buffer.from(content, 'utf-8')
      
      return {
        success: true,
        buffer,
        filename: `${data.title}-${new Date().toISOString().split('T')[0]}.txt`,
        mimeType: 'text/plain'
      }
    } catch (error) {
      console.error('Text export error:', error)
      throw error
    }
  }

  private generateText(data: any, template: ExportTemplate): string {
    const sections = template.sections
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)
      .map(section => this.renderSection(section, data))
      .filter(content => content)
      .join('\n\n' + '='.repeat(80) + '\n\n')

    const header = this.generateHeader(data)
    const footer = this.generateFooter()

    return `${header}\n\n${sections}\n\n${footer}`
  }

  private generateHeader(data: any): string {
    const lines = [
      '='.repeat(80),
      data.title.toUpperCase(),
      '='.repeat(80),
      '',
      `Dátum: ${new Date(data.date).toLocaleDateString('hu-HU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      `Időtartam: ${data.duration}`,
    ]

    if (data.participants) {
      lines.push(`Résztvevők: ${data.participants.join(', ')}`)
    }

    return lines.join('\n')
  }

  private generateFooter(): string {
    return [
      '='.repeat(80),
      'Készült a HangJegyzet rendszerrel',
      `Generálva: ${new Date().toLocaleDateString('hu-HU', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      '='.repeat(80)
    ].join('\n')
  }

  private renderSection(section: any, data: any): string {
    switch (section.type) {
      case 'summary':
        return data.summary ? this.renderSummary(data.summary, section.title) : ''
      
      case 'action-items':
        return data.actionItems?.length ? this.renderActionItems(data.actionItems, section.title) : ''
      
      case 'transcript':
        return data.transcript ? this.renderTranscript(data.transcript, section.title) : ''
      
      default:
        return ''
    }
  }

  private renderSummary(summary: string, title?: string): string {
    return [
      (title || 'ÖSSZEFOGLALÓ').toUpperCase(),
      '-'.repeat(40),
      '',
      this.wrapText(summary, 80)
    ].join('\n')
  }

  private renderActionItems(actionItems: any[], title?: string): string {
    const lines = [
      (title || 'AKCIÓ PONTOK').toUpperCase(),
      '-'.repeat(40),
      ''
    ]

    actionItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.task}`)
      
      const meta = []
      if (item.assignee) meta.push(`   Felelős: ${item.assignee}`)
      if (item.deadline) meta.push(`   Határidő: ${item.deadline}`)
      if (item.priority) meta.push(`   Prioritás: ${this.translatePriority(item.priority)}`)
      
      if (meta.length > 0) {
        lines.push(...meta)
      }
      lines.push('')
    })

    return lines.join('\n')
  }

  private renderTranscript(transcript: any, title?: string): string {
    const lines = [
      (title || 'ÁTÍRAT').toUpperCase(),
      '-'.repeat(40),
      ''
    ]

    if (transcript.segments) {
      transcript.segments.forEach((segment: any) => {
        if (segment.speaker) {
          lines.push(`[${segment.speaker}]`)
        }
        lines.push(this.wrapText(segment.text, 80))
        lines.push('')
      })
    } else if (transcript.fullText) {
      lines.push(this.wrapText(transcript.fullText, 80))
    }

    return lines.join('\n')
  }

  private wrapText(text: string, maxWidth: number): string {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    words.forEach(word => {
      if (currentLine.length + word.length + 1 > maxWidth) {
        lines.push(currentLine.trim())
        currentLine = word
      } else {
        currentLine += (currentLine ? ' ' : '') + word
      }
    })

    if (currentLine) {
      lines.push(currentLine.trim())
    }

    return lines.join('\n')
  }

  private translatePriority(priority: string): string {
    const translations: Record<string, string> = {
      'high': 'Magas',
      'medium': 'Közepes',
      'low': 'Alacsony'
    }
    return translations[priority] || priority
  }
}