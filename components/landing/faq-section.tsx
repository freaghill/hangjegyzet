'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const faqs = [
  {
    category: 'Általános kérdések',
    questions: [
      {
        question: 'Hogyan működik a HangJegyzet?',
        answer: 'Egyszerűen töltse fel audio vagy video fájlját (vagy használja élő felvétel funkciónkat), válassza ki a kívánt átírási módot (Fast, Balanced vagy Precision), és 1-2 percen belül megkapja a teljes átíratot és AI-generált összefoglalót. A rendszer automatikusan felismeri a beszélőket, kiemeli a kulcspontokat és összegyűjti a teendőket.'
      },
      {
        question: 'Milyen fájlformátumokat támogat?',
        answer: 'Minden népszerű audio és video formátumot támogatunk: MP3, WAV, M4A, MP4, MOV, AVI, WebM és még sok más. A maximális fájlméret 2GB. Nagyobb fájlok esetén automatikus darabolási funkciót biztosítunk.'
      },
      {
        question: 'Mennyi idő alatt készül el az átírás?',
        answer: 'A feldolgozási idő a választott módtól függ: Fast mód 1-2 perc, Balanced mód 3-5 perc, Precision mód 5-10 perc egy 60 perces felvétel esetén. Email értesítést küldünk, amikor elkészült.'
      },
      {
        question: 'Működik magyar nyelven is?',
        answer: 'Igen! A HangJegyzet kifejezetten optimalizálva van magyar nyelvre. 97%+ pontossággal írjuk át a magyar beszédet, beleértve a szakszavakat, helyi kifejezéseket és akcentusokat is. Támogatjuk a magyar-angol keverék meetingeket is.'
      }
    ]
  },
  {
    category: 'Biztonság és adatvédelem',
    questions: [
      {
        question: 'Biztonságban vannak az adataim?',
        answer: 'Teljes mértékben. Minden adatot titkosítva tárolunk európai szervereken, szigorú GDPR megfelelőséggel. Az Ön felvételeihez csak Ön és az általa meghívott felhasználók férhetnek hozzá. Rendszeres biztonsági auditokat végzünk.'
      },
      {
        question: 'Mi történik a felvételeimmel feltöltés után?',
        answer: 'A felvételeket titkosított formában tároljuk az Ön dedikált tárhely kvótáján belül. Bármikor letöltheti vagy törölheti őket. Ha törli a felvételt, az összes kapcsolódó adat (átírat, összefoglaló) is véglegesen törlődik 24 órán belül.'
      },
      {
        question: 'Használják az adataimat AI fejlesztésre?',
        answer: 'Nem. Az Ön adatai kizárólag az Ön tulajdonában maradnak. Nem használjuk fel őket AI modelljeink fejlesztésére vagy bármilyen más célra az Ön kifejezett hozzájárulása nélkül.'
      }
    ]
  },
  {
    category: 'Árazás és csomagok',
    questions: [
      {
        question: 'Hogyan működik a mód-alapú árazás?',
        answer: 'Három átírási módot kínálunk különböző pontossági szintekkel: Fast (gyors, ~95%), Balanced (kiegyensúlyozott, ~97%), és Precision (precíz, ~99%). Minden csomagban meghatározott mennyiségű percet kap havonta mindegyik módból. Csak azt használja, amire szüksége van.'
      },
      {
        question: 'Mi történik, ha elfogynak a perceim?',
        answer: 'Értesítést küld a rendszer 80%-os és 100%-os kihasználtságnál. Extra perceket vásárolhat, vagy válthat magasabb csomagra. A fel nem használt percek nem vihetők át a következő hónapra.'
      },
      {
        question: 'Van ingyenes próbaidőszak?',
        answer: 'Igen! 14 napos ingyenes próbaidőszakot biztosítunk, amely alatt kipróbálhatja az összes funkciót. Nem kérünk bankkártya adatokat a regisztrációnál. A próbaidőszak alatt 100 perc Fast és 20 perc Balanced módot használhat.'
      },
      {
        question: 'Hogyan mondhatom le az előfizetést?',
        answer: 'Bármikor lemondhatja előfizetését a beállítások menüben, egy kattintással. A lemondás a következő számlázási ciklus végén lép életbe, addig használhatja a szolgáltatást.'
      }
    ]
  },
  {
    category: 'Funkciók és használat',
    questions: [
      {
        question: 'Hány beszélőt tud megkülönböztetni?',
        answer: 'A HangJegyzet akár 10 különböző beszélőt is képes azonosítani és megkülönböztetni egy felvételen. A beszélőket automatikusan címkézi (Beszélő 1, Beszélő 2, stb.), de utólag átnevezheti őket a valódi nevükre.'
      },
      {
        question: 'Lehet élőben is rögzíteni?',
        answer: 'Igen! Böngészőből vagy mobilalkalmazásunkból közvetlenül rögzíthet. A felvétel automatikusan feltöltődik és feldolgozásra kerül, amint befejezte. Támogatjuk a Zoom, Teams és Google Meet integrációkat is.'
      },
      {
        question: 'Hogyan oszthatom meg a jegyzőkönyveket?',
        answer: 'Többféleképpen: email küldhető közvetlenül a platformról, generálhat megosztható linket (jelszóval védett opcióval), exportálhat PDF/Word formátumba, vagy integrálhat CRM/projektmenedzsment eszközökkel.'
      },
      {
        question: 'Van API a fejlesztők számára?',
        answer: 'Igen, REST API-t biztosítunk a Profi és Vállalati csomagokhoz. Automatizálhatja a feltöltést, lekérheti az átíratokat, és integrálhatja saját rendszereibe. Részletes dokumentáció elérhető.'
      }
    ]
  }
]

export function FAQSection() {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Gyakran ismételt kérdések
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Minden amit tudnia kell a HangJegyzetről
          </p>
        </div>

        <div className="space-y-12">
          {faqs.map((category, categoryIdx) => (
            <div key={categoryIdx}>
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                {category.category}
              </h3>
              <div className="space-y-4">
                {category.questions.map((item, idx) => {
                  const itemId = `${categoryIdx}-${idx}`
                  const isOpen = openItems.includes(itemId)
                  
                  return (
                    <div 
                      key={idx}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(itemId)}
                        className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900 pr-4">
                          {item.question}
                        </span>
                        <ChevronDown 
                          className={`h-5 w-5 text-gray-500 transition-transform flex-shrink-0 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="px-6 pb-4 text-gray-600">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Nem találta meg a választ? Írjon nekünk!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button variant="outline">
                Kapcsolatfelvétel
              </Button>
            </Link>
            <Link href="/docs">
              <Button variant="outline">
                Dokumentáció
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}