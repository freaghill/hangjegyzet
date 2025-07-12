'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ToggleLeft, 
  Users, 
  Building,
  Percent,
  RefreshCw,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { FeatureFlag, getFeatureFlagStatus } from '@/lib/features/feature-flags'

interface FeatureFlagData {
  key: FeatureFlag
  enabled: boolean
  rolloutPercentage: number
  enabledUsers: string[]
  enabledOrganizations: string[]
  description: string
}

const FEATURE_FLAGS: Record<FeatureFlag, { name: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  'mode-based-pricing-enabled': {
    name: 'Mode-Based Pricing',
    description: 'Enable the new Fast/Balanced/Precision pricing model',
    risk: 'high'
  },
  'migration-wizard-enabled': {
    name: 'Migration Wizard',
    description: 'Show migration wizard to existing customers',
    risk: 'medium'
  },
  'new-upload-flow-enabled': {
    name: 'New Upload Flow',
    description: 'Enable mode selection in upload dialog',
    risk: 'medium'
  },
  'usage-monitoring-enabled': {
    name: 'Usage Monitoring',
    description: 'Real-time usage tracking and dashboards',
    risk: 'low'
  },
  'rate-limiting-enabled': {
    name: 'Rate Limiting',
    description: 'API rate limiting per mode and tier',
    risk: 'medium'
  },
  'anomaly-detection-enabled': {
    name: 'Anomaly Detection',
    description: 'Automatic detection of usage anomalies',
    risk: 'low'
  },
  'webhook-notifications-enabled': {
    name: 'Webhook Notifications',
    description: 'Send webhooks for usage limits',
    risk: 'low'
  },
  'precision-mode-enabled': {
    name: 'Precision Mode',
    description: 'Enable high-accuracy transcription mode',
    risk: 'high'
  }
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Record<FeatureFlag, FeatureFlagData>>({} as any)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState<string>('default')

  useEffect(() => {
    loadFeatureFlags()
  }, [])

  const loadFeatureFlags = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/feature-flags')
      const data = await response.json()
      
      setFlags(data.flags)
      setProvider(data.provider)
    } catch (error) {
      console.error('Failed to load feature flags:', error)
      toast.error('Failed to load feature flags')
    } finally {
      setLoading(false)
    }
  }

  const saveFeatureFlags = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Feature flags updated successfully')
    } catch (error) {
      console.error('Failed to save feature flags:', error)
      toast.error('Failed to save feature flags')
    } finally {
      setSaving(false)
    }
  }

  const updateFlag = (key: FeatureFlag, updates: Partial<FeatureFlagData>) => {
    setFlags(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }))
  }

  const getRiskBadge = (risk: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    }
    return <Badge className={colors[risk]}>{risk.toUpperCase()}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Feature Flags</h1>
          <p className="text-gray-600 mt-1">Manage feature rollout and A/B testing</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">Provider: {provider}</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadFeatureFlags}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={saveFeatureFlags}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Changes to feature flags affect all users immediately. Test thoroughly before enabling features in production.
        </AlertDescription>
      </Alert>

      {/* Feature Flags List */}
      <div className="grid gap-6">
        {Object.entries(FEATURE_FLAGS).map(([key, config]) => {
          const flag = flags[key as FeatureFlag]
          if (!flag) return null

          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ToggleLeft className="h-5 w-5 text-gray-600" />
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRiskBadge(config.risk)}
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(enabled) => updateFlag(key as FeatureFlag, { enabled })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="rollout" className="w-full">
                  <TabsList>
                    <TabsTrigger value="rollout">Rollout</TabsTrigger>
                    <TabsTrigger value="users">Specific Users</TabsTrigger>
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="rollout" className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Percent className="h-4 w-4 text-gray-600" />
                      <Label htmlFor={`${key}-percentage`}>Rollout Percentage</Label>
                      <Input
                        id={`${key}-percentage`}
                        type="number"
                        min="0"
                        max="100"
                        value={flag.rolloutPercentage}
                        onChange={(e) => updateFlag(key as FeatureFlag, { 
                          rolloutPercentage: parseInt(e.target.value) || 0 
                        })}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">
                        {flag.rolloutPercentage === 0 && 'Feature is disabled for all users'}
                        {flag.rolloutPercentage > 0 && flag.rolloutPercentage < 100 && 
                          `Feature is enabled for ${flag.rolloutPercentage}% of users`}
                        {flag.rolloutPercentage === 100 && 'Feature is enabled for all users'}
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="users" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <Label>Enabled for specific users (email addresses)</Label>
                      </div>
                      <textarea
                        className="w-full min-h-[100px] p-3 border rounded-md"
                        placeholder="user1@example.com&#10;user2@example.com"
                        value={flag.enabledUsers.join('\n')}
                        onChange={(e) => updateFlag(key as FeatureFlag, { 
                          enabledUsers: e.target.value.split('\n').filter(Boolean) 
                        })}
                      />
                      <p className="text-sm text-gray-600">
                        One email per line. These users will always see this feature.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="organizations" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-600" />
                        <Label>Enabled for specific organizations (IDs)</Label>
                      </div>
                      <textarea
                        className="w-full min-h-[100px] p-3 border rounded-md"
                        placeholder="org-123&#10;org-456"
                        value={flag.enabledOrganizations.join('\n')}
                        onChange={(e) => updateFlag(key as FeatureFlag, { 
                          enabledOrganizations: e.target.value.split('\n').filter(Boolean) 
                        })}
                      />
                      <p className="text-sm text-gray-600">
                        One organization ID per line. All users in these organizations will see this feature.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Rollout Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Rollout Strategy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Phase 1: Internal Testing</h4>
              <ul className="text-sm space-y-1">
                <li>• Enable for @hangjegyzet.hu emails</li>
                <li>• Test all features thoroughly</li>
                <li>• Monitor for issues (1-2 days)</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Phase 2: Beta Users</h4>
              <ul className="text-sm space-y-1">
                <li>• Enable for 5-10% of users</li>
                <li>• Collect feedback actively</li>
                <li>• Fix any issues (3-5 days)</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Phase 3: Full Rollout</h4>
              <ul className="text-sm space-y-1">
                <li>• Gradually increase to 100%</li>
                <li>• Monitor metrics closely</li>
                <li>• Ready to rollback if needed</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Always have a rollback plan ready. Feature flags should be disabled immediately if critical issues arise.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}