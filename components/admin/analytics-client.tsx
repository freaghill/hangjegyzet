'use client'

import { Card } from '@/components/ui/card'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts'

interface AnalyticsClientProps {
  monthlyUsage: Array<{ month: string; minutes: number; meetings: number }>
  statusDistribution: Array<{ status: string; count: number }>
  tierDistribution: Array<{ tier: string; count: number }>
  topOrganizations: Array<{ name: string; minutes: number; meetings: number }>
}

const COLORS = {
  completed: '#10b981',
  processing: '#3b82f6',
  failed: '#ef4444',
  uploading: '#f59e0b',
  trial: '#6b7280',
  starter: '#10b981',
  professional: '#f59e0b',
  enterprise: '#ef4444'
}

export default function AnalyticsClient({
  monthlyUsage,
  statusDistribution,
  tierDistribution,
  topOrganizations
}: AnalyticsClientProps) {
  return (
    <div className="space-y-6">
      {/* Monthly Usage Trends */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Monthly Usage Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyUsage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
            <Tooltip />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="minutes" 
              stroke="#3b82f6" 
              name="Minutes Used"
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="meetings" 
              stroke="#10b981" 
              name="Meeting Count"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meeting Status Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Meeting Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                nameKey="status"
              >
                {statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Subscription Tier Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Subscription Tiers</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tierDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tier" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#8884d8">
                {tierDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.tier as keyof typeof COLORS] || '#8884d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Organizations */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Top 10 Organizations by Usage</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium text-gray-900">Organization</th>
                <th className="text-right p-3 font-medium text-gray-900">Minutes Used</th>
                <th className="text-right p-3 font-medium text-gray-900">Meetings</th>
                <th className="text-right p-3 font-medium text-gray-900">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {topOrganizations.map((org, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{org.name}</td>
                  <td className="p-3 text-right">{org.minutes.toLocaleString()}</td>
                  <td className="p-3 text-right">{org.meetings.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    {org.meetings > 0 ? Math.round(org.minutes / org.meetings) : 0} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}