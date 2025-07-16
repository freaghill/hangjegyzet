import { Button } from '@/components/ui/button'
import { Check, Clock, FileText, Shield, Heart, Stethoscope, ClipboardCheck, Lock } from 'lucide-react'
import Link from 'next/link'

export default function HealthcarePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-teal-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Precíz orvosi dokumentáció{' '}
              <span className="text-teal-600">időmegtakarítással</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Egészségügyi szakembereknek fejlesztett hangalapú dokumentációs rendszer. 
              Több idő a betegekre, kevesebb adminisztráció.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Ingyenes bemutató kérése</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Funkciók megismerése</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-red-600">
                A mindennapi kihívások
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Clock className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Adminisztratív túlterheltség</strong>
                    <p className="text-gray-600">
                      Napi 2-3 óra dokumentációval, ami a betegektől veszi el az időt
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <FileText className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Hiányos kórlapok</strong>
                    <p className="text-gray-600">
                      Fontos részletek kimaradnak a sietség miatt
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Heart className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Kiégés veszélye</strong>
                    <p className="text-gray-600">
                      Folyamatos időnyomás és stressz az adminisztráció miatt
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-6 text-green-600">
                A HangJegyzet előnyei
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Gyors dokumentálás</strong>
                    <p className="text-gray-600">
                      Beszéljen természetesen, a rendszer strukturálja az információt
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Orvosi szótár</strong>
                    <p className="text-gray-600">
                      Szaknyelv és rövidítések pontos felismerése
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>EESZT kompatibilis</strong>
                    <p className="text-gray-600">
                      Egyszerű integráció a meglévő rendszerekkel
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance & Security */}
      <section className="bg-teal-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Biztonság és megfelelőség első helyen
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg p-6">
                <Shield className="h-10 w-10 text-teal-600 mb-4" />
                <h3 className="font-semibold text-lg mb-3">Adatvédelem</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>GDPR és hazai adatvédelmi szabályoknak megfelelő</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Végponttól végpontig titkosított adatátvitel</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Magyar szervereken tárolt adatok</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-white rounded-lg p-6">
                <Lock className="h-10 w-10 text-teal-600 mb-4" />
                <h3 className="font-semibold text-lg mb-3">Orvosi titoktartás</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Szerepkör alapú hozzáférés-kezelés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Részletes audit log minden műveletről</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Automatikus anonimizálási lehetőségek</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features for healthcare */}
      <section className="py-20" id="features">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Egészségügyi szakembereknek tervezett funkciók
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <Stethoscope className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Orvosi szakszótár</h3>
              <p className="text-gray-600">
                10,000+ orvosi kifejezés, latin nevek és rövidítések felismerése
              </p>
            </div>
            <div className="text-center">
              <ClipboardCheck className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sablon rendszer</h3>
              <p className="text-gray-600">
                Előre definiált sablonok különböző vizsgálatokhoz és szakmákhoz
              </p>
            </div>
            <div className="text-center">
              <FileText className="h-12 w-12 text-teal-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Strukturált export</h3>
              <p className="text-gray-600">
                Automatikus formázás zárójelentésekhez és leleletekhez
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Használati területek
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-3">Háziorvosi praxis</h3>
              <p className="text-gray-600 text-sm mb-3">
                Gyors betegdokumentáció vizsgálat közben vagy után
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Anamnézis felvétel</li>
                <li>• Vizsgálati eredmények</li>
                <li>• Terápiás tervek</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-3">Szakrendelések</h3>
              <p className="text-gray-600 text-sm mb-3">
                Részletes szakorvosi dokumentáció készítése
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Konzultációs jegyzőkönyvek</li>
                <li>• Műtéti leírások</li>
                <li>• Kontroll vizsgálatok</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold mb-3">Kórházi osztályok</h3>
              <p className="text-gray-600 text-sm mb-3">
                Team munka támogatása egységes dokumentációval
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Vizitelési jegyzőkönyvek</li>
                <li>• Esetmegbeszélések</li>
                <li>• Műszakátadások</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI/Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Mérhető előnyök</h2>
            <div className="bg-teal-50 rounded-lg p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div>
                  <div className="text-4xl font-bold text-teal-600">60%</div>
                  <div className="text-gray-600">gyorsabb dokumentálás</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-teal-600">+45 perc</div>
                  <div className="text-gray-600">napi időmegtakarítás</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-teal-600">98%</div>
                  <div className="text-gray-600">pontosság orvosi szavaknál</div>
                </div>
              </div>
              <p className="text-gray-700">
                "A HangJegyzet bevezetése óta naponta 1 órával többet tudok a betegeimmel foglalkozni. 
                A dokumentáció pedig még részletesebb lett." - Dr. Nagy Péter, belgyógyász
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-b from-white to-teal-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Csatlakozzon a modern egészségügyi dokumentációhoz
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Próbálja ki rendszerünket saját praxisában. 
            Személyre szabott bevezetés és támogatás egészségügyi szakemberek számára.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/contact?type=healthcare">
                Egyedi bemutató kérése
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs/healthcare">
                Részletes dokumentáció
              </Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Speciális egészségügyi csomagok • Intézményi licencek • EESZT integráció
          </p>
        </div>
      </section>
    </div>
  )
}