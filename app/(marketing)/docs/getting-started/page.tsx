import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  Upload,
  Settings,
  Users,
  Zap
} from 'lucide-react'

export default function GettingStartedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/docs" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <p className="text-sm text-gray-600">Dokumentáció / Első lépések</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Gyors kezdés</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              5 perc olvasás
            </span>
            <Badge variant="secondary">Kezdőknek</Badge>
          </div>
        </header>

        {/* Introduction */}
        <div className="prose prose-lg max-w-none mb-12">
          <p className="lead text-xl text-gray-600">
            Üdvözöljük a HangJegyzet.AI-ban! Ez az útmutató végigvezeti az első lépéseken, 
            hogy perceken belül elkezdhesse használni a platformot.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {/* Step 1 */}
          <section>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Regisztráció és bejelentkezés</h2>
                <p className="text-gray-600">
                  Ha még nincs fiókja, kezdje a regisztrációval. 14 napos ingyenes próbaidőszakot biztosítunk.
                </p>
              </div>
            </div>
            
            <Card className="p-6 bg-gray-50">
              <h3 className="font-semibold mb-3">Regisztrációs lépések:</h3>
              <ol className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Látogasson el a <Link href="/register" className="text-blue-600 hover:underline">regisztrációs oldalra</Link></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Adja meg email címét és válasszon jelszót</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Erősítse meg email címét a kapott levélben</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Töltse ki a rövid onboarding kérdőívet (opcionális)</span>
                </li>
              </ol>
            </Card>
          </section>

          {/* Step 2 */}
          <section>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Első meeting feltöltése</h2>
                <p className="text-gray-600">
                  A HangJegyzet.AI többféle módon tud meeting felvételeket feldolgozni.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <Upload className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-semibold mb-2">Fájl feltöltés</h4>
                <p className="text-sm text-gray-600">
                  Húzza a fájlt a feltöltési területre vagy válassza ki
                </p>
              </Card>
              
              <Card className="p-4">
                <Zap className="w-8 h-8 text-purple-600 mb-3" />
                <h4 className="font-semibold mb-2">Integráció</h4>
                <p className="text-sm text-gray-600">
                  Automatikus import Zoom, Teams vagy Meet-ből
                </p>
              </Card>
              
              <Card className="p-4">
                <Settings className="w-8 h-8 text-green-600 mb-3" />
                <h4 className="font-semibold mb-2">API</h4>
                <p className="text-sm text-gray-600">
                  Programozott feltöltés REST API-n keresztül
                </p>
              </Card>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tipp:</strong> Első alkalommal próbáljon ki egy rövid, 5-10 perces felvételt, 
                hogy megismerje a rendszer működését.
              </p>
            </div>
          </section>

          {/* Step 3 */}
          <section>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Átírási mód kiválasztása</h2>
                <p className="text-gray-600">
                  Három különböző átírási mód közül választhat az igényei szerint.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-4 border-2 hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      ⚡ Gyors mód
                      <Badge variant="secondary">2-5 perc</Badge>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Ideális napi meetingekhez, ahol a sebesség a lényeg
                    </p>
                  </div>
                  <span className="text-sm font-medium">95% pontosság</span>
                </div>
              </Card>

              <Card className="p-4 border-2 hover:border-purple-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      ⚖️ Kiegyensúlyozott mód
                      <Badge variant="secondary">5-10 perc</Badge>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      A legjobb választás a legtöbb felhasználási esethez
                    </p>
                  </div>
                  <span className="text-sm font-medium">97% pontosság</span>
                </div>
              </Card>

              <Card className="p-4 border-2 hover:border-green-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2">
                      🎯 Precíziós mód
                      <Badge variant="secondary">10-20 perc</Badge>
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Jogi, orvosi vagy kritikus meetingekhez
                    </p>
                  </div>
                  <span className="text-sm font-medium">99%+ pontosság</span>
                </div>
              </Card>
            </div>
          </section>

          {/* Step 4 */}
          <section>
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Eredmények áttekintése</h2>
                <p className="text-gray-600">
                  A feldolgozás után automatikusan értesítést kap. Az eredmények tartalmaznak:
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Teljes átírás</p>
                    <p className="text-sm text-gray-600">Időbélyegekkel és beszélő azonosítással</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">AI összefoglaló</p>
                    <p className="text-sm text-gray-600">Kulcspontok és főbb témák</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Teendők</p>
                    <p className="text-sm text-gray-600">Automatikusan kinyert akciók</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Export opciók</p>
                    <p className="text-sm text-gray-600">PDF, DOCX, TXT formátumok</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Next Steps */}
          <section className="bg-gray-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Következő lépések</h2>
            <p className="text-gray-600 mb-6">
              Most, hogy megismerte az alapokat, fedezze fel a további lehetőségeket:
            </p>
            
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-4">
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold mb-1">Csapat meghívása</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Dolgozzon együtt kollégáival
                </p>
                <Link href="/docs/team/invites" className="text-sm text-blue-600 hover:underline">
                  Tudjon meg többet →
                </Link>
              </Card>

              <Card className="p-4">
                <Zap className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-semibold mb-1">Integrációk</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Csatlakoztassa kedvenc eszközeit
                </p>
                <Link href="/docs/integrations" className="text-sm text-blue-600 hover:underline">
                  Beállítás →
                </Link>
              </Card>

              <Card className="p-4">
                <Settings className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-semibold mb-1">API használat</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Automatizálja a folyamatokat
                </p>
                <Link href="/docs/api" className="text-sm text-blue-600 hover:underline">
                  API docs →
                </Link>
              </Card>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t">
          <Link href="/docs" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            Vissza a dokumentációhoz
          </Link>
          <Link href="/docs/first-upload" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
            Első feltöltés
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </div>
  )
}