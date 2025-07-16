'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { Cookie, Globe, Settings, Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

// export const metadata: Metadata = {
//   title: 'Cookie Policy - HangJegyzet.AI',
//   description: 'Cookie Policy and Süti Szabályzat - Learn about how HangJegyzet.AI uses cookies.',
// }

export default function CookiePolicyPage() {
  const [language, setLanguage] = useState<'en' | 'hu'>('hu')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-6">
            <Cookie className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {language === 'en' ? 'Cookie Policy' : 'Süti Szabályzat'}
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

      {/* Quick Settings */}
      <section className="pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-amber-50 border-amber-200">
            <Settings className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {language === 'en' 
                ? 'You can manage your cookie preferences at any time in Settings → Privacy → Cookie Preferences.'
                : 'Süti preferenciáit bármikor kezelheti a Beállítások → Adatvédelem → Süti Preferenciák menüben.'}
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8">
            {language === 'en' ? (
              <EnglishCookiePolicy />
            ) : (
              <HungarianCookiePolicy />
            )}
          </Card>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">
              {language === 'en' 
                ? 'Learn more about our privacy practices' 
                : 'Tudjon meg többet adatvédelmi gyakorlatunkról'}
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild>
                <Link href="/settings/privacy">
                  {language === 'en' ? 'Manage Cookies' : 'Sütik Kezelése'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/privacy">
                  {language === 'en' ? 'Privacy Policy' : 'Adatvédelmi Tájékoztató'}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/terms">
                  {language === 'en' ? 'Terms of Service' : 'Szolgáltatási Feltételek'}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EnglishCookiePolicy() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. Introduction</h2>
      <p>
        HangJegyzet.AI ("we," "our," or "us") uses cookies and similar tracking technologies on our website and application. 
        This Cookie Policy explains what these technologies are, why we use them, and your rights to control their use.
      </p>

      <h2>2. What Are Cookies?</h2>
      <p>
        Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. 
        They help the website remember information about your visit, making your next visit easier and the site more useful to you.
      </p>

      <h2>3. Types of Cookies We Use</h2>

      <Tabs defaultValue="essential" className="my-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="essential">Essential</TabsTrigger>
          <TabsTrigger value="functional">Functional</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="essential">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-600" />
              Essential Cookies (Always Active)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              These cookies are necessary for the Service to function and cannot be disabled.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cookie Name</th>
                  <th className="text-left py-2">Purpose</th>
                  <th className="text-left py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>auth-token</code></td>
                  <td className="py-2">User authentication</td>
                  <td className="py-2">Session</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>sb-access-token</code></td>
                  <td className="py-2">Supabase authentication</td>
                  <td className="py-2">7 days</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>csrf-token</code></td>
                  <td className="py-2">Security - prevents CSRF attacks</td>
                  <td className="py-2">Session</td>
                </tr>
                <tr>
                  <td className="py-2"><code>user-preferences</code></td>
                  <td className="py-2">Language, theme settings</td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="functional">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-600" />
              Functional Cookies (Optional)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              These enhance functionality and personalization.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cookie Name</th>
                  <th className="text-left py-2">Purpose</th>
                  <th className="text-left py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>locale</code></td>
                  <td className="py-2">Language preference</td>
                  <td className="py-2">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>timezone</code></td>
                  <td className="py-2">User timezone</td>
                  <td className="py-2">1 year</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>sidebar-state</code></td>
                  <td className="py-2">UI preferences</td>
                  <td className="py-2">30 days</td>
                </tr>
                <tr>
                  <td className="py-2"><code>playback-speed</code></td>
                  <td className="py-2">Audio playback preference</td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Info className="w-5 h-5 mr-2 text-purple-600" />
              Analytics Cookies (Optional)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Help us understand how visitors interact with our Service.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cookie Name</th>
                  <th className="text-left py-2">Purpose</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Provider</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>_ga</code></td>
                  <td className="py-2">Unique visitors</td>
                  <td className="py-2">2 years</td>
                  <td className="py-2">Google</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>_gid</code></td>
                  <td className="py-2">Session tracking</td>
                  <td className="py-2">24 hours</td>
                  <td className="py-2">Google</td>
                </tr>
                <tr>
                  <td className="py-2"><code>mp_*</code></td>
                  <td className="py-2">Product analytics</td>
                  <td className="py-2">1 year</td>
                  <td className="py-2">Mixpanel</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Cookie className="w-5 h-5 mr-2 text-orange-600" />
              Performance Cookies (Optional)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Monitor Service performance and user experience.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Cookie Name</th>
                  <th className="text-left py-2">Purpose</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Provider</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>_dd_s</code></td>
                  <td className="py-2">Performance monitoring</td>
                  <td className="py-2">4 hours</td>
                  <td className="py-2">Datadog</td>
                </tr>
                <tr>
                  <td className="py-2"><code>ajs_user_id</code></td>
                  <td className="py-2">Analytics routing</td>
                  <td className="py-2">1 year</td>
                  <td className="py-2">Segment</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>4. Third-Party Cookies</h2>
      <p>When you use integrations, third parties may set their own cookies:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Authentication Providers</h3>
          <ul className="text-sm space-y-1">
            <li>• Google OAuth - For Google Drive/Calendar</li>
            <li>• Microsoft OAuth - For Teams/Outlook</li>
            <li>• Zoom OAuth - For Zoom meetings</li>
          </ul>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Payment Providers</h3>
          <ul className="text-sm space-y-1">
            <li>• Stripe - Payment processing</li>
            <li>• SimplePay - Hungarian payments</li>
            <li>• Billingo - Invoice generation</li>
          </ul>
        </Card>
      </div>

      <h2>5. How We Use Cookies</h2>
      <ul>
        <li><strong>Authenticate users</strong> and maintain secure sessions</li>
        <li><strong>Remember preferences</strong> like language and theme</li>
        <li><strong>Analyze usage</strong> to improve our Service</li>
        <li><strong>Monitor performance</strong> and fix issues</li>
        <li><strong>Enable features</strong> like auto-save and real-time sync</li>
        <li><strong>Prevent fraud</strong> and enhance security</li>
      </ul>

      <h2>6. Cookie Control and Settings</h2>

      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Browser Controls</h3>
        <p className="text-sm mb-2">Most browsers allow you to:</p>
        <ul className="text-sm space-y-1">
          <li>• View what cookies are stored</li>
          <li>• Delete cookies individually or entirely</li>
          <li>• Block third-party cookies</li>
          <li>• Block all cookies (note: this will impact functionality)</li>
        </ul>
      </div>

      <div className="bg-green-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Our Cookie Settings</h3>
        <p className="text-sm mb-2">Access cookie preferences at: <strong>Settings → Privacy → Cookie Preferences</strong></p>
        <p className="text-sm">You can:</p>
        <ul className="text-sm space-y-1">
          <li>• Accept or reject optional cookie categories</li>
          <li>• View detailed information about each cookie</li>
          <li>• Update your preferences at any time</li>
        </ul>
      </div>

      <h2>7. Impact of Refusing Cookies</h2>
      
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          If you refuse essential cookies, the Service will not function properly. Refusing optional cookies may reduce personalization but won't affect core functionality.
        </AlertDescription>
      </Alert>

      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Cookie Type</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Impact if Refused</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Essential</td>
            <td className="border border-gray-300 px-4 py-2">Service will not function</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Functional</td>
            <td className="border border-gray-300 px-4 py-2">Need to re-enter preferences</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Analytics</td>
            <td className="border border-gray-300 px-4 py-2">No impact on functionality</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Performance</td>
            <td className="border border-gray-300 px-4 py-2">May not detect issues affecting you</td>
          </tr>
        </tbody>
      </table>

      <h2>8. Cookie-Free Alternatives</h2>
      <p>For users who prefer not to use cookies:</p>
      <ul>
        <li><strong>API Access:</strong> Use our API with token authentication</li>
        <li><strong>Private Browsing:</strong> Use incognito/private mode</li>
        <li><strong>Local Storage:</strong> Some preferences can use local storage instead</li>
      </ul>

      <h2>9. Updates to This Policy</h2>
      <p>
        We may update this Cookie Policy to reflect new cookies, technologies, or regulatory changes. 
        Check the "Last updated" date for the latest version.
      </p>

      <h2>10. Technical Implementation</h2>
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Cookie Attributes</h3>
        <pre className="text-xs overflow-x-auto">
{`// Essential Cookie Example
{
  name: 'auth-token',
  value: 'encrypted_token_value',
  domain: '.hangjegyzet.ai',
  path: '/',
  expires: 'Session',
  secure: true,
  httpOnly: true,
  sameSite: 'Strict'
}`}
        </pre>
      </div>

      <h2>11. Contact Us</h2>
      <p>For questions about our use of cookies:</p>
      <ul>
        <li><strong>Email:</strong> privacy@hangjegyzet.ai</li>
        <li><strong>Cookie Settings:</strong> In-app settings panel</li>
        <li><strong>Data Protection Officer:</strong> dpo@hangjegyzet.ai</li>
      </ul>
    </div>
  )
}

function HungarianCookiePolicy() {
  return (
    <div className="prose prose-gray max-w-none">
      <h2>1. Bevezetés</h2>
      <p>
        A HangJegyzet.AI ("mi", "miénk" vagy "minket") sütiket és hasonló követési technológiákat használ weboldalán és alkalmazásában. 
        Ez a Süti Szabályzat elmagyarázza, mik ezek a technológiák, miért használjuk őket, és milyen jogai vannak a használatuk szabályozásában.
      </p>

      <h2>2. Mik azok a Sütik?</h2>
      <p>
        A sütik kis szöveges fájlok, amelyek az Ön eszközén (számítógép, táblagép vagy mobil) tárolódnak, amikor meglátogat egy weboldalt. 
        Segítenek a weboldalnak emlékezni a látogatásával kapcsolatos információkra, megkönnyítve a következő látogatást és hasznosabbá téve az oldalt.
      </p>

      <h2>3. Milyen Sütiket Használunk</h2>

      <Tabs defaultValue="essential" className="my-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="essential">Alapvető</TabsTrigger>
          <TabsTrigger value="functional">Funkcionális</TabsTrigger>
          <TabsTrigger value="analytics">Analitikai</TabsTrigger>
          <TabsTrigger value="performance">Teljesítmény</TabsTrigger>
        </TabsList>

        <TabsContent value="essential">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-600" />
              Alapvető Sütik (Mindig Aktív)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Ezek a sütik szükségesek a Szolgáltatás működéséhez és nem tilthatók le.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Süti Neve</th>
                  <th className="text-left py-2">Cél</th>
                  <th className="text-left py-2">Időtartam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>auth-token</code></td>
                  <td className="py-2">Felhasználó hitelesítés</td>
                  <td className="py-2">Munkamenet</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>sb-access-token</code></td>
                  <td className="py-2">Supabase hitelesítés</td>
                  <td className="py-2">7 nap</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>csrf-token</code></td>
                  <td className="py-2">Biztonság - CSRF támadások megelőzése</td>
                  <td className="py-2">Munkamenet</td>
                </tr>
                <tr>
                  <td className="py-2"><code>user-preferences</code></td>
                  <td className="py-2">Nyelv, téma beállítások</td>
                  <td className="py-2">1 év</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="functional">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-600" />
              Funkcionális Sütik (Opcionális)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Ezek javítják a funkcionalitást és személyre szabást.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Süti Neve</th>
                  <th className="text-left py-2">Cél</th>
                  <th className="text-left py-2">Időtartam</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>locale</code></td>
                  <td className="py-2">Nyelvi preferencia</td>
                  <td className="py-2">1 év</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>timezone</code></td>
                  <td className="py-2">Felhasználói időzóna</td>
                  <td className="py-2">1 év</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>sidebar-state</code></td>
                  <td className="py-2">UI preferenciák</td>
                  <td className="py-2">30 nap</td>
                </tr>
                <tr>
                  <td className="py-2"><code>playback-speed</code></td>
                  <td className="py-2">Hang lejátszási preferencia</td>
                  <td className="py-2">1 év</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Info className="w-5 h-5 mr-2 text-purple-600" />
              Analitikai Sütik (Opcionális)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Segítenek megérteni, hogyan lépnek kapcsolatba a látogatók a Szolgáltatással.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Süti Neve</th>
                  <th className="text-left py-2">Cél</th>
                  <th className="text-left py-2">Időtartam</th>
                  <th className="text-left py-2">Szolgáltató</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>_ga</code></td>
                  <td className="py-2">Egyedi látogatók</td>
                  <td className="py-2">2 év</td>
                  <td className="py-2">Google</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2"><code>_gid</code></td>
                  <td className="py-2">Munkamenet követés</td>
                  <td className="py-2">24 óra</td>
                  <td className="py-2">Google</td>
                </tr>
                <tr>
                  <td className="py-2"><code>mp_*</code></td>
                  <td className="py-2">Termék analitika</td>
                  <td className="py-2">1 év</td>
                  <td className="py-2">Mixpanel</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="p-4">
            <h3 className="font-semibold mb-2 flex items-center">
              <Cookie className="w-5 h-5 mr-2 text-orange-600" />
              Teljesítmény Sütik (Opcionális)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              A Szolgáltatás teljesítményét és felhasználói élményt figyelik.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Süti Neve</th>
                  <th className="text-left py-2">Cél</th>
                  <th className="text-left py-2">Időtartam</th>
                  <th className="text-left py-2">Szolgáltató</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2"><code>_dd_s</code></td>
                  <td className="py-2">Teljesítmény figyelés</td>
                  <td className="py-2">4 óra</td>
                  <td className="py-2">Datadog</td>
                </tr>
                <tr>
                  <td className="py-2"><code>ajs_user_id</code></td>
                  <td className="py-2">Analitika útválasztás</td>
                  <td className="py-2">1 év</td>
                  <td className="py-2">Segment</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <h2>4. Harmadik Fél Sütik</h2>
      <p>Amikor integrációkat használ, harmadik felek saját sütiket állíthatnak be:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Hitelesítési Szolgáltatók</h3>
          <ul className="text-sm space-y-1">
            <li>• Google OAuth - Google Drive/Calendar</li>
            <li>• Microsoft OAuth - Teams/Outlook</li>
            <li>• Zoom OAuth - Zoom meetingek</li>
          </ul>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Fizetési Szolgáltatók</h3>
          <ul className="text-sm space-y-1">
            <li>• Stripe - Fizetés feldolgozás</li>
            <li>• SimplePay - Magyar fizetések</li>
            <li>• Billingo - Számla generálás</li>
          </ul>
        </Card>
      </div>

      <h2>5. Hogyan Használjuk a Sütiket</h2>
      <ul>
        <li><strong>Felhasználók hitelesítésére</strong> és biztonságos munkamenetek fenntartására</li>
        <li><strong>Preferenciák megjegyzésére</strong> mint nyelv és téma</li>
        <li><strong>Használat elemzésére</strong> a Szolgáltatás fejlesztéséhez</li>
        <li><strong>Teljesítmény figyelésére</strong> és hibák javítására</li>
        <li><strong>Funkciók engedélyezésére</strong> mint automatikus mentés és valós idejű szinkronizálás</li>
        <li><strong>Csalás megelőzésére</strong> és biztonság növelésére</li>
      </ul>

      <h2>6. Süti Vezérlés és Beállítások</h2>

      <div className="bg-blue-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Böngésző Vezérlők</h3>
        <p className="text-sm mb-2">A legtöbb böngésző lehetővé teszi:</p>
        <ul className="text-sm space-y-1">
          <li>• Megtekinteni milyen sütik vannak tárolva</li>
          <li>• Sütik egyenkénti vagy teljes törlése</li>
          <li>• Harmadik fél sütik blokkolása</li>
          <li>• Minden süti blokkolása (megjegyzés: ez hatással lesz a funkcionalitásra)</li>
        </ul>
      </div>

      <div className="bg-green-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Süti Beállításaink</h3>
        <p className="text-sm mb-2">Süti preferenciák elérése: <strong>Beállítások → Adatvédelem → Süti Preferenciák</strong></p>
        <p className="text-sm">Lehetőségei:</p>
        <ul className="text-sm space-y-1">
          <li>• Opcionális süti kategóriák elfogadása vagy elutasítása</li>
          <li>• Részletes információ megtekintése minden sütiről</li>
          <li>• Preferenciák bármikori frissítése</li>
        </ul>
      </div>

      <h2>7. A Sütik Elutasításának Hatása</h2>
      
      <Alert className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ha elutasítja az alapvető sütiket, a Szolgáltatás nem fog megfelelően működni. Az opcionális sütik elutasítása csökkentheti a személyre szabást, de nem befolyásolja az alapfunkciókat.
        </AlertDescription>
      </Alert>

      <table className="w-full border-collapse border border-gray-300 my-4">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-300 px-4 py-2 text-left">Süti Típus</th>
            <th className="border border-gray-300 px-4 py-2 text-left">Hatás Elutasítás Esetén</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Alapvető</td>
            <td className="border border-gray-300 px-4 py-2">A Szolgáltatás nem fog működni</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Funkcionális</td>
            <td className="border border-gray-300 px-4 py-2">Preferenciák újbóli megadása szükséges</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Analitikai</td>
            <td className="border border-gray-300 px-4 py-2">Nincs hatás a funkcionalitásra</td>
          </tr>
          <tr>
            <td className="border border-gray-300 px-4 py-2">Teljesítmény</td>
            <td className="border border-gray-300 px-4 py-2">Lehet, hogy nem észleljük az Önt érintő problémákat</td>
          </tr>
        </tbody>
      </table>

      <h2>8. Süti-mentes Alternatívák</h2>
      <p>Azoknak a felhasználóknak, akik nem szeretnének sütiket használni:</p>
      <ul>
        <li><strong>API Hozzáférés:</strong> Használja API-nkat token hitelesítéssel</li>
        <li><strong>Privát Böngészés:</strong> Használjon inkognitó/privát módot</li>
        <li><strong>Helyi Tárolás:</strong> Néhány preferencia helyi tárolást használhat helyette</li>
      </ul>

      <h2>9. A Szabályzat Frissítései</h2>
      <p>
        Frissíthetjük ezt a Süti Szabályzatot új sütik, technológiák vagy szabályozási változások tükrözésére. 
        Ellenőrizze az "Utolsó frissítés" dátumot a legújabb verzióért.
      </p>

      <h2>10. Technikai Megvalósítás</h2>
      <div className="bg-gray-50 p-4 rounded-lg my-4">
        <h3 className="font-semibold mb-2">Süti Attribútumok</h3>
        <pre className="text-xs overflow-x-auto">
{`// Alapvető Süti Példa
{
  name: 'auth-token',
  value: 'titkosított_token_érték',
  domain: '.hangjegyzet.ai',
  path: '/',
  expires: 'Munkamenet',
  secure: true,
  httpOnly: true,
  sameSite: 'Strict'
}`}
        </pre>
      </div>

      <h2>11. Kapcsolat</h2>
      <p>Kérdések a sütik használatával kapcsolatban:</p>
      <ul>
        <li><strong>Email:</strong> privacy@hangjegyzet.ai</li>
        <li><strong>Süti Beállítások:</strong> Alkalmazáson belüli beállítások panel</li>
        <li><strong>Adatvédelmi Tisztviselő:</strong> dpo@hangjegyzet.ai</li>
      </ul>
    </div>
  )
}