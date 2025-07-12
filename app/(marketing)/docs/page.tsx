import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Code, 
  Zap, 
  Users, 
  Shield, 
  HelpCircle,
  FileText,
  Settings,
  PlayCircle,
  ChevronRight
} from 'lucide-react'

const docCategories = [
  {
    title: 'Első lépések',
    description: 'Kezdje el használni a HangJegyzet.AI-t perceken belül',
    icon: PlayCircle,
    color: 'bg-blue-100 text-blue-600',
    links: [
      { title: 'Gyors kezdés', href: '/docs/getting-started' },
      { title: 'Első meeting feltöltése', href: '/docs/first-upload' },
      { title: 'Felhasználói felület', href: '/docs/user-interface' },
      { title: 'Billentyűparancsok', href: '/docs/keyboard-shortcuts' }
    ]
  },
  {
    title: 'Funkciók',
    description: 'Fedezze fel a platform összes képességét',
    icon: Zap,
    color: 'bg-purple-100 text-purple-600',
    links: [
      { title: 'Átírási módok', href: '/docs/transcription-modes' },
      { title: 'AI összefoglalók', href: '/docs/ai-summaries' },
      { title: 'Beszélő azonosítás', href: '/docs/speaker-identification' },
      { title: 'Valós idejű átírás', href: '/docs/real-time' }
    ]
  },
  {
    title: 'Integrációk',
    description: 'Csatlakoztassa kedvenc eszközeit',
    icon: Settings,
    color: 'bg-green-100 text-green-600',
    links: [
      { title: 'Zoom integráció', href: '/docs/integrations/zoom' },
      { title: 'Google Meet', href: '/docs/integrations/google-meet' },
      { title: 'Microsoft Teams', href: '/docs/integrations/teams' },
      { title: 'Slack értesítések', href: '/docs/integrations/slack' }
    ]
  },
  {
    title: 'API Fejlesztőknek',
    description: 'Építsen a HangJegyzet.AI API-ra',
    icon: Code,
    color: 'bg-orange-100 text-orange-600',
    links: [
      { title: 'API dokumentáció', href: '/docs/api' },
      { title: 'Authentikáció', href: '/docs/api/authentication' },
      { title: 'Webhooks', href: '/docs/api/webhooks' },
      { title: 'SDK-k', href: '/docs/api/sdks' }
    ]
  },
  {
    title: 'Csapat és együttműködés',
    description: 'Dolgozzon együtt csapatával',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600',
    links: [
      { title: 'Csapattagok meghívása', href: '/docs/team/invites' },
      { title: 'Szerepkörök és jogosultságok', href: '/docs/team/roles' },
      { title: 'Megosztás és export', href: '/docs/team/sharing' },
      { title: 'Kommentek és annotációk', href: '/docs/team/comments' }
    ]
  },
  {
    title: 'Biztonság és megfelelőség',
    description: 'Adatbiztonsági információk',
    icon: Shield,
    color: 'bg-red-100 text-red-600',
    links: [
      { title: 'Biztonsági áttekintés', href: '/docs/security/overview' },
      { title: 'GDPR megfelelőség', href: '/docs/security/gdpr' },
      { title: 'Titkosítás', href: '/docs/security/encryption' },
      { title: 'Adatmegőrzés', href: '/docs/security/retention' }
    ]
  }
]

const popularArticles = [
  {
    title: 'Hogyan töltök fel egy meeting felvételt?',
    category: 'Első lépések',
    readTime: '2 perc'
  },
  {
    title: 'Mi a különbség az átírási módok között?',
    category: 'Funkciók',
    readTime: '3 perc'
  },
  {
    title: 'Hogyan integráljam a Zoom-ot?',
    category: 'Integrációk',
    readTime: '5 perc'
  },
  {
    title: 'API kulcs generálása',
    category: 'API',
    readTime: '2 perc'
  }
]

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Dokumentáció
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Minden, amit tudnia kell a HangJegyzet.AI használatáról. 
              Útmutatók, oktatóanyagok és API referencia.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-2xl mx-auto mt-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Keresés a dokumentációban..."
                className="w-full px-4 py-3 pl-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/docs/getting-started">
                <PlayCircle className="w-4 h-4 mr-2" />
                Gyors kezdés
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/docs/api">
                <Code className="w-4 h-4 mr-2" />
                API Referencia
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/faq">
                <HelpCircle className="w-4 h-4 mr-2" />
                GYIK
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/changelog">
                <FileText className="w-4 h-4 mr-2" />
                Változások
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Documentation Categories */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Kategóriák szerint</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.title} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center mb-4`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle>{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-2 group"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Articles */}
      <section className="pb-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto py-12">
          <h2 className="text-2xl font-bold mb-8">Népszerű cikkek</h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold mb-1">{article.title}</h3>
                      <p className="text-sm text-gray-600">
                        {article.category} • {article.readTime} olvasás
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Help CTA */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">További segítségre van szüksége?</h2>
              <p className="text-gray-600 mb-6">
                Csapatunk készséggel áll rendelkezésére munkanapokon 9-17 óra között.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/contact">Kapcsolatfelvétel</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="mailto:support@hangjegyzet.ai">support@hangjegyzet.ai</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}