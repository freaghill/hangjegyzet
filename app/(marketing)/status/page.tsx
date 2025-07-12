import { Metadata } from 'next'
import { CheckCircle, AlertCircle, XCircle, Clock, Activity, Zap, Database, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Rendszer Állapot - HangJegyzet.AI',
  description: 'Valós idejű rendszer állapot és szolgáltatás elérhetőség a HangJegyzet.AI platformon.',
}

// This would typically come from an API or monitoring service
const services = [
  {
    name: 'Web Alkalmazás',
    status: 'operational',
    uptime: '99.9%',
    responseTime: '45ms',
    icon: Activity,
    description: 'Fő alkalmazás és felhasználói felület',
  },
  {
    name: 'API Szolgáltatások',
    status: 'operational',
    uptime: '99.8%',
    responseTime: '120ms',
    icon: Zap,
    description: 'REST API és webhook végpontok',
  },
  {
    name: 'Átírási Motor',
    status: 'operational',
    uptime: '99.7%',
    responseTime: '2.3s',
    icon: Activity,
    description: 'AI átírási és feldolgozási szolgáltatások',
  },
  {
    name: 'Adatbázis',
    status: 'operational',
    uptime: '99.9%',
    responseTime: '15ms',
    icon: Database,
    description: 'Elsődleges adattárolás',
  },
  {
    name: 'Fájl Tárolás',
    status: 'operational',
    uptime: '99.9%',
    responseTime: '85ms',
    icon: Database,
    description: 'Audio és dokumentum tárolás',
  },
  {
    name: 'Biztonsági Szolgáltatások',
    status: 'operational',
    uptime: '100%',
    responseTime: '25ms',
    icon: Shield,
    description: 'WAF, DDoS védelem és SSL',
  },
]

const incidents = [
  {
    id: 1,
    title: 'Tervezett karbantartás',
    status: 'scheduled',
    date: '2025-01-15 02:00 CET',
    duration: '2 óra',
    affectedServices: ['Adatbázis', 'API Szolgáltatások'],
    description: 'Adatbázis frissítés és optimalizálás',
  },
]

const statusConfig = {
  operational: {
    label: 'Működik',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Csökkentett teljesítmény',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertCircle,
  },
  outage: {
    label: 'Leállás',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  scheduled: {
    label: 'Tervezett',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Clock,
  },
} as const

export default function StatusPage() {
  const allOperational = services.every(s => s.status === 'operational')
  const overallUptime = '99.8%' // This would be calculated from real data

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Rendszer Állapot
          </h1>
          <p className="text-xl text-gray-600">
            Valós idejű információk a HangJegyzet.AI szolgáltatások elérhetőségéről
          </p>
        </div>
      </section>

      {/* Overall Status */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className={`${allOperational ? 'border-green-500' : 'border-yellow-500'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {allOperational ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                  )}
                  <div>
                    <CardTitle className="text-2xl">
                      {allOperational ? 'Minden rendszer működik' : 'Részleges szolgáltatás kiesés'}
                    </CardTitle>
                    <CardDescription>
                      Utolsó frissítés: {new Date().toLocaleString('hu-HU')}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Általános üzemidő</p>
                  <p className="text-2xl font-bold text-gray-900">{overallUptime}</p>
                  <p className="text-xs text-gray-500">Elmúlt 90 nap</p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Szolgáltatások</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service) => {
              const config = statusConfig[service.status as keyof typeof statusConfig]
              const StatusIcon = config.icon
              const ServiceIcon = service.icon
              
              return (
                <Card key={service.name} className={`border ${config.borderColor}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <ServiceIcon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {service.description}
                          </CardDescription>
                        </div>
                      </div>
                      <StatusIcon className={`w-5 h-5 ${config.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Állapot</p>
                        <p className={`font-medium ${config.color}`}>{config.label}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Üzemidő</p>
                        <p className="font-medium">{service.uptime}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Válaszidő</p>
                        <p className="font-medium">{service.responseTime}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Incidents */}
      {incidents.length > 0 && (
        <section className="pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Tervezett karbantartások</h2>
            <div className="space-y-4">
              {incidents.map((incident) => {
                const config = statusConfig[incident.status as keyof typeof statusConfig]
                const StatusIcon = config.icon
                
                return (
                  <Card key={incident.id} className={`border ${config.borderColor}`}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <StatusIcon className={`w-6 h-6 ${config.color} mt-0.5`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">{incident.title}</CardTitle>
                            <Badge variant="secondary" className={config.bgColor}>
                              {config.label}
                            </Badge>
                          </div>
                          <CardDescription>{incident.description}</CardDescription>
                          <div className="mt-3 flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">{incident.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-600">Időtartam: {incident.duration}</span>
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Érintett szolgáltatások: {incident.affectedServices.join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Uptime History */}
      <section className="pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Üzemidő előzmények</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Last 7 days */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Elmúlt 7 nap</span>
                    <span className="text-sm text-gray-600">99.9%</span>
                  </div>
                  <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 h-8 bg-green-500 rounded"
                        title={`${new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('hu-HU')}: 100%`}
                      />
                    ))}
                  </div>
                </div>

                {/* Last 30 days */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Elmúlt 30 nap</span>
                    <span className="text-sm text-gray-600">99.8%</span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-6 rounded-sm ${
                          i === 15 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        title={`Nap ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>Értesítések szolgáltatás állapotról</CardTitle>
              <CardDescription>
                Iratkozzon fel, hogy értesítést kapjon a tervezett karbantartásokról és incidensekről.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Feliratkozás
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}