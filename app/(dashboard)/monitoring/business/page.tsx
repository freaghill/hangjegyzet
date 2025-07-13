'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Clock, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts'
import { BusinessKPI } from '@/lib/monitoring/monitoring-service'

interface DashboardData {
  kpis: BusinessKPI[]
  revenue: {
    current: number
    previous: number
    growth: number
    mrr: number
    arr: number
    churn: number
  }
  users: {
    total: number
    active: number
    new: number
    retained: number
    churnRate: number
  }
  usage: {
    meetings: number
    transcriptionMinutes: number
    storageUsed: number
    apiCalls: number
  }
  conversion: {
    signupToTrial: number
    trialToPaid: number
    overallConversion: number
    averageTimeToConvert: number
  }
}

export default function BusinessMonitoringPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [timeRange, setTimeRange] = useState('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  useEffect(() => {
    loadDashboardData()
  }, [timeRange])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/monitoring/business?range=${timeRange}`)
      const data = await response.json()
      setDashboardData(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('hu-HU').format(value)
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500'
    if (change < 0) return 'text-red-500'
    return 'text-gray-500'
  }

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 1200000, mrr: 450000, customers: 89 },
    { month: 'Feb', revenue: 1350000, mrr: 480000, customers: 95 },
    { month: 'Mar', revenue: 1580000, mrr: 520000, customers: 104 },
    { month: 'Apr', revenue: 1750000, mrr: 580000, customers: 116 },
    { month: 'May', revenue: 1920000, mrr: 640000, customers: 128 },
    { month: 'Jun', revenue: 2100000, mrr: 700000, customers: 140 },
  ]

  const userGrowthData = [
    { week: 'W1', signups: 45, active: 280, churned: 5 },
    { week: 'W2', signups: 52, active: 295, churned: 3 },
    { week: 'W3', signups: 38, active: 305, churned: 8 },
    { week: 'W4', signups: 61, active: 325, churned: 4 },
  ]

  const planDistribution = [
    { name: 'Ingyenes', value: 45, color: '#94a3b8' },
    { name: 'Kezdő', value: 30, color: '#60a5fa' },
    { name: 'Profi', value: 20, color: '#818cf8' },
    { name: 'Vállalati', value: 5, color: '#a78bfa' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Üzleti KPI Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Kulcs teljesítménymutatók és üzleti metrikák
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 nap</SelectItem>
              <SelectItem value="30d">30 nap</SelectItem>
              <SelectItem value="90d">90 nap</SelectItem>
              <SelectItem value="1y">1 év</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Frissítés
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportálás
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Havi ismétlődő bevétel (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData?.revenue.mrr || 0)}
            </div>
            <p className={`text-xs flex items-center gap-1 ${getChangeColor(dashboardData?.revenue.growth || 0)}`}>
              {getTrendIcon('up')}
              <span>{dashboardData?.revenue.growth || 0}%</span>
              <span className="text-gray-500">előző hónaphoz képest</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktív felhasználók</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(dashboardData?.users.active || 0)}
            </div>
            <p className="text-xs text-gray-500">
              {formatNumber(dashboardData?.users.total || 0)} összesen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konverziós ráta</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.conversion.overallConversion || 0}%
            </div>
            <p className="text-xs text-gray-500">
              Regisztrációból fizetős
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lemorzsolódási ráta</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData?.revenue.churn || 0}%
            </div>
            <p className={`text-xs ${(dashboardData?.revenue.churn || 0) < 5 ? 'text-green-500' : 'text-red-500'}`}>
              {(dashboardData?.revenue.churn || 0) < 5 ? 'Egészséges' : 'Magas'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Bevétel</TabsTrigger>
          <TabsTrigger value="users">Felhasználók</TabsTrigger>
          <TabsTrigger value="usage">Használat</TabsTrigger>
          <TabsTrigger value="conversion">Konverzió</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Bevétel trend</CardTitle>
                <CardDescription>
                  Havi bevétel és MRR alakulása
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#8884d8" 
                      name="Összbevétel"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="mrr" 
                      stroke="#82ca9d" 
                      name="MRR"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bevétel források</CardTitle>
                <CardDescription>
                  Bevétel megoszlása forrás szerint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Előfizetések', value: 65, color: '#8884d8' },
                        { name: 'Egyszeri díjak', value: 20, color: '#82ca9d' },
                        { name: 'API használat', value: 10, color: '#ffc658' },
                        { name: 'Egyéb', value: 5, color: '#ff8042' },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Kulcs bevételi metrikák</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Átlagos kosárérték</p>
                  <p className="text-2xl font-bold">{formatCurrency(15000)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">LTV</p>
                  <p className="text-2xl font-bold">{formatCurrency(180000)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">CAC</p>
                  <p className="text-2xl font-bold">{formatCurrency(25000)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">LTV:CAC arány</p>
                  <p className="text-2xl font-bold">7.2:1</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Felhasználói növekedés</CardTitle>
                <CardDescription>
                  Új regisztrációk és aktív felhasználók
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="active" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8"
                      name="Aktív"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="signups" 
                      stackId="1"
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      name="Új"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Felhasználók csomag szerint</CardTitle>
                <CardDescription>
                  Előfizetési csomagok megoszlása
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name} (${value}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Felhasználói aktivitás</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Napi aktív felhasználók (DAU)</p>
                    <p className="text-sm text-gray-600">Az elmúlt 24 órában aktív</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">342</p>
                    <p className="text-sm text-green-500">+12%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Heti aktív felhasználók (WAU)</p>
                    <p className="text-sm text-gray-600">Az elmúlt 7 napban aktív</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">892</p>
                    <p className="text-sm text-green-500">+8%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Havi aktív felhasználók (MAU)</p>
                    <p className="text-sm text-gray-600">Az elmúlt 30 napban aktív</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">1,245</p>
                    <p className="text-sm text-green-500">+15%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform használat</CardTitle>
                <CardDescription>
                  Fő funkciók használati statisztikái
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Feltöltött találkozók</span>
                      <span className="text-sm font-bold">2,456</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Átírt percek</span>
                      <span className="text-sm font-bold">45,230</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Keresések száma</span>
                      <span className="text-sm font-bold">8,912</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Exportálások</span>
                      <span className="text-sm font-bold">1,234</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API használat</CardTitle>
                <CardDescription>
                  API hívások és kvóta kihasználtság
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { endpoint: 'Transcribe', calls: 4500 },
                    { endpoint: 'Search', calls: 3200 },
                    { endpoint: 'Export', calls: 1200 },
                    { endpoint: 'Analytics', calls: 800 },
                    { endpoint: 'Webhooks', calls: 600 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="endpoint" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konverziós tölcsér</CardTitle>
              <CardDescription>
                Felhasználói út a regisztrációtól a fizetésig
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Látogatók → Regisztráció</span>
                    <span className="text-2xl font-bold">23%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Regisztráció → Első használat</span>
                    <span className="text-2xl font-bold">68%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: '68%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Első használat → Próbaidő aktiválás</span>
                    <span className="text-2xl font-bold">45%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">Próbaidő → Fizetős előfizető</span>
                    <span className="text-2xl font-bold">32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-blue-500 h-4 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Teljes konverzió:</strong> 3.5% (látogató → fizető ügyfél)
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Átlagos konverziós idő: 12 nap
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}