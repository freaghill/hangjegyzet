'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  Title,
  Text,
  Metric,
  AreaChart,
  BarChart,
  DonutChart,
  Grid,
  Flex,
  TabGroup,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  BadgeDelta,
  DeltaType,
  ProgressBar,
  List,
  ListItem,
} from '@tremor/react'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar,
  Clock,
  Users,
  FileAudio,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { hu } from 'date-fns/locale'

interface AnalyticsData {
  // Overview metrics
  totalMeetings: number
  totalMinutes: number
  activeUsers: number
  averageDuration: number
  
  // Trends
  meetingsTrend: Array<{ date: string; meetings: number; minutes: number }>
  userActivity: Array<{ user: string; meetings: number; minutes: number }>
  
  // Distributions
  meetingTypes: Array<{ type: string; count: number }>
  meetingDurations: Array<{ range: string; count: number }>
  processingModes: Array<{ mode: string; count: number; percentage: number }>
  
  // Time patterns
  hourlyDistribution: Array<{ hour: number; count: number }>
  weeklyDistribution: Array<{ day: string; count: number }>
  
  // Performance
  averageProcessingTime: number
  successRate: number
  
  // Growth
  monthlyGrowth: number
  userGrowth: number
}

interface AnalyticsDashboardProps {
  organizationId: string
  organizationName: string
}

export function AnalyticsDashboard({ organizationId, organizationName }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedTab, setSelectedTab] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    loadAnalytics()
  }, [organizationId, selectedPeriod])

  async function loadAnalytics() {
    setLoading(true)
    
    // Calculate date range
    const endDate = new Date()
    let startDate: Date
    
    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = startOfMonth(endDate)
        break
      case 'quarter':
        startDate = subMonths(endDate, 3)
        break
      default:
        startDate = startOfMonth(endDate)
    }

    try {
      // Fetch meetings data
      const { data: meetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (meetingsError) throw meetingsError

      // Fetch user activity
      const { data: users, error: usersError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          profiles!inner(full_name, email),
          meetings!inner(created_at, duration_seconds)
        `)
        .eq('organization_id', organizationId)

      if (usersError) throw usersError

      // Process data
      const analyticsData = processAnalyticsData(meetings || [], users || [], startDate, endDate)
      setData(analyticsData)
      
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  function processAnalyticsData(
    meetings: any[],
    users: any[],
    startDate: Date,
    endDate: Date
  ): AnalyticsData {
    // Calculate overview metrics
    const totalMeetings = meetings.length
    const totalMinutes = meetings.reduce((sum, m) => sum + (m.duration_seconds || 0) / 60, 0)
    const activeUsers = new Set(meetings.map(m => m.created_by)).size
    const averageDuration = totalMeetings > 0 ? totalMinutes / totalMeetings : 0

    // Calculate trends
    const dailyMeetings = new Map<string, { meetings: number; minutes: number }>()
    meetings.forEach(meeting => {
      const date = format(new Date(meeting.created_at), 'yyyy-MM-dd')
      const current = dailyMeetings.get(date) || { meetings: 0, minutes: 0 }
      dailyMeetings.set(date, {
        meetings: current.meetings + 1,
        minutes: current.minutes + (meeting.duration_seconds || 0) / 60
      })
    })

    const meetingsTrend = Array.from(dailyMeetings.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // User activity
    const userActivityMap = new Map<string, { name: string; meetings: number; minutes: number }>()
    meetings.forEach(meeting => {
      const userId = meeting.created_by
      const user = users.find(u => u.user_id === userId)
      const name = user?.profiles?.full_name || user?.profiles?.email || 'Unknown'
      
      const current = userActivityMap.get(userId) || { name, meetings: 0, minutes: 0 }
      userActivityMap.set(userId, {
        name,
        meetings: current.meetings + 1,
        minutes: current.minutes + (meeting.duration_seconds || 0) / 60
      })
    })

    const userActivity = Array.from(userActivityMap.values())
      .sort((a, b) => b.meetings - a.meetings)
      .slice(0, 10)

    // Meeting types distribution
    const meetingTypes = [
      { type: 'Projekt meeting', count: meetings.filter(m => m.title?.toLowerCase().includes('projekt')).length },
      { type: 'Ügyfél találkozó', count: meetings.filter(m => m.title?.toLowerCase().includes('ügyfél')).length },
      { type: 'Belső megbeszélés', count: meetings.filter(m => m.title?.toLowerCase().includes('belső')).length },
      { type: 'Egyéb', count: meetings.filter(m => 
        !m.title?.toLowerCase().includes('projekt') &&
        !m.title?.toLowerCase().includes('ügyfél') &&
        !m.title?.toLowerCase().includes('belső')
      ).length },
    ].filter(t => t.count > 0)

    // Duration distribution
    const durationRanges = [
      { range: '0-15 perc', min: 0, max: 15 },
      { range: '15-30 perc', min: 15, max: 30 },
      { range: '30-60 perc', min: 30, max: 60 },
      { range: '60+ perc', min: 60, max: Infinity },
    ]

    const meetingDurations = durationRanges.map(range => ({
      range: range.range,
      count: meetings.filter(m => {
        const minutes = (m.duration_seconds || 0) / 60
        return minutes >= range.min && minutes < range.max
      }).length
    }))

    // Processing modes
    const modeCount = {
      fast: meetings.filter(m => m.processing_mode === 'fast').length,
      balanced: meetings.filter(m => m.processing_mode === 'balanced').length,
      precision: meetings.filter(m => m.processing_mode === 'precision').length,
    }
    
    const totalModes = Object.values(modeCount).reduce((a, b) => a + b, 0)
    const processingModes = Object.entries(modeCount).map(([mode, count]) => ({
      mode: mode.charAt(0).toUpperCase() + mode.slice(1),
      count,
      percentage: totalModes > 0 ? (count / totalModes) * 100 : 0
    }))

    // Hourly distribution
    const hourlyMap = new Map<number, number>()
    meetings.forEach(meeting => {
      const hour = new Date(meeting.created_at).getHours()
      hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1)
    })
    
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourlyMap.get(i) || 0
    }))

    // Weekly distribution
    const weekDays = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat']
    const weeklyMap = new Map<number, number>()
    meetings.forEach(meeting => {
      const day = new Date(meeting.created_at).getDay()
      weeklyMap.set(day, (weeklyMap.get(day) || 0) + 1)
    })

    const weeklyDistribution = weekDays.map((day, index) => ({
      day,
      count: weeklyMap.get(index) || 0
    }))

    // Performance metrics
    const successfulMeetings = meetings.filter(m => m.status === 'completed').length
    const successRate = totalMeetings > 0 ? (successfulMeetings / totalMeetings) * 100 : 0

    const processingTimes = meetings
      .filter(m => m.processed_at && m.created_at)
      .map(m => (new Date(m.processed_at).getTime() - new Date(m.created_at).getTime()) / 1000 / 60)
    
    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0

    // Calculate growth
    const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()))
    const previousMeetings = meetings.filter(m => 
      new Date(m.created_at) >= previousPeriodStart &&
      new Date(m.created_at) < startDate
    ).length
    
    const monthlyGrowth = previousMeetings > 0
      ? ((totalMeetings - previousMeetings) / previousMeetings) * 100
      : 0

    return {
      totalMeetings,
      totalMinutes: Math.round(totalMinutes),
      activeUsers,
      averageDuration: Math.round(averageDuration),
      meetingsTrend,
      userActivity,
      meetingTypes,
      meetingDurations,
      processingModes,
      hourlyDistribution,
      weeklyDistribution,
      averageProcessingTime: Math.round(averageProcessingTime * 10) / 10,
      successRate: Math.round(successRate * 10) / 10,
      monthlyGrowth: Math.round(monthlyGrowth),
      userGrowth: 0, // Would need historical data
    }
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const deltaType = (value: number): DeltaType => {
    if (value > 0) return 'increase'
    if (value < 0) return 'decrease'
    return 'unchanged'
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hét
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hónap
          </button>
          <button
            onClick={() => setSelectedPeriod('quarter')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'quarter'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Negyedév
          </button>
        </div>
      </div>

      {/* Overview metrics */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-6">
        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Összes megbeszélés</Text>
              <Metric>{data.totalMeetings}</Metric>
            </div>
            <BadgeDelta deltaType={deltaType(data.monthlyGrowth)}>
              {data.monthlyGrowth}%
            </BadgeDelta>
          </Flex>
        </Card>
        
        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Összes perc</Text>
              <Metric>{data.totalMinutes.toLocaleString()}</Metric>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </Flex>
        </Card>
        
        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Aktív felhasználók</Text>
              <Metric>{data.activeUsers}</Metric>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </Flex>
        </Card>
        
        <Card>
          <Flex alignItems="start">
            <div>
              <Text>Átlagos időtartam</Text>
              <Metric>{data.averageDuration} perc</Metric>
            </div>
            <Activity className="w-8 h-8 text-gray-400" />
          </Flex>
        </Card>
      </Grid>

      {/* Tab navigation */}
      <TabGroup index={selectedTab} onIndexChange={setSelectedTab}>
        <TabList className="mt-8">
          <Tab icon={TrendingUp}>Trendek</Tab>
          <Tab icon={Users}>Felhasználók</Tab>
          <Tab icon={PieChart}>Eloszlások</Tab>
          <Tab icon={BarChart3}>Teljesítmény</Tab>
        </TabList>

        <TabPanels>
          {/* Trends tab */}
          <TabPanel>
            <div className="mt-6 space-y-6">
              <Card>
                <Title>Megbeszélések trendje</Title>
                <AreaChart
                  className="h-72 mt-4"
                  data={data.meetingsTrend}
                  index="date"
                  categories={["meetings", "minutes"]}
                  colors={["blue", "green"]}
                  valueFormatter={(value) => value.toLocaleString()}
                />
              </Card>

              <Grid numItems={1} numItemsLg={2} className="gap-6">
                <Card>
                  <Title>Napi eloszlás</Title>
                  <BarChart
                    className="mt-4 h-60"
                    data={data.weeklyDistribution}
                    index="day"
                    categories={["count"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value} meeting`}
                  />
                </Card>

                <Card>
                  <Title>Óránkénti eloszlás</Title>
                  <AreaChart
                    className="mt-4 h-60"
                    data={data.hourlyDistribution}
                    index="hour"
                    categories={["count"]}
                    colors={["indigo"]}
                    valueFormatter={(value) => `${value} meeting`}
                  />
                </Card>
              </Grid>
            </div>
          </TabPanel>

          {/* Users tab */}
          <TabPanel>
            <div className="mt-6">
              <Card>
                <Title>Legaktívabb felhasználók</Title>
                <List className="mt-4">
                  {data.userActivity.map((user, index) => (
                    <ListItem key={index}>
                      <Flex justifyContent="start" className="truncate space-x-4">
                        <div className="truncate">
                          <Text className="truncate">{user.user}</Text>
                          <Text className="truncate text-gray-500">
                            {user.meetings} meeting • {Math.round(user.minutes)} perc
                          </Text>
                        </div>
                      </Flex>
                      <Text>{user.meetings}</Text>
                    </ListItem>
                  ))}
                </List>
              </Card>
            </div>
          </TabPanel>

          {/* Distributions tab */}
          <TabPanel>
            <div className="mt-6 space-y-6">
              <Grid numItems={1} numItemsLg={2} className="gap-6">
                <Card>
                  <Title>Meeting típusok</Title>
                  <DonutChart
                    className="mt-4 h-60"
                    data={data.meetingTypes}
                    category="count"
                    index="type"
                    valueFormatter={(value) => `${value} meeting`}
                    colors={["blue", "cyan", "indigo", "violet"]}
                  />
                </Card>

                <Card>
                  <Title>Időtartam eloszlás</Title>
                  <BarChart
                    className="mt-4 h-60"
                    data={data.meetingDurations}
                    index="range"
                    categories={["count"]}
                    colors={["blue"]}
                    valueFormatter={(value) => `${value} meeting`}
                  />
                </Card>
              </Grid>

              <Card>
                <Title>Feldolgozási módok</Title>
                <div className="mt-4 space-y-4">
                  {data.processingModes.map((mode) => (
                    <div key={mode.mode}>
                      <Flex>
                        <Text>{mode.mode}</Text>
                        <Text>{mode.count} ({mode.percentage.toFixed(1)}%)</Text>
                      </Flex>
                      <ProgressBar
                        value={mode.percentage}
                        color="blue"
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabPanel>

          {/* Performance tab */}
          <TabPanel>
            <div className="mt-6 space-y-6">
              <Grid numItems={1} numItemsLg={2} className="gap-6">
                <Card>
                  <Title>Sikerességi arány</Title>
                  <Metric>{data.successRate}%</Metric>
                  <ProgressBar
                    value={data.successRate}
                    color="green"
                    className="mt-4"
                  />
                  <Text className="mt-2">
                    {Math.round(data.totalMeetings * data.successRate / 100)} sikeres / {data.totalMeetings} összes
                  </Text>
                </Card>

                <Card>
                  <Title>Átlagos feldolgozási idő</Title>
                  <Metric>{data.averageProcessingTime} perc</Metric>
                  <Text className="mt-4">
                    A meetingek átlagosan {data.averageProcessingTime} perc alatt készülnek el
                  </Text>
                </Card>
              </Grid>
            </div>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  )
}