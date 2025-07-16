'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mic, 
  Brain, 
  Users, 
  Shield, 
  Zap, 
  Globe,
  FileText,
  BarChart3,
  Lock,
  Cloud,
  Sparkles,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Layers,
  Workflow,
  Search,
  Calendar,
  Share2,
  Download,
  MessageSquare,
  Palette,
  Smartphone,
  Code,
  HeadphonesIcon,
  TrendingUp
} from 'lucide-react'

const feature_categories = [
  {
    id: 'transcription',
    name: 'Transzkripció',
    icon: Mic,
    description: 'Professzionális hangfelvétel átirat'
  },
  {
    id: 'ai',
    name: 'AI funkciók',
    icon: Brain,
    description: 'Intelligens elemzés és összefoglalók'
  },
  {
    id: 'collaboration',
    name: 'Együttműködés',
    icon: Users,
    description: 'Csapatmunka és megosztás'
  },
  {
    id: 'integration',
    name: 'Integrációk',
    icon: Workflow,
    description: 'Kapcsolódás más eszközökhöz'
  },
  {
    id: 'security',
    name: 'Biztonság',
    icon: Shield,
    description: 'Adatvédelem és megfelelőség'
  }
]

const all_features = {
  transcription: [
    {
      title: 'Automatikus transzkripció',
      description: 'Valós idejű hangfelvétel átirat 95%+ pontossággal',
      icon: Mic,
      details: [
        'Magyar nyelv teljes támogatása',
        'Többnyelvű transzkripció (30+ nyelv)',
        'Automatikus beszélő felismerés',
        'Időbélyegek minden mondathoz'
      ]
    },
    {
      title: 'Élő transzkripció',
      description: 'Valós idejű átirat meetingek során',
      icon: Zap,
      details: [
        'Alacsony késleltetés (< 2 másodperc)',
        'Folyamatos javítás és pontosítás',
        'Résztvevők automatikus azonosítása',
        'Élő megosztás link által'
      ]
    },
    {
      title: 'Hangfájl feldolgozás',
      description: 'Többféle formátum támogatása',
      icon: FileText,
      details: [
        'MP3, WAV, M4A, MP4 formátumok',
        'Akár 500MB fájlméret',
        'Batch feldolgozás több fájlhoz',
        'Automatikus zajszűrés'
      ]
    }
  ],
  ai: [
    {
      title: 'Intelligens összefoglalók',
      description: 'AI által generált meeting összefoglalók',
      icon: Sparkles,
      details: [
        'Kulcspontok automatikus kiemelése',
        'Akciópontok azonosítása',
        'Döntések összegzése',
        'Testreszabható sablonok'
      ]
    },
    {
      title: 'Sentiment elemzés',
      description: 'Érzelmi tónus és hangulat elemzése',
      icon: TrendingUp,
      details: [
        'Beszélők hangulatának követése',
        'Meeting dinamika vizualizáció',
        'Konfliktus észlelés',
        'Pozitív/negatív momentumok'
      ]
    },
    {
      title: 'Témák és címkék',
      description: 'Automatikus téma felismerés és címkézés',
      icon: Layers,
      details: [
        'Intelligens téma csoportosítás',
        'Automatikus címke javaslatok',
        'Egyedi címke rendszer',
        'Kereshetőség javítása'
      ]
    }
  ],
  collaboration: [
    {
      title: 'Csapat megosztás',
      description: 'Egyszerű együttműködés csapattagokkal',
      icon: Users,
      details: [
        'Jogosultság kezelés (néző/szerkesztő)',
        'Valós idejű együttműködés',
        'Megjegyzések és annotációk',
        'Verziókövetés'
      ]
    },
    {
      title: 'Külső megosztás',
      description: 'Biztonságos megosztás külső felekkel',
      icon: Share2,
      details: [
        'Jelszóvédett linkek',
        'Lejárati idő beállítása',
        'Letöltés korlátozás',
        'Megtekintési statisztikák'
      ]
    },
    {
      title: 'Kommentek és visszajelzés',
      description: 'Strukturált visszajelzési rendszer',
      icon: MessageSquare,
      details: [
        'Időbélyeghez kötött kommentek',
        'Említések és értesítések',
        'Feladat hozzárendelés',
        'Megoldott/nyitott státusz'
      ]
    }
  ],
  integration: [
    {
      title: 'Naptár integráció',
      description: 'Automatikus meeting import',
      icon: Calendar,
      details: [
        'Google Calendar szinkron',
        'Outlook integráció',
        'Automatikus résztvevő lista',
        'Meeting előkészítés'
      ]
    },
    {
      title: 'CRM kapcsolat',
      description: 'Ügyfél adatok összekapcsolása',
      icon: Workflow,
      details: [
        'Salesforce integráció',
        'HubSpot kapcsolat',
        'Automatikus contact linking',
        'Deal és opportunity követés'
      ]
    },
    {
      title: 'Kommunikációs eszközök',
      description: 'Chat és video platform kapcsolatok',
      icon: Globe,
      details: [
        'Slack értesítések',
        'Teams integráció',
        'Zoom felvétel import',
        'Discord webhook'
      ]
    }
  ],
  security: [
    {
      title: 'Titkosítás',
      description: 'Végponttól végpontig terjedő védelem',
      icon: Lock,
      details: [
        'AES-256 titkosítás',
        'TLS 1.3 átvitel',
        'Titkosított tárolás',
        'Zero-knowledge architektúra'
      ]
    },
    {
      title: 'GDPR megfelelőség',
      description: 'Európai adatvédelmi szabványok',
      icon: Shield,
      details: [
        'Teljes GDPR compliance',
        'Adatexport lehetőség',
        'Törlési jog biztosítása',
        'Adatfeldolgozási megállapodás'
      ]
    },
    {
      title: 'Hozzáférés kontroll',
      description: 'Részletes jogosultságkezelés',
      icon: Users,
      details: [
        'Kétfaktoros azonosítás',
        'SSO támogatás',
        'IP korlátozások',
        'Audit log minden műveletről'
      ]
    }
  ]
}

const pricing_features = [
  { name: 'Transzkripció óra/hó', starter: '10 óra', pro: '50 óra', enterprise: 'Korlátlan' },
  { name: 'AI összefoglalók', starter: true, pro: true, enterprise: true },
  { name: 'Csapattagok', starter: '3', pro: '10', enterprise: 'Korlátlan' },
  { name: 'Integráció', starter: 'Alap', pro: 'Bővített', enterprise: 'Teljes' },
  { name: 'Támogatás', starter: 'Email', pro: 'Prioritás', enterprise: 'Dedikált' },
  { name: 'API hozzáférés', starter: false, pro: true, enterprise: true },
  { name: 'Egyedi branding', starter: false, pro: false, enterprise: true }
]

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = useState('transcription')
  const [showVideo, setShowVideo] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4 bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <Badge className="mb-4 bg-green-500 text-white">
            Minden amire szüksége van
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Hatékony funkciók a <span className="text-green-300">produktív</span> meetingekért
          </h1>
          <p className="text-xl text-green-100 max-w-3xl mx-auto mb-8">
            Fedezze fel a HangJegyzet.AI összes funkcióját, amely segít időt spórolni 
            és értékes betekintéseket nyerni minden megbeszélésből.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Ingyenes próba
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-transparent text-white border-white hover:bg-white hover:text-green-700"
              onClick={() => setShowVideo(true)}
            >
              <Play className="w-4 h-4 mr-2" />
              Demó videó
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Funkciók kategóriánként
            </h2>
            <p className="text-lg text-gray-600">
              Válasszon egy kategóriát a részletes funkciók megtekintéséhez
            </p>
          </div>

          {/* Category Tabs */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto mb-8">
              {feature_categories.map((category) => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-green-50 data-[state=active]:text-green-700"
                >
                  <category.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{category.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Feature Details */}
            {feature_categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
                  <p className="text-gray-600">{category.description}</p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-6">
                  {all_features[category.id as keyof typeof all_features]?.map((feature, index) => (
                    <Card key={index} className="hover:shadow-lg transition-all hover:-translate-y-1">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-green-100 rounded-lg">
                            <feature.icon className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                            <CardDescription>{feature.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feature.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              További képességek
            </h2>
            <p className="text-lg text-gray-600">
              Még több funkció a tökéletes meeting élményhez
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: Search, title: 'Intelligens keresés', desc: 'Keresés szövegben és metaadatokban' },
              { icon: Download, title: 'Export opciók', desc: 'PDF, DOCX, TXT, SRT formátumok' },
              { icon: Palette, title: 'Testreszabás', desc: 'Saját brand és sablonok' },
              { icon: Smartphone, title: 'Mobil app', desc: 'iOS és Android támogatás' },
              { icon: Code, title: 'API hozzáférés', desc: 'Programozható integráció' },
              { icon: HeadphonesIcon, title: '24/7 support', desc: 'Folyamatos ügyfélszolgálat' },
              { icon: Cloud, title: 'Cloud backup', desc: 'Automatikus mentések' },
              { icon: BarChart3, title: 'Analytics', desc: 'Részletes statisztikák' }
            ].map((item, index) => (
              <Card key={index} className="text-center p-6">
                <item.icon className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h4 className="font-semibold mb-1">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Csomag összehasonlítás
            </h2>
            <p className="text-lg text-gray-600">
              Válassza ki az Önnek megfelelő csomagot
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4">Funkció</th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold">Starter</div>
                    <div className="text-sm text-gray-500">9.900 Ft/hó</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold">Pro</div>
                    <div className="text-sm text-gray-500">29.900 Ft/hó</div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="font-semibold">Enterprise</div>
                    <div className="text-sm text-gray-500">Egyedi</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricing_features.map((feature, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-4 font-medium">{feature.name}</td>
                    <td className="text-center py-4 px-4">
                      {typeof feature.starter === 'boolean' ? (
                        feature.starter ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">–</span>
                        )
                      ) : (
                        <span className="text-sm">{feature.starter}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof feature.pro === 'boolean' ? (
                        feature.pro ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">–</span>
                        )
                      ) : (
                        <span className="text-sm">{feature.pro}</span>
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof feature.enterprise === 'boolean' ? (
                        feature.enterprise ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-gray-300">–</span>
                        )
                      ) : (
                        <span className="text-sm">{feature.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/pricing">
                Részletes árazás
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                Egyedi ajánlat kérése
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Készen áll a hatékonyabb meetingekre?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Próbálja ki a HangJegyzet.AI-t ingyen és tapasztalja meg a különbséget
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                Ingyenes regisztráció
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-transparent text-white border-white hover:bg-white hover:text-green-700"
              asChild
            >
              <Link href="/demo">
                Demo időpont foglalás
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}