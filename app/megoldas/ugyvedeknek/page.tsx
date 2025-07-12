import { Button } from '@/components/ui/button'
import { Check, Clock, FileText, Lock, TrendingUp, Users } from 'lucide-react'
import Link from 'next/link'

export default function LawyersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Soha többé nem veszít el{' '}
              <span className="text-blue-600">számlázható részletet</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Ügyvédeknek tervezett meeting átírás és dokumentálás. 
              Automatikusan rögzítse minden ügyféltalálkozó részletét.
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
                A probléma
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Clock className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Elveszett számlázható órák</strong>
                    <p className="text-gray-600">
                      Átlagosan 2-3 óra/hét veszteség a pontatlan időkövetés miatt
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <FileText className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Hiányos dokumentáció</strong>
                    <p className="text-gray-600">
                      Fontos részletek elvesznek a kézírásos jegyzetelés során
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Users className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Ügyfél elégedetlenség</strong>
                    <p className="text-gray-600">
                      "Ezt nem így beszéltük meg" típusú viták
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold mb-6 text-green-600">
                A megoldás
              </h2>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>100%-os pontosság</strong>
                    <p className="text-gray-600">
                      Minden szó, minden részlet automatikusan rögzítve
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Azonnali ügyirat</strong>
                    <p className="text-gray-600">
                      Meeting után azonnal rendelkezésre álló, kereshető dokumentum
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Check className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <strong>Jogi megfelelőség</strong>
                    <p className="text-gray-600">
                      GDPR-kompatibilis, titkosított tárolás, ügyfél hozzájárulás kezelés
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">A befektetés megtérülése</h2>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div>
                  <div className="text-4xl font-bold text-green-600">+15%</div>
                  <div className="text-gray-600">több számlázható óra</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-600">2.5x</div>
                  <div className="text-gray-600">gyorsabb dokumentálás</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-green-600">€300</div>
                  <div className="text-gray-600">extra bevétel/hó</div>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Egy átlagos ügyvéd esetén (€100/óra díjazás):
              </p>
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <p className="font-semibold">
                  3 extra számlázott óra/hét = €1,200/hó extra bevétel
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  A HangJegyzet ára: €99/hó = 1200% ROI
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features specific to lawyers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Ügyvédeknek tervezett funkciók
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Titkosított tárolás</h3>
              <p className="text-gray-600">
                Bank-szintű titkosítás, ügyvédi titoktartás garantált
              </p>
            </div>
            <div className="text-center">
              <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Ügyirat sablon</h3>
              <p className="text-gray-600">
                Automatikus formázás a megszokott ügyirat formátumban
              </p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Időkövetés</h3>
              <p className="text-gray-600">
                Pontos meeting időtartam számlázáshoz
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="bg-blue-50 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <blockquote className="text-center">
              <p className="text-2xl italic mb-6">
                "Az első hónapban 25%-kal nőtt a számlázható óráim száma. 
                Végre nem kell meeting után 30 percet jegyzeteket gépelnem."
              </p>
              <footer>
                <div className="font-semibold">Dr. Kovács András</div>
                <div className="text-gray-600">Ügyvéd, Kovács és Társai</div>
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Kezdje el még ma a pontos dokumentálást
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            14 napos ingyenes próba, bankkártya nem szükséges. 
            5 perc alatt beállítható.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register?plan=lawyer">
                Ingyenes próba indítása
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">
                Beszéljen szakértőnkkel
              </Link>
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Speciális ügyvédi csomag: €99/hó helyett €79/hó az első 3 hónapban
          </p>
        </div>
      </section>
    </div>
  )
}