import { changelog } from '@/lib/help/changelog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, Sparkles, Wrench, Bug, Shield } from 'lucide-react'
import Link from 'next/link'

const categoryIcons = {
  new: <Sparkles className="h-5 w-5 text-green-500" />,
  improved: <Wrench className="h-5 w-5 text-blue-500" />,
  fixed: <Bug className="h-5 w-5 text-orange-500" />,
  security: <Shield className="h-5 w-5 text-red-500" />,
}

const categoryLabels = {
  new: 'Új funkciók',
  improved: 'Fejlesztések',
  fixed: 'Hibajavítások',
  security: 'Biztonság',
}

const versionBadgeColors = {
  major: 'destructive',
  minor: 'default',
  patch: 'secondary',
} as const

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Vissza
            </Link>
          </div>
          <h1 className="text-3xl font-bold">Újdonságok</h1>
          <p className="text-gray-600 mt-2">
            Kövesse nyomon a HangJegyzet legújabb funkcióit és fejlesztéseit
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {changelog.map((entry) => (
            <Card key={entry.version} className="overflow-hidden">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">
                      Verzió {entry.version}
                    </CardTitle>
                    <Badge variant={versionBadgeColors[entry.type]}>
                      {entry.type === 'major' && 'Nagy kiadás'}
                      {entry.type === 'minor' && 'Új funkciók'}
                      {entry.type === 'patch' && 'Javítások'}
                    </Badge>
                  </div>
                  <time className="text-sm text-gray-600">{entry.date}</time>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {entry.changes.map((changeGroup, index) => (
                    <div key={index}>
                      <div className="flex items-center gap-2 mb-3">
                        {categoryIcons[changeGroup.category]}
                        <h3 className="font-semibold text-lg">
                          {categoryLabels[changeGroup.category]}
                        </h3>
                      </div>
                      <ul className="space-y-2 ml-7">
                        {changeGroup.items.map((item, itemIndex) => (
                          <li
                            key={itemIndex}
                            className="text-gray-700 flex items-start gap-2"
                          >
                            <span className="text-gray-400 mt-1">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Subscribe section */}
        <Card className="max-w-4xl mx-auto mt-12 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                Értesüljön elsőként az újdonságokról
              </h3>
              <p className="text-gray-600 mb-4">
                Iratkozzon fel hírlevelünkre és kapjon értesítést az új funkciókról
              </p>
              <div className="flex gap-2 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Email címe"
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Feliratkozás
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}