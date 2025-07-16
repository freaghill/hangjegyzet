'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { ChevronDown, Search, HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

// export const metadata: Metadata = {
//   title: 'Gyakran Ismételt Kérdések - HangJegyzet.AI',
//   description: 'Válaszok a leggyakoribb kérdésekre a HangJegyzet.AI meeting jegyzetelő és átíró szolgáltatásról.',
// }

const faqCategories = [
  {
    name: 'Általános',
    items: [
      {
        question: 'Mi az a HangJegyzet?',
        answer: 'A HangJegyzet egy mesterséges intelligencia alapú meeting jegyzetelő és átíró szolgáltatás, amely automatikusan rögzíti, átírja és összefoglalja az üzleti megbeszéléseit. 97%+ pontossággal dolgozik és támogatja a magyar nyelvet.'
      },
      {
        question: 'Hogyan működik a szolgáltatás?',
        answer: 'Egyszerűen töltse fel a meeting felvételét vagy csatlakoztassa kedvenc videókonferencia platformját. Az AI automatikusan átírja a beszélgetést, azonosítja a beszélőket, készít összefoglalót és kiemeli a fontos pontokat.'
      },
      {
        question: 'Milyen nyelveket támogat?',
        answer: 'Elsődlegesen magyar nyelven működünk, de támogatjuk az angol, német és több mint 30 további nyelvet is. A többnyelvű meetingek automatikusan felismerésre kerülnek.'
      },
      {
        question: 'Mennyi ideig tart az átírás?',
        answer: 'A feldolgozási idő a választott módtól függ: Gyors mód (2-5 perc), Kiegyensúlyozott mód (5-10 perc), Precíziós mód (10-20 perc) egy órás felvétel esetén.'
      }
    ]
  },
  {
    name: 'Árazás és számlázás',
    items: [
      {
        question: 'Milyen előfizetési csomagok érhetők el?',
        answer: 'Négy csomagot kínálunk: Kezdő (49€/hó), Professzionális (199€/hó), Üzleti (499€/hó) és Vállalati (7.900€/hó). Minden csomag tartalmaz különböző mennyiségű feldolgozási kreditet és funkciókat.'
      },
      {
        question: 'Van ingyenes próbaidőszak?',
        answer: 'Igen, minden új felhasználó 14 napos ingyenes próbaidőszakot kap, amely során kipróbálhatja a szolgáltatás összes funkcióját.'
      },
      {
        question: 'Hogyan történik a számlázás?',
        answer: 'Havi vagy éves előfizetést választhat. Elfogadjuk a bankkártyás fizetést (Barion), valamint SimplePay és banki átutalás is lehetséges. Minden hónap elején állítjuk ki a számlát.'
      },
      {
        question: 'Mi történik, ha túllépem a havi keretemet?',
        answer: 'Értesítjük, amikor eléri kreditjeinek 80%-át. Túllépés esetén választhat magasabb csomagot vagy vásárolhat extra krediteket.'
      }
    ]
  },
  {
    name: 'Biztonság és adatvédelem',
    items: [
      {
        question: 'Biztonságosak az adataim?',
        answer: 'Igen, minden adatot titkosítva tárolunk (AES-256), és GDPR-kompatibilis módon kezeljük. Adatait kizárólag EU-s szervereken tároljuk, és szigorú hozzáférés-ellenőrzést alkalmazunk.'
      },
      {
        question: 'Ki férhet hozzá a felvételeimhez?',
        answer: 'Csak Ön és az Ön által meghívott csapattagok férhetnek hozzá. Technikai csapatunk csak hibaelhárítás céljából, az Ön kifejezett engedélyével tekinthet bele.'
      },
      {
        question: 'Mennyi ideig tárolják az adataimat?',
        answer: 'Az átírásokat és metaadatokat az előfizetés időtartama alatt + 30 napig tároljuk. Az eredeti felvételeket 90 napig őrizzük, majd automatikusan töröljük.'
      },
      {
        question: 'Megfelelnek a GDPR előírásoknak?',
        answer: 'Igen, teljes mértékben GDPR-kompatibilisek vagyunk. Adatfeldolgozási megállapodást (DPA) biztosítunk, és minden szükséges technikai és szervezési intézkedést megteszünk.'
      }
    ]
  },
  {
    name: 'Funkciók és integrációk',
    items: [
      {
        question: 'Milyen fájlformátumokat támogatnak?',
        answer: 'Támogatjuk az összes népszerű audio és videó formátumot: MP3, MP4, WAV, M4A, WebM, MOV, AVI, és még sok más. Maximum 500MB méretig közvetlenül, nagyobb fájlok esetén chunked upload.'
      },
      {
        question: 'Lehet élő meetingeket is átírni?',
        answer: 'Igen, a Professzionális csomagtól kezdve elérhető a valós idejű átírás funkció Zoom, Teams és Google Meet integrációval.'
      },
      {
        question: 'Hogyan működik a beszélő azonosítás?',
        answer: 'AI-alapú hangfelismerést használunk, amely automatikusan megkülönbözteti a beszélőket. A pontosság javítása érdekében manuálisan is hozzárendelheti a neveket.'
      },
      {
        question: 'Exportálhatom az átírásokat?',
        answer: 'Igen, többféle formátumban: DOCX, PDF, TXT, SRT (feliratozáshoz), valamint strukturált JSON formátumban API-n keresztül.'
      }
    ]
  },
  {
    name: 'Technikai kérdések',
    items: [
      {
        question: 'Milyen böngészőket támogatnak?',
        answer: 'Chrome, Firefox, Safari és Edge legújabb verzióit támogatjuk. Mobilon iOS Safari és Chrome Android ajánlott.'
      },
      {
        question: 'Van mobil alkalmazás?',
        answer: 'Jelenleg progresszív web alkalmazásként (PWA) működünk, amely telepíthető mobilra. Natív alkalmazások fejlesztés alatt.'
      },
      {
        question: 'Működik offline is?',
        answer: 'A megtekintés részben offline is működik, de az új felvételek feltöltéséhez és feldolgozásához internetkapcsolat szükséges.'
      },
      {
        question: 'Van API hozzáférés?',
        answer: 'Igen, RESTful API-t biztosítunk a Professzionális csomagtól. Webhook támogatás és részletes dokumentáció elérhető.'
      }
    ]
  },
  {
    name: 'Csapat és együttműködés',
    items: [
      {
        question: 'Hány felhasználót adhatok hozzá?',
        answer: 'A Kezdő csomag 1 felhasználót, Professzionális 5-öt, Üzleti 20-at, Vállalati korlátlan számú felhasználót támogat.'
      },
      {
        question: 'Hogyan oszthatom meg a jegyzeteket?',
        answer: 'Megoszthat nyilvános linkeket (opcionális jelszóval), meghívhat csapattagokat, vagy exportálhatja a fájlokat.'
      },
      {
        question: 'Van szerepkör-alapú jogosultságkezelés?',
        answer: 'Igen, az Üzleti csomagtól kezdve. Admin, szerkesztő és néző szerepkörök állnak rendelkezésre.'
      },
      {
        question: 'Lehet kommentálni az átírásokat?',
        answer: 'Igen, időbélyegzett kommenteket és annotációkat adhat hozzá, valamint @említésekkel értesítheti kollégáit.'
      }
    ]
  }
]

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [openItems, setOpenItems] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const toggleItem = (question: string) => {
    setOpenItems(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    )
  }

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(
      item =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => 
    !selectedCategory || category.name === selectedCategory || category.items.length > 0
  )

  const hasResults = filteredCategories.some(cat => cat.items.length > 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Gyakran Ismételt Kérdések
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Találja meg a választ kérdésére vagy vegye fel velünk a kapcsolatot
          </p>
        </div>
      </section>

      {/* Search and filters */}
      <section className="pb-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Keresés a kérdések között..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Összes
            </Button>
            {faqCategories.map(category => (
              <Button
                key={category.name}
                variant={selectedCategory === category.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.name)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Items */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {hasResults ? (
            <div className="space-y-8">
              {filteredCategories.map((category) => (
                category.items.length > 0 && (
                  <div key={category.name}>
                    <h2 className="text-2xl font-bold mb-4">{category.name}</h2>
                    <div className="space-y-3">
                      {category.items.map((item) => (
                        <div
                          key={item.question}
                          className="border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <button
                            onClick={() => toggleItem(item.question)}
                            className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <span className="font-medium text-gray-900 pr-4">
                              {item.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                                openItems.includes(item.question) ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {openItems.includes(item.question) && (
                            <div className="px-6 pb-4">
                              <p className="text-gray-600 leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Nem találtunk a keresésnek megfelelő kérdést.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory(null)
                }}
              >
                Keresés törlése
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-blue-50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Nem találta meg a választ?
            </h2>
            <p className="text-gray-600 mb-6">
              Csapatunk készséggel áll rendelkezésére. Vegye fel velünk a kapcsolatot!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link href="/contact">Kapcsolatfelvétel</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs">Dokumentáció</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}