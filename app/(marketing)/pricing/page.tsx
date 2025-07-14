import { Metadata } from 'next'
import { Check, X, Zap, Scale, Target, Sparkles, Building2, Shield, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { SUBSCRIPTION_PLANS, formatPrice, calculateYearlyPrice } from '@/lib/payments/subscription-plans'

export const metadata: Metadata = {
  title: 'Árazás - HangJegyzet.AI | Magyar Meeting Transcription Platform',
  description: 'Válasszon 97%+ pontosságú AI-alapú meeting átírási csomagjaink közül. Starter €49-tól Enterprise megoldásokig. 14 napos ingyenes próba.',
  keywords: 'meeting átírás árak, hangjegyzet árazás, transzkripció költség, AI átírás díjak, magyar beszédfelismerés ár',
  openGraph: {
    title: 'HangJegyzet.AI Árazás - Meeting Intelligence Platform',
    description: 'AI-alapú meeting átírás és elemzés. Starter, Professional, Business és Enterprise csomagok.',
    images: ['/pricing-og.png'],
  },
}

const PLAN_ICONS = {
  starter: Sparkles,
  professional: Zap,
  business: Building2,
  enterprise: Rocket,
}

const ALL_FEATURES = [
  { 
    category: 'Alapfunkciók',
    features: [
      { name: 'Meeting átírás', starter: true, professional: true, business: true, enterprise: true },
      { name: 'AI összefoglaló', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Teendők kinyerése', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Export (PDF, Word)', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Mobil alkalmazás', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Magyar nyelv', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Angol nyelv', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Többnyelvű (10+ nyelv)', starter: false, professional: false, business: true, enterprise: true },
    ]
  },
  {
    category: 'AI & Intelligencia',
    features: [
      { name: 'Sentiment analysis', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Speaker insights', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Follow-up email generálás', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Meeting analytics', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Egyéni AI modellek', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Domain-specifikus szótár', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Executive insights', starter: false, professional: false, business: false, enterprise: true },
    ]
  },
  {
    category: 'Integrációk',
    features: [
      { name: 'Google Drive', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Dropbox', starter: true, professional: true, business: true, enterprise: true },
      { name: 'Zoom', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Microsoft Teams', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Slack', starter: false, professional: true, business: true, enterprise: true },
      { name: 'Calendar sync', starter: false, professional: true, business: true, enterprise: true },
      { name: 'API hozzáférés', starter: false, professional: '1000/hó', business: 'Korlátlan', enterprise: 'Korlátlan' },
      { name: 'Webhook támogatás', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Egyéni integrációk', starter: false, professional: false, business: true, enterprise: true },
    ]
  },
  {
    category: 'Biztonság & Compliance',
    features: [
      { name: 'SSL titkosítás', starter: true, professional: true, business: true, enterprise: true },
      { name: '2FA hitelesítés', starter: true, professional: true, business: true, enterprise: true },
      { name: 'GDPR megfelelőség', starter: true, professional: true, business: true, enterprise: true },
      { name: 'SSO (SAML/OAuth)', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Audit logs', starter: false, professional: false, business: true, enterprise: true },
      { name: 'IP korlátozások', starter: false, professional: false, business: true, enterprise: true },
      { name: 'On-premise telepítés', starter: false, professional: false, business: 'Opcionális', enterprise: true },
      { name: 'HIPAA compliance', starter: false, professional: false, business: false, enterprise: true },
      { name: 'Dedikált infrastruktúra', starter: false, professional: false, business: false, enterprise: true },
    ]
  },
  {
    category: 'Támogatás & SLA',
    features: [
      { name: 'Email támogatás', starter: '48 óra', professional: '24 óra', business: '4 óra', enterprise: '1 óra' },
      { name: 'Telefonos támogatás', starter: false, professional: false, business: 'Munkaidőben', enterprise: '24/7' },
      { name: 'Dedikált account manager', starter: false, professional: false, business: true, enterprise: true },
      { name: 'Onboarding támogatás', starter: 'Önkiszolgáló', professional: 'Email', business: 'Video call', enterprise: 'On-site' },
      { name: 'SLA garancia', starter: false, professional: false, business: '99.9%', enterprise: '99.99%' },
      { name: 'Prioritás roadmap befolyás', starter: false, professional: false, business: false, enterprise: true },
    ]
  }
]

export default function PricingPage() {
  const eurPlans = ['starter', 'professional', 'business', 'enterprise']
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* SEO-friendly Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <Badge variant="default" className="bg-green-600">
              Hamarosan indul
            </Badge>
            <Badge variant="secondary">
              14 napos ingyenes próba • Nincs bankkártya
            </Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Árazás minden <span className="text-blue-600 underline decoration-wavy decoration-2 underline-offset-4">méretű csapat</span> számára
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            AI-alapú meeting transcription 97%+ pontossággal. Válasszon rugalmas csomagjaink közül, 
            vagy kérjen egyedi ajánlatot nagyvállalati igényekre.
          </p>
          
          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>GDPR megfelelő</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>ISO 27001 folyamatban</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Magyar szerverek</span>
            </div>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-4 px-4">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-fit mx-auto grid-cols-2">
              <TabsTrigger value="monthly">Havi fizetés</TabsTrigger>
              <TabsTrigger value="yearly">
                Éves fizetés
                <Badge className="ml-2" variant="secondary">-20%</Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="monthly" className="mt-8">
              <PricingCards plans={eurPlans} yearly={false} />
            </TabsContent>
            
            <TabsContent value="yearly" className="mt-8">
              <PricingCards plans={eurPlans} yearly={true} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Részletes <span className="text-blue-600">összehasonlítás</span>
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Minden csomag tartalmazza az alapfunkciókat. A magasabb csomagok 
            progresszíven több funkciót tartalmaznak.
          </p>
          
          <FeatureComparisonTable />
        </div>
      </section>

      {/* Legitimate Social Proof */}
      <section className="py-16 px-4 bg-blue-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">97%+</div>
              <div className="text-gray-700 font-medium">Átírási pontosság</div>
              <div className="text-sm text-gray-600 mt-1">Precision módban</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">3x</div>
              <div className="text-gray-700 font-medium">Gyorsabb jegyzetelés</div>
              <div className="text-sm text-gray-600 mt-1">Kézi íráshoz képest</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10+</div>
              <div className="text-gray-700 font-medium">Támogatott nyelv</div>
              <div className="text-sm text-gray-600 mt-1">Magyar fókusszal</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">GDPR</div>
              <div className="text-gray-700 font-medium">Teljes megfelelőség</div>
              <div className="text-sm text-gray-600 mt-1">EU szerverek</div>
            </div>
          </div>
        </div>
      </section>

      {/* Mode Explanation */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Három átírási mód <span className="text-blue-600">az Ön igényeire</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <ModeCard
              icon={Zap}
              name="Fast Mode"
              accuracy="90-93%"
              speed="Valós idő"
              color="green"
              description="Gyors átírás tiszta hangfelvételekhez"
              features={[
                'Azonnali eredmények',
                'Költséghatékony',
                'Informális meetingekhez ideális',
                'Jó minőségű hanganyagokhoz'
              ]}
            />
            
            <ModeCard
              icon={Scale}
              name="Balanced Mode"
              accuracy="94-96%"
              speed="2-3 perc"
              color="blue"
              description="Optimális egyensúly pontosság és sebesség között"
              features={[
                'AI hangjavítás',
                'Szókészlet optimalizálás',
                'Üzleti meetingekhez',
                'Legjobb ár-érték arány'
              ]}
              popular
            />
            
            <ModeCard
              icon={Target}
              name="Precision Mode"
              accuracy="97%+"
              speed="5-8 perc"
              color="orange"
              description="Maximális pontosság kritikus tartalmakhoz"
              features={[
                'Multi-pass feldolgozás',
                'Szaknyelvi pontosság',
                'Jogi/orvosi átírásokhoz',
                'Részletes AI utófeldolgozás'
              ]}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Gyakran Ismételt <span className="text-blue-600">Kérdések</span>
          </h2>
          
          <div className="space-y-8">
            <FAQItem
              question="Hogyan működik a 14 napos ingyenes próba?"
              answer="Regisztráció után azonnal hozzáférhet a Professional csomag minden funkciójához 14 napig. Nem kérünk bankkártya adatokat, és bármikor lemondhatja. A próbaidő végén választhat csomagot, vagy ingyenes korlátozott hozzáférést kap."
            />
            
            <FAQItem
              question="Átválthatok csomagok között?"
              answer="Igen, bármikor válthat magasabb csomagra, és a különbözetet időarányosan számoljuk. Alacsonyabb csomagra váltás a következő számlázási ciklusban lép életbe."
            />
            
            <FAQItem
              question="Mi történik, ha túllépem a havi keretemet?"
              answer="Értesítjük, amikor 80%-on van, és felajánljuk a csomag váltást. Túllépés esetén választhat: magasabb csomagra vált, vagy extra perceket vásárol (€0.50/perc), vagy vár a következő hónapig."
            />
            
            <FAQItem
              question="Van API hozzáférés?"
              answer="Igen, a Professional csomagtól kezdve. Professional: 1,000 hívás/hó, Business és Enterprise: korlátlan. Részletes API dokumentáció elérhető a developer portálon."
            />
            
            <FAQItem
              question="Milyen fizetési módok érhetők el?"
              answer="Bankkártya (Visa, Mastercard, Amex), banki átutalás (éves fizeésnél), SEPA direct debit, és magyar vállalkozásoknak SimplePay vagy Billingo integráció."
            />
            
            <FAQItem
              question="Van kedvezmény oktatási intézményeknek?"
              answer="Igen! Oktatási intézmények és non-profit szervezetek 30% kedvezményt kapnak minden csomagból. Vegye fel velünk a kapcsolatot az edu@hangjegyzet.ai címen."
            />
          </div>
        </div>
      </section>

      {/* Use Cases - Legal Social Proof */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Kik használják a <span className="text-blue-600">HangJegyzet.AI-t?</span>
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12 max-w-3xl mx-auto">
            Tervezve magyar vállalkozások és szervezetek igényeire
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Building2 className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>Vállalati csapatok</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Tökéletes napi stand-upok, projekt meetingek és stratégiai megbeszélések rögzítésére.
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Automatikus teendő kiosztás</li>
                  <li>• Csapat produktivitás metrikák</li>
                  <li>• Integráció meglévő eszközökkel</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Shield className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>Jogi és pénzügyi szektor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Precíz dokumentáció készítése teljes GDPR megfelelőséggel és biztonsággal.
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• 97%+ pontosság Precision módban</li>
                  <li>• Titkosított tárolás és átvitel</li>
                  <li>• Audit trail minden műveletről</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Sparkles className="w-12 h-12 text-blue-600 mb-4" />
                <CardTitle>Startupok és ügynökségek</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Gyors tempójú csapatok számára, akik értékelik az időt és a hatékonyságot.
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Azonnali meeting összefoglalók</li>
                  <li>• Ügyfél megbeszélések dokumentálása</li>
                  <li>• Rugalmas árképzés növekedéshez</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl mb-2">Egyedi nagyvállalati igények?</CardTitle>
              <CardDescription className="text-blue-100 text-lg">
                Több mint 500 felhasználó vagy speciális követelmények? 
                Készítünk egyedi ajánlatot.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-8">
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h4 className="font-semibold mb-2">Dedikált infrastruktúra</h4>
                  <p className="text-sm text-blue-100">Saját szerverek, garantált erőforrások</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Egyedi AI modellek</h4>
                  <p className="text-sm text-blue-100">Az Ön adataival betanított modellek</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">White-label megoldás</h4>
                  <p className="text-sm text-blue-100">Saját branding és domain</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/contact-sales">
                    Értékesítés kapcsolat
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                  <Link href="/enterprise">
                    Enterprise részletek
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Kezdje el még ma a <span className="text-blue-600">meetingek átalakítását</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Modern AI-alapú meeting intelligencia platform magyar vállalkozások számára
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button size="lg" asChild>
              <Link href="/register">
                Ingyenes próba indítása
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">
                Demo megtekintése
              </Link>
            </Button>
          </div>
          
          <p className="text-sm text-gray-500">
            Nem szükséges bankkártya • 14 nap ingyenes • Bármikor lemondható
          </p>
        </div>
      </section>
    </div>
  )
}

// Component definitions
function PricingCards({ plans, yearly }: { plans: string[], yearly: boolean }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {plans.map((planId) => {
        const plan = SUBSCRIPTION_PLANS[planId]
        if (!plan) return null
        
        const Icon = PLAN_ICONS[planId as keyof typeof PLAN_ICONS] || Sparkles
        const price = yearly ? calculateYearlyPrice(plan.price) : plan.price
        const isPopular = plan.popular
        const isEnterprise = planId === 'enterprise'
        
        return (
          <Card 
            key={planId} 
            className={`relative flex flex-col ${
              isPopular ? 'border-blue-600 shadow-xl scale-105 lg:scale-110' : ''
            } ${isEnterprise ? 'border-purple-600' : ''}`}
          >
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Legnépszerűbb
              </Badge>
            )}
            
            {isEnterprise && (
              <div className="absolute -top-3 -right-3">
                <Rocket className="w-8 h-8 text-purple-600" />
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isEnterprise ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                  <Icon className={`w-5 h-5 ${isEnterprise ? 'text-purple-600' : 'text-blue-600'}`} />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
              </div>
              
              <div className="mb-2">
                <span className="text-4xl font-bold">
                  {formatPrice(price, plan.currency)}
                </span>
                <span className="text-gray-600 ml-2">
                  /{yearly ? 'év' : 'hó'}
                </span>
              </div>
              
              {yearly && (
                <p className="text-sm text-green-600">
                  Spóroljon {formatPrice(plan.price * 12 - price, plan.currency)}-t évente
                </p>
              )}
              
              <CardDescription className="mt-2">
                {plan.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1">
              {/* Minutes allocation */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Havi keret:</h4>
                <div className="space-y-2">
                  <ModeAllocation 
                    mode="Fast" 
                    minutes={plan.limits.modeAllocation.fast} 
                    icon={Zap}
                    color="text-green-600"
                  />
                  <ModeAllocation 
                    mode="Balanced" 
                    minutes={plan.limits.modeAllocation.balanced} 
                    icon={Scale}
                    color="text-blue-600"
                  />
                  <ModeAllocation 
                    mode="Precision" 
                    minutes={plan.limits.modeAllocation.precision} 
                    icon={Target}
                    color="text-orange-600"
                  />
                </div>
              </div>
              
              {/* Key features */}
              <ul className="space-y-3">
                {plan.features.slice(0, 8).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      feature.startsWith('✅') ? 'text-blue-600' : 'text-green-600'
                    }`} />
                    <span className={feature.startsWith('✅') ? 'font-semibold' : ''}>
                      {feature.replace('✅ ', '')}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter className="pt-6">
              <Button 
                className="w-full" 
                variant={isPopular ? 'default' : isEnterprise ? 'default' : 'outline'}
                size="lg"
                asChild
              >
                <Link href={isEnterprise ? '/contact-sales' : '/register'}>
                  {isEnterprise ? 'Egyedi ajánlat' : 'Választom'}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}

function ModeAllocation({ mode, minutes, icon: Icon, color }: { 
  mode: string, 
  minutes: number, 
  icon: any,
  color: string 
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span>{mode}</span>
      </div>
      <span className="font-semibold">
        {minutes === -1 ? 'Korlátlan' : minutes === 0 ? '-' : `${minutes} perc`}
      </span>
    </div>
  )
}

function ModeCard({ 
  icon: Icon, 
  name, 
  accuracy, 
  speed, 
  color, 
  description, 
  features, 
  popular 
}: any) {
  const colors = {
    green: 'text-green-600 bg-green-50 border-green-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
  }
  
  return (
    <Card className={`relative ${popular ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Recommended
        </Badge>
      )}
      
      <CardHeader className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${colors[color].split(' ').slice(1).join(' ')}`}>
          <Icon className={`w-8 h-8 ${colors[color].split(' ')[0]}`} />
        </div>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{accuracy}</p>
            <p className="text-xs text-gray-600">pontosság</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{speed}</p>
            <p className="text-xs text-gray-600">sebesség</p>
          </div>
        </div>
        
        <ul className="space-y-2">
          {features.map((feature: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className={`w-4 h-4 mt-0.5 ${colors[color].split(' ')[0]}`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function FeatureComparisonTable() {
  const plans = ['starter', 'professional', 'business', 'enterprise']
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded-lg overflow-hidden shadow-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left p-4 font-semibold text-gray-900 min-w-[200px]">Funkciók</th>
            {plans.map(plan => (
              <th key={plan} className="text-center p-4 font-semibold text-gray-900 min-w-[150px]">
                {SUBSCRIPTION_PLANS[plan]?.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_FEATURES.map((category, categoryIdx) => (
            <>
              <tr key={`category-${categoryIdx}`} className="bg-gray-50">
                <td colSpan={5} className="p-4 font-semibold text-gray-900">
                  {category.category}
                </td>
              </tr>
              {category.features.map((feature, featureIdx) => (
                <tr key={`feature-${categoryIdx}-${featureIdx}`} className="border-b hover:bg-gray-50">
                  <td className="p-4 text-gray-700">{feature.name}</td>
                  {plans.map(plan => {
                    const value = feature[plan as keyof typeof feature]
                    return (
                      <td key={plan} className="p-4 text-center">
                        {typeof value === 'boolean' ? (
                          value ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{value}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold mb-2">{question}</h3>
      <p className="text-gray-600">{answer}</p>
    </div>
  )
}