import { 
  FileAudio, 
  Brain, 
  Shield, 
  Zap, 
  Globe2, 
  BarChart3,
  Users,
  Clock,
  CheckCircle
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Intelligens AI összefoglalás',
    description: 'Automatikusan kiemeli a kulcspontokat, döntéseket és teendőket. Strukturált jegyzőkönyvet kap perceken belül.',
    benefits: ['Kulcspontok kiemelése', 'Teendők listája', 'Döntések összegzése']
  },
  {
    icon: Globe2,
    title: 'Magyar nyelv támogatás',
    description: '97%+ pontosság magyar nyelven, szakszavakkal és helyi kifejezésekkel. Érti a magyar üzleti nyelvet.',
    benefits: ['Magyar szakszavak', 'Helyi kifejezések', 'Többnyelvű meetingek']
  },
  {
    icon: Shield,
    title: 'Biztonságos és GDPR megfelelő',
    description: 'Európai szervereken tároljuk adatait, teljes GDPR megfelelőséggel. Az Ön adatai az Öné maradnak.',
    benefits: ['EU szerverek', 'Titkosított tárolás', 'Adatok törlése kérésre']
  },
  {
    icon: Zap,
    title: 'Villámgyors feldolgozás',
    description: 'Egy 60 perces meeting átírása és összefoglalása mindössze 2 perc. Azonnal küldhető jegyzőkönyv.',
    benefits: ['2 perces átírás', 'Azonnali elérhetőség', 'Email értesítés']
  },
  {
    icon: Users,
    title: 'Csapatmunka támogatás',
    description: 'Ossza meg meetingjeit csapattagjaival. Közös hozzáférés, megjegyzések és címkézés.',
    benefits: ['Megosztás egy kattintással', 'Szerepkör alapú jogok', 'Közös címkézés']
  },
  {
    icon: BarChart3,
    title: 'Részletes elemzések',
    description: 'Lássa ki mennyi időt beszélt, milyen témák merültek fel. Meetingek hatékonyságának mérése.',
    benefits: ['Beszélési idő elemzés', 'Téma felismerés', 'Trend jelentések']
  }
]

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Minden amire szüksége van a tökéletes meeting dokumentációhoz
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            A HangJegyzet nem csak átír - intelligensen feldolgozza meetingjeit, 
            hogy Ön a fontos döntésekre koncentrálhasson.
          </p>
        </div>
        
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div 
                key={index} 
                className="relative group hover:scale-105 transition-transform duration-300"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500"></div>
                <div className="relative bg-white p-8 rounded-2xl shadow-sm h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Feature comparison */}
        <div className="mt-20 bg-white rounded-2xl shadow-lg p-8 md:p-12">
          <h3 className="text-2xl font-bold text-center mb-8">
            Miért jobb a HangJegyzet a hagyományos jegyzetelésnél?
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                <span className="text-2xl">❌</span> Hagyományos jegyzetelés
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Fontos részletek elvesztése a jegyzetelés közben</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>30-60 perc utómunka minden meeting után</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Nem lehet visszakeresni korábbi megbeszélésekben</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Mindenki más jegyzetet készít ugyanarról</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-4 flex items-center gap-2">
                <span className="text-2xl">✅</span> HangJegyzet
              </h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span><strong>100% pontosság</strong> - minden szó rögzítve</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span><strong>2 perc alatt kész</strong> jegyzőkönyv</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span><strong>Kereshető archívum</strong> minden meetingről</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span><strong>Egységes formátum</strong> minden résztvevőnek</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}