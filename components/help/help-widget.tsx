'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  HelpCircle,
  MessageCircle,
  Book,
  Video,
  Mail,
  Phone,
  Search,
  ChevronRight,
  ExternalLink,
  FileText,
  PlayCircle,
  Zap,
  Shield,
  Users,
  TrendingUp,
  Keyboard,
  MousePointer,
  Mic,
  FileAudio,
  Download,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpArticle {
  id: string
  title: string
  category: 'basics' | 'recording' | 'transcription' | 'features' | 'troubleshooting'
  content: string
  icon?: React.ReactNode
  keywords: string[]
}

const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Első lépések',
    category: 'basics',
    icon: <Book className="w-4 h-4" />,
    content: `
## Üdvözöljük a HangJegyzetben!

### 1. Fiók létrehozása
- Kattintson a "Regisztráció" gombra
- Adja meg email címét és válasszon jelszót
- Erősítse meg fiókját az emailben kapott linkkel

### 2. Szervezet beállítása
- Hozzon létre új szervezetet vagy csatlakozzon meglévőhöz
- Állítsa be a szervezet nevét és típusát
- Hívjon meg csapattagokat

### 3. Első meeting rögzítése
- Kattintson az "Új meeting" gombra
- Válassza ki a rögzítési módot
- Indítsa el a felvételt
    `,
    keywords: ['kezdés', 'regisztráció', 'fiók', 'első lépések', 'setup'],
  },
  {
    id: 'recording-modes',
    title: 'Rögzítési módok',
    category: 'recording',
    icon: <Mic className="w-4 h-4" />,
    content: `
## Rögzítési lehetőségek

### Élő felvétel
- Mikrofonos rögzítés közvetlenül a böngészőből
- Valós idejű minőség ellenőrzés
- Automatikus zajszűrés

### Fájl feltöltés
- Támogatott formátumok: MP3, WAV, M4A, OGG
- Maximum 500MB fájlméret
- Batch feldolgozás több fájlhoz

### Képernyő rögzítés
- Teljes képernyő vagy ablak rögzítése
- Hang és videó szinkronizálása
- Prezentációk rögzítéséhez ideális
    `,
    keywords: ['felvétel', 'mikrofon', 'rögzítés', 'audio', 'hang'],
  },
  {
    id: 'processing-modes',
    title: 'Feldolgozási módok',
    category: 'transcription',
    icon: <Zap className="w-4 h-4" />,
    content: `
## Feldolgozási módok kiválasztása

### Gyors mód
- 5-10 perc feldolgozási idő
- Alapvető pontosság
- Ideális gyors jegyzeteléshez

### Kiegyensúlyozott mód
- 15-20 perc feldolgozási idő
- Magas pontosság
- Ajánlott a legtöbb használati esethez

### Precíziós mód
- 30+ perc feldolgozási idő
- Maximális pontosság
- Szakmai, jogi dokumentumokhoz
    `,
    keywords: ['feldolgozás', 'transzkripció', 'pontosság', 'sebesség'],
  },
  {
    id: 'collaboration',
    title: 'Csapatmunka funkciók',
    category: 'features',
    icon: <Users className="w-4 h-4" />,
    content: `
## Együttműködés csapattagokkal

### Megjegyzések
- Szövegkiemelés és kommentelés
- @említések csapattagoknak
- Valós idejű értesítések

### Feladatok
- Teendők hozzárendelése
- Határidők beállítása
- Prioritások kezelése

### Megosztás
- Belső megosztás a szervezeten belül
- Külső linkek generálása
- Jogosultságok beállítása
    `,
    keywords: ['csapat', 'együttműködés', 'megosztás', 'komment'],
  },
  {
    id: 'export-options',
    title: 'Exportálási lehetőségek',
    category: 'features',
    icon: <Download className="w-4 h-4" />,
    content: `
## Dokumentum exportálás

### Formátumok
- **PDF**: Formázott dokumentum logóval
- **Word**: Szerkeszthető DOCX fájl
- **Markdown**: Egyszerű szöveges formátum
- **Excel**: Strukturált adatok táblázatban

### Sablonok
- Jogi jegyzőkönyv
- Üzleti összefoglaló
- Egészségügyi konzultáció
- Oktatási jegyzet
- Egyéni sablon létrehozása
    `,
    keywords: ['export', 'letöltés', 'pdf', 'word', 'sablon'],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Billentyűparancsok',
    category: 'features',
    icon: <Keyboard className="w-4 h-4" />,
    content: `
## Gyorsbillentyűk

### Lejátszás vezérlése
- **Szóköz**: Lejátszás/Szünet
- **←/→**: 5 másodperc előre/hátra
- **Shift + ←/→**: 30 másodperc előre/hátra
- **↑/↓**: Hangerő növelése/csökkentése

### Szerkesztés
- **Ctrl/Cmd + S**: Mentés
- **Ctrl/Cmd + Z**: Visszavonás
- **Ctrl/Cmd + Y**: Újra
- **Ctrl/Cmd + F**: Keresés

### Navigáció
- **Ctrl/Cmd + K**: Gyorskeresés
- **Esc**: Bezárás/Kilépés
    `,
    keywords: ['billentyű', 'gyorsbillentyű', 'parancs', 'shortcut'],
  },
  {
    id: 'troubleshooting-audio',
    title: 'Hang problémák megoldása',
    category: 'troubleshooting',
    icon: <FileAudio className="w-4 h-4" />,
    content: `
## Gyakori hang problémák

### Nincs hang a felvételen
1. Ellenőrizze a mikrofon engedélyeket
2. Válassza ki a megfelelő beviteli eszközt
3. Tesztelje a mikrofont más alkalmazásban

### Rossz hangminőség
- Használjon külső mikrofont
- Csendes környezetben rögzítsen
- Állítsa be a megfelelő érzékenységet

### Feldolgozási hiba
- Ellenőrizze a fájl formátumot
- Győződjön meg róla, hogy a fájl nem sérült
- Próbálja újra feltölteni
    `,
    keywords: ['hiba', 'probléma', 'hang', 'mikrofon', 'hibaelhárítás'],
  },
]

const videoTutorials = [
  {
    id: 'intro',
    title: 'Bemutató videó',
    duration: '5:23',
    thumbnail: '/tutorials/intro-thumb.jpg',
  },
  {
    id: 'recording',
    title: 'Hogyan rögzítsünk meetinget',
    duration: '3:45',
    thumbnail: '/tutorials/recording-thumb.jpg',
  },
  {
    id: 'collaboration',
    title: 'Csapatmunka funkciók',
    duration: '4:12',
    thumbnail: '/tutorials/collab-thumb.jpg',
  },
]

interface HelpWidgetProps {
  className?: string
}

export function HelpWidget({ className }: HelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [activeTab, setActiveTab] = useState('articles')

  // Filter articles based on search
  const filteredArticles = helpArticles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.keywords.some(keyword => 
      keyword.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Group articles by category
  const articlesByCategory = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) {
      acc[article.category] = []
    }
    acc[article.category].push(article)
    return acc
  }, {} as Record<string, HelpArticle[]>)

  const categoryLabels = {
    basics: 'Alapok',
    recording: 'Rögzítés',
    transcription: 'Átírás',
    features: 'Funkciók',
    troubleshooting: 'Hibaelhárítás',
  }

  return (
    <>
      {/* Help button */}
      <Button
        variant="outline"
        size="icon"
        className={cn("fixed bottom-6 right-6 z-50 shadow-lg", className)}
        onClick={() => setIsOpen(true)}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      {/* Help sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Súgó és támogatás</SheetTitle>
            <SheetDescription>
              Találjon válaszokat kérdéseire vagy kérjen segítséget
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Keresés a súgóban..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="articles">Cikkek</TabsTrigger>
                <TabsTrigger value="videos">Videók</TabsTrigger>
                <TabsTrigger value="contact">Kapcsolat</TabsTrigger>
              </TabsList>

              {/* Articles tab */}
              <TabsContent value="articles" className="mt-6">
                {selectedArticle ? (
                  // Article detail view
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(null)}
                      className="mb-4"
                    >
                      ← Vissza
                    </Button>
                    <div className="prose prose-sm max-w-none">
                      <h1 className="text-2xl font-bold mb-4">{selectedArticle.title}</h1>
                      <div className="whitespace-pre-line">{selectedArticle.content}</div>
                    </div>
                  </div>
                ) : (
                  // Article list view
                  <div className="space-y-6">
                    {Object.entries(articlesByCategory).map(([category, articles]) => (
                      <div key={category}>
                        <h3 className="font-semibold text-sm text-gray-600 mb-3">
                          {categoryLabels[category as keyof typeof categoryLabels]}
                        </h3>
                        <div className="space-y-2">
                          {articles.map((article) => (
                            <button
                              key={article.id}
                              onClick={() => setSelectedArticle(article)}
                              className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {article.icon}
                                  <span className="font-medium">{article.title}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Videos tab */}
              <TabsContent value="videos" className="mt-6">
                <div className="space-y-4">
                  {videoTutorials.map((video) => (
                    <Card key={video.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                            <PlayCircle className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{video.title}</h4>
                            <p className="text-sm text-gray-600">{video.duration}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Contact tab */}
              <TabsContent value="contact" className="mt-6">
                <div className="space-y-6">
                  {/* Live chat */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Élő chat támogatás
                      </CardTitle>
                      <CardDescription>
                        Beszéljen ügyfélszolgálatunkkal valós időben
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-sm text-green-600">Online vagyunk</span>
                        </div>
                        <Badge>Átlagos válaszidő: 2 perc</Badge>
                      </div>
                      <Button className="w-full">Chat indítása</Button>
                    </CardContent>
                  </Card>

                  {/* Email support */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email támogatás
                      </CardTitle>
                      <CardDescription>
                        Küldjön részletes kérdést vagy hibajelentést
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">support@hangjegyzet.ai</p>
                      <Button variant="outline" className="w-full">
                        Email küldése
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Phone support */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Telefonos támogatás
                      </CardTitle>
                      <CardDescription>
                        Prémium ügyfelek számára munkanapokon 9-17 óráig
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">+36 1 234 5678</p>
                      <Badge variant="secondary">Csak Enterprise csomag</Badge>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}