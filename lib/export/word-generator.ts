import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface MeetingData {
  id: string
  title: string
  date: Date
  duration: number
  participants?: string[]
  transcript: {
    speaker: string
    text: string
    timestamp: number
  }[]
  summary?: string
  actionItems?: string[]
  keyPoints?: string[]
  sentiment?: {
    overall: string
    distribution: {
      positive: number
      neutral: number
      negative: number
    }
  }
}

export class WordGenerator {
  async generateMeetingDocument(meeting: MeetingData): Promise<Blob> {
    const sections = []

    // Header section
    sections.push(
      new Paragraph({
        text: meeting.title,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        text: 'HangJegyzet.AI - Találkozó jegyzőkönyv',
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      })
    )

    // Meeting info section
    sections.push(...this.createMeetingInfo(meeting))

    // Summary section
    if (meeting.summary) {
      sections.push(...this.createSection('Összefoglaló', meeting.summary))
    }

    // Key points section
    if (meeting.keyPoints && meeting.keyPoints.length > 0) {
      sections.push(...this.createBulletList('Kulcspontok', meeting.keyPoints))
    }

    // Action items section
    if (meeting.actionItems && meeting.actionItems.length > 0) {
      sections.push(...this.createBulletList('Teendők', meeting.actionItems))
    }

    // Sentiment analysis section
    if (meeting.sentiment) {
      sections.push(...this.createSentimentSection(meeting.sentiment))
    }

    // Transcript section
    sections.push(...this.createTranscriptSection(meeting.transcript))

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children: sections
      }],
      creator: 'HangJegyzet.AI',
      title: meeting.title,
      description: 'Találkozó jegyzőkönyv',
    })

    // Generate blob
    const blob = await Packer.toBlob(doc)
    return blob
  }

  private createMeetingInfo(meeting: MeetingData): Paragraph[] {
    const paragraphs: Paragraph[] = []
    
    // Info table
    const rows: TableRow[] = []
    
    // Date row
    const formattedDate = format(meeting.date, 'yyyy. MMMM d. HH:mm', { locale: hu })
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Dátum:', bold: true })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: formattedDate })],
            width: { size: 75, type: WidthType.PERCENTAGE }
          })
        ]
      })
    )
    
    // Duration row
    const hours = Math.floor(meeting.duration / 3600)
    const minutes = Math.floor((meeting.duration % 3600) / 60)
    const durationText = hours > 0 ? `${hours} óra ${minutes} perc` : `${minutes} perc`
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: 'Időtartam:', bold: true })],
          }),
          new TableCell({
            children: [new Paragraph({ text: durationText })],
          })
        ]
      })
    )
    
    // Participants row
    if (meeting.participants && meeting.participants.length > 0) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: 'Résztvevők:', bold: true })],
            }),
            new TableCell({
              children: [new Paragraph({ text: meeting.participants.join(', ') })],
            })
          ]
        })
      )
    }

    paragraphs.push(
      new Paragraph({
        text: 'Találkozó információk',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    )

    const table = new Table({
      rows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE }
      }
    })

    // @ts-ignore - Table is a valid child but types are incomplete
    paragraphs.push(table)
    paragraphs.push(new Paragraph({ text: '', spacing: { after: 400 } }))
    
    return paragraphs
  }

  private createSection(title: string, content: string): Paragraph[] {
    return [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: content,
        spacing: { after: 400 }
      })
    ]
  }

  private createBulletList(title: string, items: string[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    ]

    items.forEach(item => {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: item })],
          spacing: { after: 100 }
        })
      )
    })

    paragraphs.push(new Paragraph({ text: '', spacing: { after: 400 } }))
    
    return paragraphs
  }

  private createSentimentSection(sentiment: any): Paragraph[] {
    const sentimentText = sentiment.overall === 'positive' ? 'Pozitív' :
                         sentiment.overall === 'negative' ? 'Negatív' : 'Semleges'

    return [
      new Paragraph({
        text: 'Hangulat elemzés',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Általános hangulat: ', bold: true }),
          new TextRun({ text: sentimentText })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Eloszlás:', bold: true })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Pozitív: ${sentiment.distribution.positive}%` })],
        spacing: { after: 50 }
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Semleges: ${sentiment.distribution.neutral}%` })],
        spacing: { after: 50 }
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Negatív: ${sentiment.distribution.negative}%` })],
        spacing: { after: 400 }
      })
    ]
  }

  private createTranscriptSection(transcript: any[]): Paragraph[] {
    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: 'Átirat',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      })
    ]

    transcript.forEach((entry, index) => {
      const timestamp = new Date(entry.timestamp)
      const time = format(timestamp, 'HH:mm:ss')

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${entry.speaker} (${time}): `, bold: true }),
            new TextRun({ text: entry.text })
          ],
          spacing: { after: 200 }
        })
      )

      // Add page break every 20 entries to avoid overly long pages
      if ((index + 1) % 20 === 0 && index < transcript.length - 1) {
        paragraphs.push(new PageBreak())
      }
    })

    return paragraphs
  }
}

// Fix for missing Packer import
import { Packer } from 'docx'

export async function generateMeetingWord(meeting: MeetingData): Promise<Blob> {
  const generator = new WordGenerator()
  return generator.generateMeetingDocument(meeting)
}