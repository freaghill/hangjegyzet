'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  FileText, 
  Video, 
  MessageSquare, 
  BookOpen, 
  Users, 
  HeadphonesIcon,
  Mail,
  ExternalLink,
  ChevronRight,
  Zap,
  Shield,
  Clock,
  CheckCircle
} from 'lucide-react'

const help_categories = [
  {
    id: 'getting-started',
    title: 'Kezdeti lépések',
    description: 'Ismerje meg a HangJegyzet.AI alapjait',
    icon: Zap,
    articles: [
      { title: 'Regisztráció és bejelentkezés', time: '2 perc' },
      { title: 'Első meeting létrehozása', time: '5 perc' },
      { title: 'Hangfájl feltöltése és transzkripció', time: '3 perc' },
      { title: 'Dashboard navigáció', time: '4 perc' },
      { title: 'Profil beállítások', time: '3 perc' }
    ]
  },
  {
    id: 'features',
    title: 'Funkciók',
    description: 'Fedezze fel az összes lehetőséget',
    icon: BookOpen,
    articles: [
      { title: 'Automatikus transzkripció használata', time: '6 perc' },
      { title: 'AI összefoglalók generálása', time: '4 perc' },
      { title: 'Résztvevők és akciópontok kezelése', time: '5 perc' },
      { title: 'Sablonok és testreszabás', time: '7 perc' },
      { title: 'Integráció más eszközökkel', time: '8 perc' }
    ]
  },
  {
    id: 'security',
    title: 'Biztonság és adatvédelem',
    description: 'Adatainak védelme prioritásunk',
    icon: Shield,
    articles: [
      { title: 'Adatbiztonsági intézkedések', time: '5 perc' },
      { title: 'GDPR megfelelőség', time: '4 perc' },
      { title: 'Felhasználói jogosultságok', time: '6 perc' },
      { title: 'Titkosítás és biztonságos tárolás', time: '3 perc' }
    ]
  },
  {
    id: 'troubleshooting',
    title: 'Hibaelhárítás',
    description: 'Gyakori problémák megoldása',
    icon: MessageSquare,
    articles: [
      { title: 'Feltöltési problémák megoldása', time: '3 perc' },
      { title: 'Transzkripciós hibák javítása', time: '4 perc' },
      { title: 'Bejelentkezési problémák', time: '2 perc' },
      { title: 'Böngésző kompatibilitás', time: '3 perc' }
    ]
  }
]

const video_tutorials = [
  {
    title: 'HangJegyzet.AI bemutató',
    duration: '8:30',
    description: 'Átfogó bemutató a platform főbb funkcióiról',
    thumbnail: '/api/placeholder/320/180'
  },
  {
    title: 'Meeting létrehozása lépésről lépésre',
    duration: '5:45',
    description: 'Hogyan hozzon létre és kezeljen meetingeket',
    thumbnail: '/api/placeholder/320/180'
  },
  {
    title: 'AI funkciók használata',
    duration: '6:20',
    description: 'Összefoglalók és insights generálása',
    thumbnail: '/api/placeholder/320/180'
  },
  {
    title: 'Csapatmunka és megosztás',
    duration: '4:15',
    description: 'Együttműködés csapattagokkal',
    thumbnail: '/api/placeholder/320/180'
  }
]

const popular_articles = [
  { 
    title: 'Hogyan töltsek fel hangfájlt?',
    category: 'Alapok',
    views: 2341
  },
  { 
    title: 'AI összefoglaló testreszabása',
    category: 'AI funkciók',
    views: 1893
  },
  { 
    title: 'Csapat meghívása és jogosultságok',
    category: 'Csapatmunka',
    views: 1567
  },
  { 
    title: 'Export formátumok és lehetőségek',
    category: 'Export',
    views: 1234
  },
  { 
    title: 'Integrációk beállítása',
    category: 'Integrációk',
    views: 987
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('articles')

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Hogyan segíthetünk?
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Találja meg a választ kérdéseire, vagy vegye fel velünk a kapcsolatot
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Keresés a súgóban..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-3 w-full text-gray-900 bg-white"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-8 px-4 bg-white border-b">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="outline" asChild>
              <Link href="/docs">
                <FileText className="w-4 h-4 mr-2" />
                Dokumentáció
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                Támogatás
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/changelog">
                <Clock className="w-4 h-4 mr-2" />
                Újdonságok
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@hangjegyzet.ai">
                <Mail className="w-4 h-4 mr-2" />
                Email küldése
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
            <TabsTrigger value="articles">Cikkek</TabsTrigger>
            <TabsTrigger value="videos">Videók</TabsTrigger>
            <TabsTrigger value="popular">Népszerű</TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              {help_categories.map((category) => (
                <Card key={category.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <category.icon className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.articles.map((article, index) => (
                        <li key={index}>
                          <Link
                            href={`/docs/${category.id}/${article.title.toLowerCase().replace(/\s+/g, '-')}`}
                            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium">{article.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{article.time}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {video_tutorials.map((video, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="relative aspect-video bg-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {video.duration}
                    </Badge>
                  </div>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-2">{video.title}</h3>
                    <p className="text-sm text-gray-600">{video.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="popular" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legnépszerűbb cikkek</CardTitle>
                <CardDescription>
                  A legtöbbet keresett témák és megoldások
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {popular_articles.map((article, index) => (
                    <Link
                      key={index}
                      href={`/docs/${article.title.toLowerCase().replace(/\s+/g, '-')}`}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{article.title}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {article.views.toLocaleString()} megtekintés
                          </span>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Still Need Help */}
        <section className="mt-16 text-center">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-8">
              <Users className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                További segítségre van szüksége?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Támogatási csapatunk készséggel áll rendelkezésére. 
                Válaszidő: általában 24 órán belül munkanapokon.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild>
                  <Link href="/support">
                    <HeadphonesIcon className="w-4 h-4 mr-2" />
                    Támogatás kérése
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/contact">
                    <Mail className="w-4 h-4 mr-2" />
                    Kapcsolat
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}