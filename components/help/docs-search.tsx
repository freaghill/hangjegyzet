'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
  Search,
  FileText,
  Book,
  Zap,
  Users,
  Settings,
  HelpCircle,
  ExternalLink,
  Hash,
  ArrowRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface DocPage {
  id: string
  title: string
  description: string
  category: string
  path: string
  keywords: string[]
  sections?: Array<{
    id: string
    title: string
    anchor: string
  }>
}

const docPages: DocPage[] = [
  {
    id: 'getting-started',
    title: 'Kezdő útmutató',
    description: 'Ismerje meg a HangJegyzet alapjait',
    category: 'Alapok',
    path: '/docs/getting-started',
    keywords: ['kezdés', 'első lépések', 'regisztráció', 'beállítás'],
    sections: [
      { id: 'registration', title: 'Regisztráció', anchor: '#registration' },
      { id: 'first-meeting', title: 'Első meeting', anchor: '#first-meeting' },
      { id: 'organization', title: 'Szervezet létrehozása', anchor: '#organization' },
    ],
  },
  {
    id: 'recording',
    title: 'Meeting rögzítése',
    description: 'Hogyan rögzítsen meetingeket különböző módokon',
    category: 'Funkciók',
    path: '/docs/recording',
    keywords: ['felvétel', 'mikrofon', 'hang', 'rögzítés'],
    sections: [
      { id: 'live', title: 'Élő felvétel', anchor: '#live' },
      { id: 'upload', title: 'Fájl feltöltés', anchor: '#upload' },
      { id: 'screen', title: 'Képernyő rögzítés', anchor: '#screen' },
    ],
  },
  {
    id: 'transcription',
    title: 'Átírás és feldolgozás',
    description: 'A transzkripció folyamata és beállításai',
    category: 'Funkciók',
    path: '/docs/transcription',
    keywords: ['átírás', 'transzkripció', 'AI', 'feldolgozás'],
    sections: [
      { id: 'modes', title: 'Feldolgozási módok', anchor: '#modes' },
      { id: 'languages', title: 'Támogatott nyelvek', anchor: '#languages' },
      { id: 'accuracy', title: 'Pontosság növelése', anchor: '#accuracy' },
    ],
  },
  {
    id: 'collaboration',
    title: 'Csapatmunka',
    description: 'Együttműködés csapattagokkal',
    category: 'Funkciók',
    path: '/docs/collaboration',
    keywords: ['csapat', 'megosztás', 'együttműködés', 'komment'],
    sections: [
      { id: 'comments', title: 'Megjegyzések', anchor: '#comments' },
      { id: 'tasks', title: 'Feladatok', anchor: '#tasks' },
      { id: 'sharing', title: 'Megosztás', anchor: '#sharing' },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrációk',
    description: 'Kapcsolódjon kedvenc eszközeihez',
    category: 'Integrációk',
    path: '/docs/integrations',
    keywords: ['integráció', 'API', 'webhook', 'automatizálás'],
    sections: [
      { id: 'calendar', title: 'Naptár szinkron', anchor: '#calendar' },
      { id: 'webhooks', title: 'Webhookok', anchor: '#webhooks' },
      { id: 'api', title: 'API használat', anchor: '#api' },
    ],
  },
  {
    id: 'security',
    title: 'Biztonság és adatvédelem',
    description: 'Hogyan védjük az Ön adatait',
    category: 'Biztonság',
    path: '/docs/security',
    keywords: ['biztonság', 'GDPR', 'titkosítás', 'adatvédelem'],
    sections: [
      { id: 'encryption', title: 'Titkosítás', anchor: '#encryption' },
      { id: 'compliance', title: 'Megfelelőség', anchor: '#compliance' },
      { id: 'access', title: 'Hozzáférés kezelés', anchor: '#access' },
    ],
  },
  {
    id: 'billing',
    title: 'Számlázás és csomagok',
    description: 'Előfizetések és fizetési információk',
    category: 'Számlázás',
    path: '/docs/billing',
    keywords: ['ár', 'csomag', 'előfizetés', 'számla'],
    sections: [
      { id: 'plans', title: 'Csomagok', anchor: '#plans' },
      { id: 'payment', title: 'Fizetési módok', anchor: '#payment' },
      { id: 'invoices', title: 'Számlák', anchor: '#invoices' },
    ],
  },
  {
    id: 'api-reference',
    title: 'API Referencia',
    description: 'Teljes API dokumentáció fejlesztőknek',
    category: 'Fejlesztőknek',
    path: '/docs/api',
    keywords: ['API', 'REST', 'fejlesztő', 'endpoint'],
    sections: [
      { id: 'auth', title: 'Autentikáció', anchor: '#auth' },
      { id: 'meetings', title: 'Meetings API', anchor: '#meetings' },
      { id: 'webhooks', title: 'Webhooks API', anchor: '#webhooks' },
    ],
  },
]

export function DocsSearch() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Filter pages based on search
  const filteredPages = docPages.filter(page => {
    const searchLower = search.toLowerCase()
    return (
      page.title.toLowerCase().includes(searchLower) ||
      page.description.toLowerCase().includes(searchLower) ||
      page.keywords.some(k => k.includes(searchLower)) ||
      page.sections?.some(s => s.title.toLowerCase().includes(searchLower))
    )
  })

  // Group by category
  const pagesByCategory = filteredPages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = []
    }
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, DocPage[]>)

  const navigateToPage = (path: string) => {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      {/* Search trigger */}
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Keresés a dokumentációban...
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {/* Search dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Keresés a dokumentációban..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Nincs találat "{search}" kifejezésre
              </p>
            </div>
          </CommandEmpty>

          {Object.entries(pagesByCategory).map(([category, pages]) => (
            <CommandGroup key={category} heading={category}>
              {pages.map((page) => (
                <div key={page.id}>
                  {/* Main page */}
                  <CommandItem
                    value={page.title}
                    onSelect={() => navigateToPage(page.path)}
                    className="cursor-pointer"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <p className="font-medium">{page.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CommandItem>

                  {/* Page sections */}
                  {page.sections && search && page.sections.some(s => 
                    s.title.toLowerCase().includes(search.toLowerCase())
                  ) && (
                    <div className="ml-6 border-l pl-2">
                      {page.sections
                        .filter(s => s.title.toLowerCase().includes(search.toLowerCase()))
                        .map((section) => (
                          <CommandItem
                            key={section.id}
                            value={`${page.title} ${section.title}`}
                            onSelect={() => navigateToPage(`${page.path}${section.anchor}`)}
                            className="cursor-pointer py-1"
                          >
                            <Hash className="mr-2 h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{section.title}</span>
                          </CommandItem>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />
          
          {/* Quick actions */}
          <CommandGroup heading="Gyors műveletek">
            <CommandItem
              onSelect={() => {
                setOpen(false)
                window.open('https://status.hangjegyzet.ai', '_blank')
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Szolgáltatás állapota
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false)
                router.push('/changelog')
              }}
            >
              <Zap className="mr-2 h-4 w-4" />
              Újdonságok
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setOpen(false)
                router.push('/support')
              }}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Támogatás kérése
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}