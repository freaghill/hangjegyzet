import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { ModeBasedPricingPreview } from '@/components/landing/mode-based-pricing-preview'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 backdrop-blur-sm bg-white/70 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                {/* Responsive logo */}
          <div className="block md:hidden">
            <Logo variant="compact" />
          </div>
          <div className="hidden md:block">
            <Logo variant="full" size="md" />
          </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Árak
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                Belépés
              </Link>
              <Link href="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Próbálja ki ingyen
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 tracking-tight sm:text-6xl leading-tight">
              Soha többé ne veszítsen el
              <br />
              <span className="text-blue-600">egyetlen fontos részletet sem</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
              A HangJegyzet automatikusan rögzíti és összefoglalja meeting-jeit. 
              <strong>Spóroljon 30 percet minden megbeszélés után</strong> - nem kell jegyzetelnie.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link 
                href="/register" 
                className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
              >
                14 napos próba ingyen
              </Link>
              <Link 
                href="#mukodes" 
                className="text-base font-semibold leading-6 text-gray-900"
              >
                Hogyan működik? <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">97%+</div>
              <div className="text-lg font-semibold mt-2">Pontosság</div>
              <div className="text-gray-600 mt-1">Magyar nyelven is</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">30 perc</div>
              <div className="text-lg font-semibold mt-2">Megtakarítás</div>
              <div className="text-gray-600 mt-1">Minden meeting után</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">9,990 Ft</div>
              <div className="text-lg font-semibold mt-2">-tól havonta</div>
              <div className="text-gray-600 mt-1">Kisvállalkozásoknak</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Miért válassza a HangJegyzetet?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Konkrét előnyök az Ön vállalkozása számára
            </p>
          </div>
          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative bg-white p-8 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Soha többé félreértés
                </h3>
                <p className="text-gray-600">
                  <strong>97%+ pontosság magyar nyelven</strong> - minden szakszó, minden részlet pontosan rögzítve. Véget vetünk a "nem ezt mondtam" vitáknak.
                </p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative bg-white p-8 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  30 perc időmegtakarítás
                </h3>
                <p className="text-gray-600">
                  <strong>Automatikus jegyzőkönyv 2 percen belül</strong> - strukturálva, teendőkkel, döntésekkel. Többé nem kell jegyzetelnie.
                </p>
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
              <div className="relative bg-white p-8 rounded-2xl shadow-sm">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  100% GDPR-konform
                </h3>
                <p className="text-gray-600">
                  <strong>Európai szerverek, magyar adatvédelem</strong> - Nyugodtan rögzíthet bizalmas megbeszéléseket is.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Kinek ajánljuk?
            </h2>
            <p className="text-lg text-gray-600">
              Szakemberek, akik értékelik az idejüket
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">⚖️</div>
              <h3 className="text-xl font-semibold mb-2">Ügyvédeknek</h3>
              <p className="text-gray-600">
                Ügyféltalálkozók pontos dokumentálása. <strong>Többé nem veszít el számlázható részleteket.</strong>
              </p>
              <Link href="/megoldas/ugyvedeknek" className="text-blue-600 font-medium mt-2 inline-block">
                Tudjon meg többet →
              </Link>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-semibold mb-2">Tanácsadóknak</h3>
              <p className="text-gray-600">
                Projekt meetingek automatikus jegyzőkönyve. <strong>Fókuszáljon az ügyfélre, ne a jegyzetelésre.</strong>
              </p>
              <Link href="/megoldas/tanacsadoknak" className="text-blue-600 font-medium mt-2 inline-block">
                Tudjon meg többet →
              </Link>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏥</div>
              <h3 className="text-xl font-semibold mb-2">Egészségügynek</h3>
              <p className="text-gray-600">
                Konzultációk GDPR-kompatibilis rögzítése. <strong>Több idő a páciensekre, kevesebb adminisztráció.</strong>
              </p>
              <Link href="/megoldas/egeszsegugynek" className="text-blue-600 font-medium mt-2 inline-block">
                Tudjon meg többet →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mode Based Pricing Preview */}
      <ModeBasedPricingPreview />

      {/* How it works */}
      <section id="mukodes" className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">
              Így működik - 3 egyszerű lépésben
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A meeting végétől 2 percen belül kész jegyzőkönyvet kap
            </p>
          </div>
          <div className="space-y-12">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Töltse fel a felvételt
                </h3>
                <p className="text-gray-600">
                  Egyszerű drag & drop vagy fájl választás. <strong>Bármilyen formátum működik</strong> - MP3, MP4, WAV, stb.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI feldolgozás
                </h3>
                <p className="text-gray-600">
                  <strong>1-2 perc alatt kész</strong> - AI-unk pontosan átírja és intelligensen összefoglalja a beszélgetést.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Kész jegyzőkönyv
                </h3>
                <p className="text-gray-600">
                  <strong>Azonnal küldhető e-mailben</strong> - Strukturált formátum teendőkkel, döntésekkel, határidőkkel.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Pricing Summary */}
      <section id="arak" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Egyszerű, átlátható, mód-alapú árazás
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
              Három átírási mód közül választhat - csak azért fizet, amire tényleg szüksége van.
              Minden csomagban elérhető mindhárom mód, csak a mennyiség változik.
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Indulo */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Induló</h3>
              <p className="mt-2 text-sm text-gray-600">Kisebb csapatok számára</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-gray-900">9.990</span>
                <span className="text-gray-600"> Ft/hó</span>
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">⚡ Fast mód</span>
                  <span className="font-medium">500 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⚖️ Balanced</span>
                  <span className="font-medium">100 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🎯 Precision</span>
                  <span className="text-gray-400">-</span>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-6 block w-full bg-gray-100 text-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Kezdés
              </Link>
            </div>

            {/* Profi - Popular */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-600 p-6 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  NÉPSZERŰ
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Profi</h3>
              <p className="mt-2 text-sm text-gray-600">Növekvő vállalkozások</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-gray-900">29.990</span>
                <span className="text-gray-600"> Ft/hó</span>
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">⚡ Fast mód</span>
                  <span className="font-medium">2000 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⚖️ Balanced</span>
                  <span className="font-medium">500 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🎯 Precision</span>
                  <span className="font-medium">50 perc</span>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-6 block w-full bg-blue-600 text-center rounded-lg px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Próba indítása
              </Link>
            </div>

            {/* Vallalati */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">Vállalati</h3>
              <p className="mt-2 text-sm text-gray-600">Nagy szervezetek</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-gray-900">89.990</span>
                <span className="text-gray-600"> Ft/hó</span>
              </p>
              <div className="mt-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">⚡ Fast mód</span>
                  <span className="font-medium">10000 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">⚖️ Balanced</span>
                  <span className="font-medium">2000 perc</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">🎯 Precision</span>
                  <span className="font-medium">200 perc</span>
                </div>
              </div>
              <Link
                href="/register"
                className="mt-6 block w-full bg-gray-100 text-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200 transition-colors"
              >
                Kezdés
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/pricing" className="text-blue-600 hover:text-blue-700 font-medium">
              Részletes árazás és multinacionális csomag →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Spóroljon 30 percet minden meeting után
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Csatlakozzon az egyre növekvő felhasználóink közé!
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
          >
            Próbálja ki 14 napig ingyen
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Nem kérünk bankkártya adatokat • Bármikor lemondható
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Termék</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="#mukodes" className="hover:text-white transition-colors">
                    Hogyan működik
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Árak
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors">
                    GYIK
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Cég</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/status" className="hover:text-white transition-colors">
                    Rendszer állapot
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Kapcsolat
                  </Link>
                </li>
                <li>
                  <a href="mailto:hello@hangjegyzet.hu" className="hover:text-white transition-colors">
                    hello@hangjegyzet.hu
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Jogi</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Felhasználási feltételek
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Adatvédelem
                  </Link>
                </li>
                <li>
                  <Link href="/cookie-policy" className="hover:text-white transition-colors">
                    Süti szabályzat
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Támogatás</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/docs" className="hover:text-white transition-colors">
                    Dokumentáció
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors">
                    GYIK
                  </Link>
                </li>
                <li>
                  <Link href="/status" className="hover:text-white transition-colors">
                    Rendszer állapot
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Logo variant="full" className="text-white" />
            </div>
            <p className="text-sm">
              © 2024 HangJegyzet. Minden jog fenntartva.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}