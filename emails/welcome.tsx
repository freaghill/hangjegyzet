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
import * as React from 'react'

interface WelcomeEmailProps {
  userEmail: string
  userName?: string
  plan?: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hangjegyzet.ai'

export const WelcomeEmail = ({
  userEmail,
  userName = 'Kedves Felhasználó',
  plan = 'Professional',
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>
      Üdvözöljük a HangJegyzet.AI-nál! Kezdje el a meetingek átalakítását.
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src={`${baseUrl}/logo.png`}
          width="150"
          height="50"
          alt="HangJegyzet.AI"
          style={logo}
        />
        
        <Heading style={h1}>Üdvözöljük, {userName}! 🎉</Heading>
        
        <Text style={paragraph}>
          Köszönjük, hogy regisztrált a HangJegyzet.AI platformra. Örülünk, hogy 
          csatlakozott hozzánk a meeting átírás és intelligencia forradalmasításában.
        </Text>

        <Section style={box}>
          <Text style={paragraph}>
            <strong>Az Ön {plan} csomagja a következőket tartalmazza:</strong>
          </Text>
          <Text style={list}>
            • 97%+ pontosságú AI átírás<br />
            • Automatikus meeting összefoglalók<br />
            • Teendők és döntések kinyerése<br />
            • Integráció népszerű eszközökkel<br />
            • Magyar nyelvű támogatás
          </Text>
        </Section>

        <Section style={buttonContainer}>
          <Button style={button} href={`${baseUrl}/dashboard`}>
            Kezdje el az első meeting átírását
          </Button>
        </Section>

        <Hr style={hr} />

        <Heading style={h2}>🚀 Gyors kezdés</Heading>
        
        <Text style={paragraph}>
          <strong>1. Töltse fel első felvételét</strong><br />
          Húzza be a fájlt vagy válasszon a támogatott forrásokból.
        </Text>
        
        <Text style={paragraph}>
          <strong>2. Válasszon átírási módot</strong><br />
          Fast (gyors), Balanced (kiegyensúlyozott) vagy Precision (precíz).
        </Text>
        
        <Text style={paragraph}>
          <strong>3. Kapja meg az eredményt</strong><br />
          Perceken belül kész az átírat, összefoglaló és teendők.
        </Text>

        <Hr style={hr} />

        <Section style={resources}>
          <Heading style={h2}>📚 Hasznos források</Heading>
          <Link style={link} href={`${baseUrl}/docs/getting-started`}>
            Kezdő útmutató
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/docs/best-practices`}>
            Legjobb gyakorlatok
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/support`}>
            Támogatás
          </Link>
        </Section>

        <Hr style={hr} />

        <Text style={footer}>
          Kérdése van? Írjon nekünk: {' '}
          <Link style={link} href="mailto:support@hangjegyzet.ai">
            support@hangjegyzet.ai
          </Link>
        </Text>
        
        <Text style={footer}>
          HangJegyzet.AI • Budapest, Magyarország
        </Text>
        
        <Text style={footerLinks}>
          <Link style={link} href={`${baseUrl}/privacy`}>
            Adatvédelem
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/terms`}>
            Feltételek
          </Link>
          {' • '}
          <Link style={link} href={`${baseUrl}/unsubscribe`}>
            Leiratkozás
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
}

const logo = {
  margin: '0 auto 40px',
  display: 'block',
}

const h1 = {
  color: '#1f2937',
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}

const h2 = {
  color: '#1f2937',
  fontSize: '20px',
  fontWeight: '600',
  lineHeight: '28px',
  margin: '30px 0 10px',
}

const paragraph = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const list = {
  ...paragraph,
  paddingLeft: '20px',
}

const box = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  margin: '0 auto',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '40px 0',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

const resources = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const footer = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '8px 0',
}

const footerLinks = {
  ...footer,
  margin: '32px 0 0 0',
}

export default WelcomeEmail