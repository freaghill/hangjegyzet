import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface TeamInvitationEmailProps {
  inviteUrl: string
  teamName: string
  inviterName: string
  inviterEmail: string
  recipientEmail: string
  role: string
  message?: string
  expiresAt: string
}

export function TeamInvitationEmail({
  inviteUrl,
  teamName,
  inviterName,
  inviterEmail,
  recipientEmail,
  role,
  message,
  expiresAt
}: TeamInvitationEmailProps) {
  const previewText = `${inviterName} meghívta Önt a ${teamName} csapatba`

  const roleDisplay = {
    owner: 'Tulajdonos',
    admin: 'Adminisztrátor',
    member: 'Tag',
    viewer: 'Megtekintő'
  }[role] || role

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Csapat meghívó</Heading>
          
          <Text style={text}>
            <strong>{inviterName}</strong> ({inviterEmail}) meghívta Önt, hogy csatlakozzon a(z) <strong>{teamName}</strong> csapathoz mint <strong>{roleDisplay}</strong>.
          </Text>

          {message && (
            <Section style={messageSection}>
              <Text style={messageLabel}>Üzenet a meghívótól:</Text>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              Meghívó elfogadása
            </Button>
          </Section>

          <Text style={text}>
            Vagy másolja be ezt a linket a böngészőjébe:
          </Text>
          <Link href={inviteUrl} style={link}>
            {inviteUrl}
          </Link>

          <Hr style={hr} />

          <Text style={footerText}>
            Ez a meghívó {new Date(expiresAt).toLocaleDateString('hu-HU')} napján lejár.
            Ha nem várta ezt a meghívót, nyugodtan hagyja figyelmen kívül ezt az e-mailt.
          </Text>

          <Text style={footerText}>
            Üdvözlettel,<br />
            A Hangjegyzet csapata
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '5px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const,
  margin: '0 40px 20px',
}

const messageSection = {
  backgroundColor: '#f4f4f4',
  borderRadius: '4px',
  margin: '20px 40px',
  padding: '20px',
}

const messageLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
}

const messageText = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textAlign: 'left' as const,
  textDecoration: 'underline',
  margin: '0 40px',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '40px 40px 20px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'left' as const,
  margin: '0 40px 10px',
}

export default TeamInvitationEmail