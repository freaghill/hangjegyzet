'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { Shield, Globe, Database, Lock, UserCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

// export const metadata: Metadata = {
//   title: 'Privacy Policy - HangJegyzet.AI',
//   description: 'Privacy Policy and Adatvédelmi Tájékoztató for HangJegyzet.AI - Learn how we protect your data.',
// }

export default function PrivacyPage() {
  const [language, setLanguage] = useState<'en' | 'hu'>('hu')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'en' ? 'Privacy Policy' : 'Adatvédelmi Tájékoztató'}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {language === 'en' ? 'Last updated: January 8, 2025' : 'Utolsó frissítés: 2025. január 8.'}
          </p>
          
          {/* Language Switcher */}
          <div className="flex justify-center gap-2">
            <Button
              variant={language === 'hu' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('hu')}
            >
              <Globe className="w-4 h-4 mr-2" />
              Magyar
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLanguage('en')}
            >
              <Globe className="w-4 h-4 mr-2" />
              English
            </Button>
          </div>
        </div>
      </section>

      {/* GDPR Notice */}
      <section className="pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-green-50 border-green-200">
            <UserCheck className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {language === 'en' 
                ? 'We are fully GDPR compliant and committed to protecting your privacy.'
                : 'Teljes mértékben GDPR-kompatibilisek vagyunk és elkötelezettek az Ön adatainak védelme mellett.'}
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            {language === 'en' ? (
              <EnglishPrivacy />
            ) : (
              <HungarianPrivacy />
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">
              {language === 'en' 
                ? 'Questions about our privacy practices?' 
                : 'Kérdése van adatvédelmi gyakorlatunkkal kapcsolatban?'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild>
                <Link href="mailto:privacy@hangjegyzet.ai">
                  {language === 'en' ? 'Contact Privacy Team' : 'Adatvédelmi Csapat'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/terms">
                  {language === 'en' ? 'Terms of Service' : 'Szolgáltatási Feltételek'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cookie-policy">
                  {language === 'en' ? 'Cookie Policy' : 'Süti Szabályzat'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EnglishPrivacy() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. Introduction</h2>
      <p>
        HangJegyzet.AI ("we," "our," or "us") operates the HangJegyzet.AI meeting transcription and intelligence platform 
        (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
        when you use our Service.
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">Data Controller:</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Company: HangJegyzet.AI Kft.</li>
          <li>Address: [Your Hungarian Address]</li>
          <li>Email: privacy@hangjegyzet.ai</li>
          <li>Data Protection Officer: [DPO Name] (dpo@hangjegyzet.ai)</li>
        </ul>
      </div>

      <h2>2. Information We Collect</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
            Personal Information
          </h3>
          <ul className="text-sm space-y-1">
            <li>• Name and email address</li>
            <li>• Organization details</li>
            <li>• Profile information</li>
            <li>• Payment information</li>
          </ul>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center">
            <Database className="w-5 h-5 mr-2 text-green-600" />
            Meeting Data
          </h3>
          <ul className="text-sm space-y-1">
            <li>• Audio/video recordings</li>
            <li>• Transcriptions</li>
            <li>• AI-generated insights</li>
            <li>• Meeting metadata</li>
          </ul>
        </Card>
      </div>

      <h3>2.1 Personal Information You Provide</h3>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, password (hashed), organization name</li>
        <li><strong>Profile Information:</strong> Job title, department, profile picture (optional)</li>
        <li><strong>Payment Information:</strong> Processed by our payment providers (Stripe, SimplePay, Billingo)</li>
        <li><strong>Communication Data:</strong> Support tickets, feedback, correspondence</li>
      </ul>

      <h3>2.2 Meeting Data</h3>
      <ul>
        <li><strong>Audio/Video Files:</strong> Meeting recordings (up to 500MB per file)</li>
        <li><strong>Transcriptions:</strong> Text converted from audio using AI services</li>
        <li><strong>Meeting Metadata:</strong> Title, date, duration, participants, speaking time distribution</li>
        <li><strong>AI-Generated Insights:</strong> Action items, key decisions, sentiment analysis, summaries</li>
      </ul>

      <h3>2.3 Automatically Collected Information</h3>
      <ul>
        <li><strong>Usage Data:</strong> Features used, frequency, interaction patterns</li>
        <li><strong>Technical Data:</strong> IP address, browser type, device information, access times</li>
        <li><strong>Performance Data:</strong> Error logs, system diagnostics</li>
      </ul>

      <h2>3. How We Use Your Information</h2>

      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Primary Purposes:</h3>
        <ul className="space-y-2">
          <li>✓ Process and transcribe your meeting recordings</li>
          <li>✓ Generate AI-powered insights and action items</li>
          <li>✓ Provide analytics and reporting features</li>
          <li>✓ Enable collaboration and sharing features</li>
          <li>✓ Improve our services and develop new features</li>
        </ul>
      </div>

      <h2>4. AI Processing</h2>

      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Your audio is processed by AI services to create transcriptions and insights. 
          We have contractual guarantees that AI providers do not train on your data.
        </AlertDescription>
      </Alert>

      <h3>4.1 AI Providers</h3>
      <ul>
        <li><strong>OpenAI (GPT-4):</strong> For text analysis and insights</li>
        <li><strong>Anthropic (Claude):</strong> For advanced language processing</li>
        <li><strong>Deepgram:</strong> For speech-to-text transcription</li>
        <li><strong>OpenAI Whisper:</strong> For multilingual transcription</li>
      </ul>

      <h3>4.2 AI Data Retention</h3>
      <ul>
        <li>Audio files sent to AI services are deleted within 24 hours</li>
        <li>Transcription results are retained according to your preferences</li>
        <li>AI providers do not retain your content for model training</li>
      </ul>

      <h2>5. Data Sharing and Disclosure</h2>

      <h3>5.1 Service Providers (Sub-processors)</h3>
      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Provider</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Purpose</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Supabase</td>
            <td className="border border-gray-300 px-4 py-2">Database & Auth</td>
            <td className="border border-gray-300 px-4 py-2">EU/US</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Hetzner</td>
            <td className="border border-gray-300 px-4 py-2">Infrastructure</td>
            <td className="border border-gray-300 px-4 py-2">Germany</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">OpenAI</td>
            <td className="border border-gray-300 px-4 py-2">AI Processing</td>
            <td className="border border-gray-300 px-4 py-2">United States</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Deepgram</td>
            <td className="border border-gray-300 px-4 py-2">Transcription</td>
            <td className="border border-gray-300 px-4 py-2">United States</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Data Retention</h2>

      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Data Type</th>
              <th className="text-left py-2">Default Retention</th>
              <th className="text-left py-2">User Control</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Account Information</td>
              <td className="py-2">Duration + 30 days</td>
              <td className="py-2">Delete anytime</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Meeting Recordings</td>
              <td className="py-2">24 hours</td>
              <td className="py-2">Optional extended</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Transcriptions</td>
              <td className="py-2">90 days</td>
              <td className="py-2">30-365 days</td>
            </tr>
            <tr>
              <td className="py-2">AI Insights</td>
              <td className="py-2">1 year</td>
              <td className="py-2">Export/delete</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>7. Your Rights (GDPR)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4 bg-green-50">
          <h3 className="font-semibold mb-2">Access & Control</h3>
          <ul className="text-sm space-y-1">
            <li>✓ Request a copy of your data</li>
            <li>✓ Correct inaccurate information</li>
            <li>✓ Delete your data ("right to be forgotten")</li>
            <li>✓ Restrict processing</li>
          </ul>
        </Card>
        
        <Card className="p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">Portability & Objection</h3>
          <ul className="text-sm space-y-1">
            <li>✓ Export data in machine-readable format</li>
            <li>✓ Transfer to another service</li>
            <li>✓ Object to processing</li>
            <li>✓ Withdraw consent anytime</li>
          </ul>
        </Card>
      </div>

      <h3>How to Exercise Your Rights</h3>
      <ul>
        <li><strong>Email:</strong> privacy@hangjegyzet.ai</li>
        <li><strong>In-App:</strong> Settings → Privacy → Your Rights</li>
        <li><strong>Response Time:</strong> Within 30 days</li>
      </ul>

      <h2>8. Data Security</h2>

      <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg my-4">
        <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold mb-2">Security Measures</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>Encryption:</strong> AES-256 for data at rest, TLS 1.3 for data in transit</li>
            <li>• <strong>Access Control:</strong> Role-based permissions, multi-factor authentication</li>
            <li>• <strong>Infrastructure:</strong> Isolated environments, regular security updates</li>
            <li>• <strong>Monitoring:</strong> 24/7 security monitoring, intrusion detection</li>
          </ul>
        </div>
      </div>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be transferred to countries outside Hungary. We ensure appropriate safeguards through:
      </p>
      <ul>
        <li>EU-US Data Privacy Framework for US-based processors</li>
        <li>Standard Contractual Clauses for other transfers</li>
        <li>All transfers are encrypted using TLS 1.3</li>
      </ul>

      <h2>10. Children's Privacy</h2>
      <p>
        Our Service is not intended for users under 16 years of age. We do not knowingly collect information from children.
      </p>

      <h2>11. Contact Information</h2>
      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <p className="font-semibold mb-2">For privacy-related questions:</p>
        <ul className="list-none space-y-1">
          <li>Email: privacy@hangjegyzet.ai</li>
          <li>DPO: dpo@hangjegyzet.ai</li>
          <li>Address: [Your Hungarian Address]</li>
        </ul>
      </div>

      <h2>12. Supervisory Authority</h2>
      <p>
        You have the right to lodge a complaint with the Hungarian National Authority for Data Protection 
        and Freedom of Information (NAIH):
      </p>
      <ul>
        <li>Website: <a href="https://www.naih.hu/" className="text-blue-600 hover:underline">https://www.naih.hu/</a></li>
        <li>Address: 1055 Budapest, Falk Miksa utca 9-11</li>
        <li>Phone: +36-1-391-1400</li>
        <li>Email: ugyfelszolgalat@naih.hu</li>
      </ul>
    </div>
  )
}

function HungarianPrivacy() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. Bevezetés</h2>
      <p>
        A HangJegyzet.AI ("mi", "miénk" vagy "minket") üzemelteti a HangJegyzet.AI meeting átírási és intelligencia platformot 
        (a "Szolgáltatás"). Ez az Adatvédelmi Tájékoztató elmagyarázza, hogyan gyűjtjük, használjuk, osztjuk meg és védjük 
        az Ön információit a Szolgáltatásunk használata során.
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">Adatkezelő:</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Cég: HangJegyzet.AI Kft.</li>
          <li>Cím: [Az Ön magyar címe]</li>
          <li>Email: privacy@hangjegyzet.ai</li>
          <li>Adatvédelmi tisztviselő: [DPO neve] (dpo@hangjegyzet.ai)</li>
        </ul>
      </div>

      <h2>2. Milyen Információkat Gyűjtünk</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-blue-600" />
            Személyes Információk
          </h3>
          <ul className="text-sm space-y-1">
            <li>• Név és email cím</li>
            <li>• Szervezeti adatok</li>
            <li>• Profil információk</li>
            <li>• Fizetési információk</li>
          </ul>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-2 flex items-center">
            <Database className="w-5 h-5 mr-2 text-green-600" />
            Meeting Adatok
          </h3>
          <ul className="text-sm space-y-1">
            <li>• Hang/videó felvételek</li>
            <li>• Átiratok</li>
            <li>• AI-generált betekintések</li>
            <li>• Meeting metaadatok</li>
          </ul>
        </Card>
      </div>

      <h3>2.1 Az Ön által megadott személyes információk</h3>
      <ul>
        <li><strong>Fiók információk:</strong> Név, email cím, jelszó (hash-elve), szervezet neve</li>
        <li><strong>Profil információk:</strong> Beosztás, részleg, profilkép (opcionális)</li>
        <li><strong>Fizetési információk:</strong> Fizetési szolgáltatóink által feldolgozva (Stripe, SimplePay, Billingo)</li>
        <li><strong>Kommunikációs adatok:</strong> Support jegyek, visszajelzések, levelezés</li>
      </ul>

      <h3>2.2 Meeting adatok</h3>
      <ul>
        <li><strong>Hang/videó fájlok:</strong> Meeting felvételek (max. 500MB fájlonként)</li>
        <li><strong>Átiratok:</strong> AI szolgáltatásokkal hangból átalakított szöveg</li>
        <li><strong>Meeting metaadatok:</strong> Cím, dátum, időtartam, résztvevők, beszédidő eloszlás</li>
        <li><strong>AI által generált betekintések:</strong> Teendők, kulcsdöntések, hangulat elemzés, összefoglalók</li>
      </ul>

      <h3>2.3 Automatikusan gyűjtött információk</h3>
      <ul>
        <li><strong>Használati adatok:</strong> Használt funkciók, gyakoriság, interakciós minták</li>
        <li><strong>Technikai adatok:</strong> IP cím, böngésző típus, eszköz információ, hozzáférési idők</li>
        <li><strong>Teljesítmény adatok:</strong> Hibanaplók, rendszer diagnosztika</li>
      </ul>

      <h2>3. Hogyan Használjuk az Információkat</h2>

      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Elsődleges Célok:</h3>
        <ul className="space-y-2">
          <li>✓ Meeting felvételek feldolgozása és átírása</li>
          <li>✓ AI-alapú betekintések és teendők generálása</li>
          <li>✓ Analitika és riportolási funkciók biztosítása</li>
          <li>✓ Együttműködési és megosztási funkciók engedélyezése</li>
          <li>✓ Szolgáltatásaink fejlesztése és új funkciók kialakítása</li>
        </ul>
      </div>

      <h2>4. AI Feldolgozás</h2>

      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Fontos:</strong> A hangfelvételeit AI szolgáltatások dolgozzák fel átírások és betekintések létrehozásához. 
          Szerződéses garanciáink vannak arra, hogy az AI szolgáltatók nem tanítják az Ön adataival a modelljeiket.
        </AlertDescription>
      </Alert>

      <h3>4.1 AI szolgáltatók</h3>
      <ul>
        <li><strong>OpenAI (GPT-4):</strong> Szövegelemzéshez és betekintésekhez</li>
        <li><strong>Anthropic (Claude):</strong> Fejlett nyelvi feldolgozáshoz</li>
        <li><strong>Deepgram:</strong> Beszéd-szöveg átíráshoz</li>
        <li><strong>OpenAI Whisper:</strong> Többnyelvű átíráshoz</li>
      </ul>

      <h3>4.2 AI adatmegőrzés</h3>
      <ul>
        <li>Az AI szolgáltatásoknak küldött hangfájlok 24 órán belül törlődnek</li>
        <li>Az átírási eredmények az Ön preferenciái szerint őrződnek meg</li>
        <li>Az AI szolgáltatók nem őrzik meg az Ön tartalmát modell tanításhoz</li>
      </ul>

      <h2>5. Adatmegosztás és Közzététel</h2>

      <h3>5.1 Szolgáltatók (Al-feldolgozók)</h3>
      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Szolgáltató</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Cél</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Helyszín</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Supabase</td>
            <td className="border border-gray-300 px-4 py-2">Adatbázis és hitelesítés</td>
            <td className="border border-gray-300 px-4 py-2">EU/US</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Hetzner</td>
            <td className="border border-gray-300 px-4 py-2">Infrastruktúra</td>
            <td className="border border-gray-300 px-4 py-2">Németország</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">OpenAI</td>
            <td className="border border-gray-300 px-4 py-2">AI feldolgozás</td>
            <td className="border border-gray-300 px-4 py-2">Egyesült Államok</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Deepgram</td>
            <td className="border border-gray-300 px-4 py-2">Átírás</td>
            <td className="border border-gray-300 px-4 py-2">Egyesült Államok</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Adatmegőrzés</h2>

      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Adat típus</th>
              <th className="text-left py-2">Alapértelmezett megőrzés</th>
              <th className="text-left py-2">Felhasználói kontroll</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Fiók információk</td>
              <td className="py-2">Időtartam + 30 nap</td>
              <td className="py-2">Bármikor törölhető</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Meeting felvételek</td>
              <td className="py-2">24 óra</td>
              <td className="py-2">Opcionális hosszabbítás</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Átiratok</td>
              <td className="py-2">90 nap</td>
              <td className="py-2">30-365 nap</td>
            </tr>
            <tr>
              <td className="py-2">AI betekintések</td>
              <td className="py-2">1 év</td>
              <td className="py-2">Export/törlés</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>7. Az Ön Jogai (GDPR)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4 bg-green-50">
          <h3 className="font-semibold mb-2">Hozzáférés és Kontroll</h3>
          <ul className="text-sm space-y-1">
            <li>✓ Személyes adatai másolatának kérése</li>
            <li>✓ Pontatlan információk kijavítása</li>
            <li>✓ Adatai törlése ("elfeledtetéshez való jog")</li>
            <li>✓ Feldolgozás korlátozása</li>
          </ul>
        </Card>
        
        <Card className="p-4 bg-blue-50">
          <h3 className="font-semibold mb-2">Hordozhatóság és Tiltakozás</h3>
          <ul className="text-sm space-y-1">
            <li>✓ Adatok exportálása géppel olvasható formátumban</li>
            <li>✓ Átvitel másik szolgáltatáshoz</li>
            <li>✓ Tiltakozás a feldolgozás ellen</li>
            <li>✓ Hozzájárulás bármikori visszavonása</li>
          </ul>
        </Card>
      </div>

      <h3>Hogyan gyakorolhatja jogait</h3>
      <ul>
        <li><strong>Email:</strong> privacy@hangjegyzet.ai</li>
        <li><strong>Alkalmazásban:</strong> Beállítások → Adatvédelem → Az Ön jogai</li>
        <li><strong>Válaszidő:</strong> 30 napon belül</li>
      </ul>

      <h2>8. Adatbiztonság</h2>

      <div className="flex items-start space-x-3 bg-gray-50 p-4 rounded-lg my-4">
        <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold mb-2">Biztonsági Intézkedések</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>Titkosítás:</strong> AES-256 nyugalmi adatokhoz, TLS 1.3 átvitel közben</li>
            <li>• <strong>Hozzáférés-szabályozás:</strong> Szerepkör-alapú engedélyek, többfaktoros hitelesítés</li>
            <li>• <strong>Infrastruktúra:</strong> Izolált környezetek, rendszeres biztonsági frissítések</li>
            <li>• <strong>Monitoring:</strong> 24/7 biztonsági megfigyelés, behatolás észlelés</li>
          </ul>
        </div>
      </div>

      <h2>9. Nemzetközi Adattovábbítások</h2>
      <p>
        Az adatai Magyarországon kívüli országokba is továbbíthatók. Megfelelő biztosítékokat garantálunk:
      </p>
      <ul>
        <li>EU-US Adatvédelmi Keretrendszer US-alapú feldolgozókhoz</li>
        <li>Általános Szerződési Feltételek egyéb továbbításokhoz</li>
        <li>Minden továbbítás TLS 1.3 titkosítással történik</li>
      </ul>

      <h2>10. Gyermekek Adatvédelme</h2>
      <p>
        Szolgáltatásunk nem 16 év alatti felhasználóknak szól. Tudatosan nem gyűjtünk információt gyermekektől.
      </p>

      <h2>11. Kapcsolat</h2>
      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <p className="font-semibold mb-2">Adatvédelemmel kapcsolatos kérdésekkel:</p>
        <ul className="list-none space-y-1">
          <li>Email: privacy@hangjegyzet.ai</li>
          <li>DPO: dpo@hangjegyzet.ai</li>
          <li>Cím: [Az Ön magyar címe]</li>
        </ul>
      </div>

      <h2>12. Felügyeleti Hatóság</h2>
      <p>
        Jogában áll panaszt benyújtani a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH):
      </p>
      <ul>
        <li>Weboldal: <a href="https://www.naih.hu/" className="text-blue-600 hover:underline">https://www.naih.hu/</a></li>
        <li>Cím: 1055 Budapest, Falk Miksa utca 9-11</li>
        <li>Telefon: +36-1-391-1400</li>
        <li>Email: ugyfelszolgalat@naih.hu</li>
      </ul>
    </div>
  )
}