'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { FileText, Globe, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

// export const metadata: Metadata = {
//   title: 'Terms of Service - HangJegyzet.AI',
//   description: 'Terms of Service and Szolgáltatási Feltételek for HangJegyzet.AI meeting transcription service.',
// }

export default function TermsPage() {
  const [language, setLanguage] = useState<'en' | 'hu'>('hu')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'en' ? 'Terms of Service' : 'Szolgáltatási Feltételek'}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {language === 'en' ? 'Effective Date: January 8, 2025' : 'Hatálybalépés: 2025. január 8.'}
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

      {/* Content */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            {language === 'en' ? (
              <EnglishTerms />
            ) : (
              <HungarianTerms />
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">
              {language === 'en' 
                ? 'By using our service, you agree to these terms.' 
                : 'Szolgáltatásunk használatával elfogadja ezeket a feltételeket.'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link href="/privacy">
                  {language === 'en' ? 'Privacy Policy' : 'Adatvédelmi Tájékoztató'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/cookie-policy">
                  {language === 'en' ? 'Cookie Policy' : 'Süti Szabályzat'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">
                  {language === 'en' ? 'Contact Us' : 'Kapcsolat'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EnglishTerms() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing or using HangJegyzet.AI (the "Service"), you agree to be bound by these Terms of Service ("Terms"). 
        If you disagree with any part of these terms, you may not access the Service.
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">Service Provider:</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Company: HangJegyzet.AI Kft.</li>
          <li>Registration: [Hungarian Company Registration Number]</li>
          <li>VAT Number: [Hungarian VAT Number]</li>
          <li>Address: [Your Hungarian Address]</li>
          <li>Email: legal@hangjegyzet.ai</li>
        </ul>
      </div>

      <h2>2. Description of Service</h2>
      <p>HangJegyzet.AI is a meeting intelligence platform that provides:</p>
      <ul>
        <li>Audio and video meeting transcription</li>
        <li>AI-powered analysis and insights</li>
        <li>Action item extraction</li>
        <li>Meeting analytics and reporting</li>
        <li>Team collaboration features</li>
        <li>Integration with third-party services</li>
      </ul>

      <h2>3. Account Registration</h2>
      
      <h3>3.1 Eligibility</h3>
      <ul>
        <li>You must be at least 16 years old</li>
        <li>You must provide accurate and complete information</li>
        <li>You must have the legal authority to bind your organization</li>
      </ul>

      <h3>3.2 Account Security</h3>
      <ul>
        <li>You are responsible for maintaining account confidentiality</li>
        <li>You must notify us immediately of any unauthorized access</li>
        <li>We are not liable for losses due to compromised credentials</li>
      </ul>

      <h3>3.3 Organization Accounts</h3>
      <ul>
        <li>Organization administrators can manage user access</li>
        <li>Organizations are responsible for their users' actions</li>
        <li>Administrators can view usage and analytics for all users</li>
      </ul>

      <h2>4. Acceptable Use Policy</h2>

      <h3>4.1 Permitted Use</h3>
      <p>You may use the Service only for:</p>
      <ul>
        <li>Legitimate business purposes</li>
        <li>Personal productivity (on applicable plans)</li>
        <li>Lawful meeting recording and transcription</li>
        <li>Internal collaboration and knowledge management</li>
      </ul>

      <h3>4.2 Prohibited Use</h3>
      <p>You may NOT:</p>
      <ul>
        <li>Upload illegal, harmful, or offensive content</li>
        <li>Violate any laws or regulations</li>
        <li>Infringe on intellectual property rights</li>
        <li>Record meetings without proper consent</li>
        <li>Attempt to reverse engineer the Service</li>
        <li>Use the Service for surveillance or monitoring without consent</li>
        <li>Exceed the following limits:
          <ul>
            <li>File size: 500MB per upload</li>
            <li>API calls: Based on your plan</li>
            <li>Storage: Based on your plan</li>
          </ul>
        </li>
      </ul>

      <h2>5. Subscription Plans and Pricing</h2>

      <h3>5.1 Available Plans</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Starter (€49/month)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Up to 10 meetings/month</li>
            <li>Basic transcription</li>
            <li>30-day retention</li>
            <li>Email support</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Professional (€199/month)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Up to 50 meetings/month</li>
            <li>Advanced AI features</li>
            <li>90-day retention</li>
            <li>Priority support</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Business (€499/month)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Up to 200 meetings/month</li>
            <li>All AI features</li>
            <li>1-year retention</li>
            <li>Dedicated support</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Enterprise (€7,900/month)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Unlimited meetings</li>
            <li>Custom retention</li>
            <li>SLA guarantee</li>
            <li>White-glove support</li>
            <li>Custom integrations</li>
          </ul>
        </div>
      </div>

      <h3>5.2 Payment Terms</h3>
      <ul>
        <li>Payments are due monthly or annually in advance</li>
        <li>Prices are in EUR and exclude VAT</li>
        <li>We accept credit cards, bank transfers, and Hungarian payment methods</li>
        <li>Late payments may result in service suspension</li>
      </ul>

      <h2>6. Service Level Agreement (Enterprise Plan)</h2>
      
      <h3>6.1 Availability</h3>
      <ul>
        <li>99.9% uptime guarantee (excluding scheduled maintenance)</li>
        <li>Planned maintenance with 72-hour notice</li>
        <li>Service credits for downtime exceeding SLA</li>
      </ul>

      <h3>6.2 Support Response Times</h3>
      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Priority</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Response Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Critical issues</td>
            <td className="border border-gray-300 px-4 py-2">2 hours</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">High priority</td>
            <td className="border border-gray-300 px-4 py-2">4 hours</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Normal priority</td>
            <td className="border border-gray-300 px-4 py-2">24 hours</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Low priority</td>
            <td className="border border-gray-300 px-4 py-2">48 hours</td>
          </tr>
        </tbody>
      </table>

      <h2>7. Intellectual Property Rights</h2>

      <h3>7.1 Your Content</h3>
      <ul>
        <li>You retain all rights to your uploaded content</li>
        <li>You grant us a license to process and analyze your content</li>
        <li>This license is limited to providing the Service</li>
        <li>You can delete your content at any time</li>
      </ul>

      <h3>7.2 Our Service</h3>
      <ul>
        <li>We own all rights to the Service and its features</li>
        <li>You may not copy, modify, or create derivative works</li>
        <li>Our AI models and algorithms are proprietary</li>
        <li>Feedback and suggestions become our property</li>
      </ul>

      <h2>8. Data Protection and Privacy</h2>
      <p>
        We process data according to our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link> and 
        comply with GDPR and Hungarian data protection laws.
      </p>

      <h2>9. Limitation of Liability</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
        <p className="font-semibold uppercase">
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, 
          WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
        </p>
      </div>

      <h2>10. Termination</h2>
      <ul>
        <li>Monthly plans: Cancel anytime, effective at end of billing period</li>
        <li>Annual plans: Cancel at renewal</li>
        <li>We may terminate for violations, non-payment, or illegal activities</li>
        <li>Export your data before termination</li>
      </ul>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of Hungary. Disputes will be resolved through negotiation, 
        mediation, or arbitration in Budapest.
      </p>

      <h2>12. Contact Information</h2>
      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">HangJegyzet.AI Kft.</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Address: [Your Hungarian Address]</li>
          <li>Email: support@hangjegyzet.ai</li>
          <li>Phone: [Your Phone Number]</li>
          <li>Business Hours: Monday-Friday, 9:00-17:00 CET</li>
        </ul>
      </div>
    </div>
  )
}

function HungarianTerms() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. A Feltételek Elfogadása</h2>
      <p>
        A HangJegyzet.AI (a "Szolgáltatás") elérésével vagy használatával Ön elfogadja ezen Szolgáltatási Feltételek ("Feltételek") kötelező érvényét. 
        Ha nem ért egyet a feltételek bármely részével, nem használhatja a Szolgáltatást.
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">Szolgáltató:</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Cég: HangJegyzet.AI Kft.</li>
          <li>Cégjegyzékszám: [Magyar Cégjegyzékszám]</li>
          <li>Adószám: [Magyar Adószám]</li>
          <li>Cím: [Az Ön magyar címe]</li>
          <li>Email: legal@hangjegyzet.ai</li>
        </ul>
      </div>

      <h2>2. A Szolgáltatás Leírása</h2>
      <p>A HangJegyzet.AI egy meeting intelligencia platform, amely biztosítja:</p>
      <ul>
        <li>Hang és videó meeting átírást</li>
        <li>AI-alapú elemzést és betekintéseket</li>
        <li>Teendők kinyerését</li>
        <li>Meeting analitikát és riportolást</li>
        <li>Csapat együttműködési funkciókat</li>
        <li>Harmadik fél szolgáltatásokkal való integrációt</li>
      </ul>

      <h2>3. Fiók Regisztráció</h2>
      
      <h3>3.1 Jogosultság</h3>
      <ul>
        <li>Legalább 16 évesnek kell lennie</li>
        <li>Pontos és teljes információkat kell megadnia</li>
        <li>Rendelkeznie kell a jogi felhatalmazással szervezete kötelezésére</li>
      </ul>

      <h3>3.2 Fiók Biztonság</h3>
      <ul>
        <li>Ön felelős a fiók bizalmasságának megőrzéséért</li>
        <li>Azonnal értesítenie kell minket jogosulatlan hozzáférésről</li>
        <li>Nem vagyunk felelősek a kompromittált hitelesítő adatok miatti veszteségekért</li>
      </ul>

      <h3>3.3 Szervezeti Fiókok</h3>
      <ul>
        <li>A szervezeti adminisztrátorok kezelhetik a felhasználói hozzáférést</li>
        <li>A szervezetek felelősek felhasználóik tevékenységéért</li>
        <li>Az adminisztrátorok megtekinthetik az összes felhasználó használati adatait és analitikáját</li>
      </ul>

      <h2>4. Elfogadható Használati Szabályzat</h2>

      <h3>4.1 Engedélyezett Használat</h3>
      <p>A Szolgáltatást csak a következőkre használhatja:</p>
      <ul>
        <li>Jogszerű üzleti célok</li>
        <li>Személyes produktivitás (megfelelő csomagokon)</li>
        <li>Törvényes meeting felvétel és átírás</li>
        <li>Belső együttműködés és tudásmenedzsment</li>
      </ul>

      <h3>4.2 Tiltott Használat</h3>
      <p>NEM szabad:</p>
      <ul>
        <li>Illegális, káros vagy sértő tartalmat feltölteni</li>
        <li>Törvényeket vagy szabályozásokat megsérteni</li>
        <li>Szellemi tulajdonjogokat megsérteni</li>
        <li>Meetingeket megfelelő hozzájárulás nélkül rögzíteni</li>
        <li>A Szolgáltatást visszafejteni</li>
        <li>A Szolgáltatást felügyelethez vagy megfigyeléshez használni hozzájárulás nélkül</li>
        <li>Túllépni a következő korlátokat:
          <ul>
            <li>Fájlméret: 500MB feltöltésenként</li>
            <li>API hívások: A csomagja alapján</li>
            <li>Tárhely: A csomagja alapján</li>
          </ul>
        </li>
      </ul>

      <h2>5. Előfizetési Csomagok és Árazás</h2>

      <h3>5.1 Elérhető Csomagok</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Kezdő (€49/hó)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Max. 10 meeting/hó</li>
            <li>Alap átírás</li>
            <li>30 napos megőrzés</li>
            <li>Email támogatás</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Professzionális (€199/hó)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Max. 50 meeting/hó</li>
            <li>Fejlett AI funkciók</li>
            <li>90 napos megőrzés</li>
            <li>Prioritás támogatás</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Üzleti (€499/hó)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Max. 200 meeting/hó</li>
            <li>Minden AI funkció</li>
            <li>1 éves megőrzés</li>
            <li>Dedikált támogatás</li>
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h4 className="font-bold">Vállalati (€7.900/hó)</h4>
          <ul className="text-sm space-y-1 mt-2">
            <li>Korlátlan meeting</li>
            <li>Egyéni megőrzés</li>
            <li>SLA garancia</li>
            <li>Prémium támogatás</li>
            <li>Egyéni integrációk</li>
          </ul>
        </div>
      </div>

      <h3>5.2 Fizetési Feltételek</h3>
      <ul>
        <li>A fizetések havonta vagy évente előre esedékesek</li>
        <li>Az árak EUR-ban értendők és nem tartalmazzák az ÁFA-t</li>
        <li>Elfogadunk bankkártyát, banki átutalást és magyar fizetési módokat</li>
        <li>Késedelmes fizetés a szolgáltatás felfüggesztését eredményezheti</li>
      </ul>

      <h2>6. Szolgáltatási Szint Megállapodás (Vállalati Csomag)</h2>
      
      <h3>6.1 Elérhetőség</h3>
      <ul>
        <li>99,9% üzemidő garancia (tervezett karbantartás kivételével)</li>
        <li>Tervezett karbantartás 72 órás értesítéssel</li>
        <li>Szolgáltatási jóváírás az SLA-t meghaladó leállásért</li>
      </ul>

      <h3>6.2 Támogatási Válaszidők</h3>
      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Prioritás</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Válaszidő</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Kritikus problémák</td>
            <td className="border border-gray-300 px-4 py-2">2 óra</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Magas prioritás</td>
            <td className="border border-gray-300 px-4 py-2">4 óra</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Normál prioritás</td>
            <td className="border border-gray-300 px-4 py-2">24 óra</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Alacsony prioritás</td>
            <td className="border border-gray-300 px-4 py-2">48 óra</td>
          </tr>
        </tbody>
      </table>

      <h2>7. Szellemi Tulajdonjogok</h2>

      <h3>7.1 Az Ön Tartalma</h3>
      <ul>
        <li>Ön megtartja minden jogot a feltöltött tartalomhoz</li>
        <li>Engedélyt ad nekünk a tartalom feldolgozására és elemzésére</li>
        <li>Ez az engedély a Szolgáltatás nyújtására korlátozódik</li>
        <li>Bármikor törölheti a tartalmát</li>
      </ul>

      <h3>7.2 A Mi Szolgáltatásunk</h3>
      <ul>
        <li>Mi birtokoljuk a Szolgáltatás és funkcióinak minden jogát</li>
        <li>Nem másolhatja, módosíthatja vagy készíthet származékos műveket</li>
        <li>AI modelljeink és algoritmusaink védettek</li>
        <li>A visszajelzések és javaslatok a mi tulajdonunkká válnak</li>
      </ul>

      <h2>8. Adatvédelem és Magánélet</h2>
      <p>
        Az adatokat az <Link href="/privacy" className="text-blue-600 hover:underline">Adatvédelmi Szabályzatunk</Link> szerint 
        dolgozzuk fel és megfelelünk a GDPR-nak és a magyar adatvédelmi törvényeknek.
      </p>

      <h2>9. Felelősség Korlátozása</h2>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
        <p className="font-semibold uppercase">
          A SZOLGÁLTATÁS "AHOGY VAN" ALAPON KERÜL BIZTOSÍTÁSRA, MINDENFÉLE GARANCIA NÉLKÜL. A TÖRVÉNY ÁLTAL MEGENGEDETT 
          LEGNAGYOBB MÉRTÉKBEN NEM VAGYUNK FELELŐSEK KÖZVETETT, VÉLETLEN VAGY KÖVETKEZMÉNYES KÁROKÉRT.
        </p>
      </div>

      <h2>10. Megszüntetés</h2>
      <ul>
        <li>Havi csomagok: Bármikor lemondható, a számlázási időszak végén lép életbe</li>
        <li>Éves csomagok: Megújításkor mondható le</li>
        <li>Megszüntethetjük szabálysértés, nem fizetés vagy illegális tevékenységek miatt</li>
        <li>Exportálja adatait a megszüntetés előtt</li>
      </ul>

      <h2>11. Irányadó Jog</h2>
      <p>
        Ezekre a Feltételekre Magyarország jogszabályai vonatkoznak. A vitákat tárgyalás, közvetítés vagy 
        választottbíróság útján oldjuk meg Budapesten.
      </p>

      <h2>12. Kapcsolat</h2>
      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="text-lg font-semibold">HangJegyzet.AI Kft.</h3>
        <ul className="list-none space-y-1 mt-2">
          <li>Cím: [Az Ön magyar címe]</li>
          <li>Email: support@hangjegyzet.ai</li>
          <li>Telefon: [Az Ön telefonszáma]</li>
          <li>Üzleti órák: Hétfő-Péntek, 9:00-17:00 CET</li>
        </ul>
      </div>
    </div>
  )
}