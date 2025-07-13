import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { ExportResult, BrandingOptions, ExportTemplate } from '../types'
import fetch from 'node-fetch'

export class WordExporter {
  async export(
    data: any,
    template: ExportTemplate,
    branding?: BrandingOptions
  ): Promise<ExportResult> {
    try {
      const doc = await this.generateDocument(data, template, branding)
      const buffer = await Packer.toBuffer(doc)
      
      return {
        success: true,
        buffer,
        filename: `${data.title}-${new Date().toISOString().split('T')[0]}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      }
    } catch (error) {
      console.error('Word export error:', error)
      throw error
    }
  }

  private async generateDocument(data: any, template: ExportTemplate, branding?: BrandingOptions): Promise<Document> {
    const sections = template.sections
      .filter(s => s.visible)
      .sort((a, b) => a.order - b.order)

    const children: any[] = []

    // Add header with branding
    if (branding?.includeBranding) {
      children.push(...await this.createHeader(branding))
    }

    // Add title
    children.push(
      new Paragraph({
        text: data.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    )

    // Add sections
    for (const section of sections) {
      const sectionContent = await this.createSection(section, data, template.styles)
      if (sectionContent.length > 0) {
        children.push(...sectionContent)
      }
    }

    // Add footer
    if (branding?.footerText || true) {
      children.push(...this.createFooter(branding))
    }

    return new Document({
      styles: {
        default: {
          heading1: {
            run: {
              size: template.styles.fontSize.title * 2,
              bold: true,
              color: branding?.primaryColor?.replace('#', '') || '2563eb'
            },
            paragraph: {
              spacing: { after: 240 }
            }
          },
          heading2: {
            run: {
              size: template.styles.fontSize.heading * 2,
              bold: true,
              color: branding?.primaryColor?.replace('#', '') || '2563eb'
            },
            paragraph: {
              spacing: { before: 360, after: 120 }
            }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: template.styles.pageMargins.top * 567,
              right: template.styles.pageMargins.right * 567,
              bottom: template.styles.pageMargins.bottom * 567,
              left: template.styles.pageMargins.left * 567
            }
          }
        },
        children
      }]
    })
  }

  private async createHeader(branding: BrandingOptions): Promise<Paragraph[]> {
    const paragraphs: Paragraph[] = []

    if (branding.logoUrl) {
      try {
        const response = await fetch(branding.logoUrl)
        const imageBuffer = await response.buffer()
        
        paragraphs.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: 150,
                  height: 50
                }
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        )
      } catch (error) {
        console.error('Failed to load logo:', error)
      }
    }

    if (branding.companyName) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: branding.companyName,
              bold: true,
              size: 28,
              color: branding.primaryColor?.replace('#', '') || '2563eb'
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      )
    }

    if (branding.includeContactInfo && branding.contactInfo) {
      const contactInfo = []
      if (branding.contactInfo.email) contactInfo.push(`Email: ${branding.contactInfo.email}`)
      if (branding.contactInfo.phone) contactInfo.push(`Tel: ${branding.contactInfo.phone}`)
      if (branding.contactInfo.website) contactInfo.push(`Web: ${branding.contactInfo.website}`)
      
      if (contactInfo.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: contactInfo.join(' | '),
                size: 20,
                color: '64748b'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 50 }
          })
        )
      }

      if (branding.contactInfo.address) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: branding.contactInfo.address,
                size: 20,
                color: '64748b'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          })
        )
      }
    }

    if (branding.headerText) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: branding.headerText,
              italics: true,
              size: 22
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )
    }

    // Add separator line
    paragraphs.push(
      new Paragraph({
        border: {
          bottom: {
            color: branding.primaryColor?.replace('#', '') || '2563eb',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        },
        spacing: { after: 400 }
      })
    )

    return paragraphs
  }

  private async createSection(section: any, data: any, styles: any): Promise<Paragraph[]> {
    switch (section.type) {
      case 'metadata':
        return this.createMetadataSection(data, styles)
      
      case 'summary':
        return data.summary ? this.createSummarySection(data.summary, section.title, styles) : []
      
      case 'action-items':
        return data.actionItems?.length ? this.createActionItemsSection(data.actionItems, section.title, styles) : []
      
      case 'transcript':
        return data.transcript ? this.createTranscriptSection(data.transcript, section.title, styles) : []
      
      default:
        return []
    }
  }

  private createMetadataSection(data: any, styles: any): Paragraph[] {
    const rows: TableRow[] = []

    // Date row
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Dátum:', bold: true })],
            })],
            shading: { fill: 'f3f4f6' }
          }),
          new TableCell({
            children: [new Paragraph({ 
              text: new Date(data.date).toLocaleDateString('hu-HU', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            })]
          })
        ]
      })
    )

    // Duration row
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Időtartam:', bold: true })],
            })],
            shading: { fill: 'f3f4f6' }
          }),
          new TableCell({
            children: [new Paragraph({ text: data.duration })]
          })
        ]
      })
    )

    // Participants row
    if (data.participants) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Résztvevők:', bold: true })],
              })],
              shading: { fill: 'f3f4f6' }
            }),
            new TableCell({
              children: [new Paragraph({ text: data.participants.join(', ') })]
            })
          ]
        })
      )
    }

    return [
      new Table({
        rows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        margins: {
          top: 100,
          bottom: 100,
          left: 100,
          right: 100
        }
      }),
      new Paragraph({ text: '', spacing: { after: 200 } })
    ]
  }

  private createSummarySection(summary: string, title: string, styles: any): Paragraph[] {
    return [
      new Paragraph({
        text: title || 'Összefoglaló',
        heading: HeadingLevel.HEADING_2
      }),
      new Paragraph({
        text: summary,
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED
      })
    ]
  }

  private createActionItemsSection(actionItems: any[], title: string, styles: any): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: title || 'Akció pontok',
        heading: HeadingLevel.HEADING_2
      })
    ]

    actionItems.forEach((item, index) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${index + 1}. ${item.task}`,
              bold: true,
              size: styles.fontSize.body * 2
            })
          ],
          spacing: { before: 120, after: 60 }
        })
      )

      const meta = []
      if (item.assignee) meta.push(`Felelős: ${item.assignee}`)
      if (item.deadline) meta.push(`Határidő: ${item.deadline}`)
      if (item.priority) meta.push(`Prioritás: ${this.translatePriority(item.priority)}`)

      if (meta.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: meta.join(' | '),
                size: styles.fontSize.small * 2,
                color: '64748b'
              })
            ],
            indent: { left: 720 },
            spacing: { after: 120 }
          })
        )
      }
    })

    paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }))
    return paragraphs
  }

  private createTranscriptSection(transcript: any, title: string, styles: any): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: title || 'Átírat',
        heading: HeadingLevel.HEADING_2
      })
    ]

    if (transcript.segments) {
      transcript.segments.forEach((segment: any) => {
        if (segment.speaker) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${segment.speaker}:`,
                  bold: true,
                  color: '2563eb'
                })
              ],
              spacing: { before: 120, after: 60 }
            })
          )
        }

        paragraphs.push(
          new Paragraph({
            text: segment.text,
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 120 },
            indent: segment.speaker ? { left: 720 } : undefined
          })
        )
      })
    } else if (transcript.fullText) {
      paragraphs.push(
        new Paragraph({
          text: transcript.fullText,
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 200 }
        })
      )
    }

    return paragraphs
  }

  private createFooter(branding?: BrandingOptions): Paragraph[] {
    return [
      new Paragraph({
        border: {
          top: {
            color: 'e5e7eb',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6
          }
        },
        spacing: { before: 400 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: branding?.footerText || 'Készült a HangJegyzet rendszerrel',
            size: 20,
            color: '64748b'
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Generálva: ${new Date().toLocaleDateString('hu-HU', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`,
            size: 18,
            color: '9ca3af'
          })
        ],
        alignment: AlignmentType.CENTER
      })
    ]
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