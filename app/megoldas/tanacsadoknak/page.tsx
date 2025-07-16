import { Button } from '@/components/ui/button'
import { Check, Clock, FileText, Users, TrendingUp, BarChart3, Briefcase, Target } from 'lucide-react'
import Link from 'next/link'

export default function ConsultantsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-purple-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Professzionális tanácsadás{' '}
              <span className="text-purple-600">dokumentált eredményekkel</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Tanácsadóknak tervezett meeting platform. 
              Rögzítse és ossza meg az értékes insights-okat ügyfelekkel azonnal.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">Ingyenes próba (14 nap)</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#demo">Demó megtekintése</Link>
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
                A kihívások
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Clock className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Értékes idő elvesztése</strong>
                    <p className="text-gray-600">
                      Órák mennek el meeting jegyzőkönyvek készítésével
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <FileText className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Következetlen dokumentáció</strong>
                    <p className="text-gray-600">
                      Kulcsfontosságú döntések és akciótervek elvesznek
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Users className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Nehézkes tudásmegosztás</strong>
                    <p className="text-gray-600">
                      Csapattagok nem férnek hozzá fontos információkhoz
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-6 text-green-600">
                A HangJegyzet megoldás
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Automatikus dokumentálás</strong>
                    <p className="text-gray-600">
                      Minden meeting azonnal átírva és strukturálva
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Professzionális deliverables</strong>
                    <p className="text-gray-600">
                      Márkázott összefoglalók és akciótervek egy kattintással
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Központi tudástár</strong>
                    <p className="text-gray-600">
                      Kereshető archívum minden projekt meeting-ről
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Mérhető eredmények</h2>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div>
                  <div className="text-4xl font-bold text-purple-600">40%</div>
                  <div className="text-gray-600">időmegtakarítás admin munkában</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-purple-600">3x</div>
                  <div className="text-gray-600">több ügyfél elégedettség</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-purple-600">95%</div>
                  <div className="text-gray-600">követési arány akcióterveken</div>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Egy tipikus tanácsadó cég esetén (10 fős csapat):
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded p-4">
                <p className="font-semibold">
                  Heti 20 óra megtakarítás = €2,000 értékű produktív idő
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  HangJegyzet csapat csomag: €499/hó = 400% ROI
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features for consultants */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Tanácsadók számára optimalizált funkciók
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <Briefcase className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Projekt alapú szervezés</h3>
              <p className="text-gray-600">
                Meeting-ek automatikus csoportosítása projekt és ügyfél szerint
              </p>
            </div>
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analitika és riportok</h3>
              <p className="text-gray-600">
                Meeting statisztikák és trendek követése
              </p>
            </div>
            <div className="text-center">
              <Target className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Akcióterv követés</h3>
              <p className="text-gray-600">
                Automatikus emlékeztetők és státusz frissítések
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Csapat kollaboráció</h3>
              <p className="text-gray-600">
                Valós idejű megjegyzések és belső jegyzetek
              </p>
            </div>
            <div className="text-center">
              <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Márkázott exportok</h3>
              <p className="text-gray-600">
                Saját logó és arculat az ügyfél dokumentumokon
              </p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">CRM integráció</h3>
              <p className="text-gray-600">
                Automatikus szinkronizálás népszerű CRM rendszerekkel
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-purple-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Használati esetek
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Stratégiai workshopok</h3>
              <p className="text-gray-600 mb-4">
                Rögzítse a brainstorming session-öket, SWOT analíziseket és stratégiai döntéseket. 
                Minden résztvevő azonnal megkapja a strukturált összefoglalót.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Automatikus agenda követés</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Döntési pontok kiemelése</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Következő lépések tisztázása</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-3">Ügyfél prezentációk</h3>
              <p className="text-gray-600 mb-4">
                Prezentálja megoldásait magabiztosan, tudva hogy minden kérdés és visszajelzés 
                dokumentálva lesz.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Q&A szekció automatikus rögzítése</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Ügyfél aggályok követése</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Azonnali follow-up dokumentum</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <blockquote className="text-center">
              <p className="text-2xl italic mb-6">
                "A HangJegyzet teljesen átalakította hogyan dokumentáljuk a tanácsadási projektjeinket. 
                Az ügyfelek imádják a professzionális összefoglalókat, mi pedig 
                végre a tanácsadásra koncentrálhatunk, nem az adminisztrációra."
              </p>
              <footer>
                <div className="font-semibold">Szabó Eszter</div>
                <div className="text-gray-600">Managing Partner, Strategic Advisors Kft.</div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-b from-white to-purple-50 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Emelje tanácsadói szolgáltatását új szintre
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Csatlakozzon a vezető tanácsadó cégekhez, akik már használják a HangJegyzetet. 
            14 napos ingyenes próba, teljes funkcionalitással.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register?plan=consultant">
                Próbálja ki ingyen
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                Kérjen egyedi bemutatót
              </Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Csapat csomagok 5 főtől | Enterprise megoldások 50+ fő esetén
          </p>
        </div>
      </section>
    </div>
  )
}