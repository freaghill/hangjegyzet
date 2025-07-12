import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface MeetingSummaryEmailProps {
  userName: string
  meetingTitle: string
  meetingDate: string
  duration: string
  participants: string[]
  keyPoints: string[]
  actionItems: Array<{
    text: string
    assignee?: string
    deadline?: string
  }>
  nextSteps?: string[]
  meetingUrl: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangjegyzet.ai'

export const MeetingSummaryEmail = ({
  userName = 'Kedves Felhasználó',
  meetingTitle = 'Meeting',
  meetingDate = new Date().toLocaleDateString('hu-HU'),
  duration = '30 perc',
  participants = [],
  keyPoints = [],
  actionItems = [],
  nextSteps = [],
  meetingUrl = '#',
}: MeetingSummaryEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {meetingTitle} összefoglaló - {meetingDate}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>HangJegyzet.AI</Text>
        
        <Heading style={h1}>Meeting Összefoglaló 📋</Heading>
        
        <Section style={meetingInfo}>
          <Text style={infoItem}>
            <strong>Meeting:</strong> {meetingTitle}
          </Text>
          <Text style={infoItem}>
            <strong>Dátum:</strong> {meetingDate}
          </Text>
          <Text style={infoItem}>
            <strong>Időtartam:</strong> {duration}
          </Text>
          {participants.length > 0 && (
            <Text style={infoItem}>
              <strong>Résztvevők:</strong> {participants.join(', ')}
            </Text>
          )}
        </Section>

        <Hr style={hr} />

        {keyPoints.length > 0 && (
          <>
            <Heading style={h2}>🔑 Főbb Pontok</Heading>
            <Section style={section}>
              {keyPoints.map((point, index) => (
                <Text key={index} style={listItem}>
                  • {point}
                </Text>
              ))}
            </Section>
            <Hr style={hr} />
          </>
        )}

        {actionItems.length > 0 && (
          <>
            <Heading style={h2}>✅ Teendők</Heading>
            <Section style={section}>
              {actionItems.map((item, index) => (
                <Section key={index} style={actionItem}>
                  <Text style={actionItemText}>
                    <strong>{index + 1}.</strong> {item.text}
                  </Text>
                  {(item.assignee || item.deadline) && (
                    <Text style={actionItemMeta}>
                      {item.assignee && (
                        <span style={tag}>👤 {item.assignee}</span>
                      )}
                      {item.deadline && (
                        <span style={tag}>📅 {item.deadline}</span>
                      )}
                    </Text>
                  )}
                </Section>
              ))}
            </Section>
            <Hr style={hr} />
          </>
        )}

        {nextSteps.length > 0 && (
          <>
            <Heading style={h2}>🚀 Következő Lépések</Heading>
            <Section style={section}>
              {nextSteps.map((step, index) => (
                <Text key={index} style={listItem}>
                  {index + 1}. {step}
                </Text>
              ))}
            </Section>
            <Hr style={hr} />
          </>
        )}

        <Section style={buttonContainer}>
          <Button style={button} href={meetingUrl}>
            Teljes átírat megtekintése
          </Button>
        </Section>

        <Section style={stats}>
          <Text style={statText}>
            Ez az összefoglaló AI által automatikusan készült. A teljes átírat és 
            további részletek eléréséhez kattintson a fenti gombra.
          </Text>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          <Link style={link} href={`${baseUrl}/meetings`}>
            Összes meeting
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/settings/notifications`}>
            Értesítési beállítások
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/support`}>
            Támogatás
          </Link>
        </Text>
        
        <Text style={footer}>
          HangJegyzet.AI • AI-alapú meeting intelligencia
        </Text>
      </Container>
    </Body>
  </Html>
)

// Styles
const main = {
  backgroundColor: '#f9fafb',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '40px auto',
  padding: '40px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
}

const logo = {
  fontSize: '20px',
  fontWeight: '700',
  color: '#2563eb',
  textAlign: 'center' as const,
  margin: '0 0 30px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '32px',
  margin: '0 0 20px',
}

const h2 = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '24px',
  margin: '20px 0 12px',
}

const meetingInfo = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  padding: '16px',
  margin: '0 0 20px',
}

const infoItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '4px 0',
}

const section = {
  margin: '16px 0',
}

const listItem = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 0',
  paddingLeft: '16px',
}

const actionItem = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  padding: '12px',
  margin: '12px 0',
  border: '1px solid #e5e7eb',
}

const actionItemText = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '0 0 4px',
}

const actionItemMeta = {
  fontSize: '13px',
  margin: '4px 0 0',
}

const tag = {
  backgroundColor: '#e5e7eb',
  borderRadius: '4px',
  color: '#4b5563',
  fontSize: '12px',
  padding: '2px 8px',
  marginRight: '8px',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '10px 20px',
  margin: '0 auto',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '30px 0',
}

const stats = {
  backgroundColor: '#eff6ff',
  borderRadius: '6px',
  padding: '16px',
  textAlign: 'center' as const,
}

const statText = {
  color: '#1e40af',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
  fontSize: '14px',
}

const footer = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  margin: '8px 0',
}

export default MeetingSummaryEmail