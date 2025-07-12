'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Video, Phone, Calendar, Link2, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type IntegrationType = 'zoom' | 'teams' | 'meet' | 'manual'

interface IntegrationConfig {
  zoom?: {
    apiKey: string
    apiSecret: string
  }
  teams?: {
    tenantId: string
    clientId: string
  }
  meet?: {
    clientId: string
    apiKey: string
  }
}

interface IntegrationSelectorProps {
  onIntegrationSelect: (type: IntegrationType, config?: any) => void
  currentIntegration?: IntegrationType
}

export default function IntegrationSelector({
  onIntegrationSelect,
  currentIntegration
}: IntegrationSelectorProps) {
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(currentIntegration || null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [meetingUrl, setMeetingUrl] = useState('')
  const [config, setConfig] = useState<IntegrationConfig>({})

  const integrations = [
    {
      id: 'zoom' as IntegrationType,
      name: 'Zoom',
      description: 'Connect to Zoom meetings for real-time transcription',
      icon: Video,
      color: 'bg-blue-500',
      requiresConfig: true,
      configFields: [
        { key: 'apiKey', label: 'API Key', type: 'text' },
        { key: 'apiSecret', label: 'API Secret', type: 'password' }
      ]
    },
    {
      id: 'teams' as IntegrationType,
      name: 'Microsoft Teams',
      description: 'Join Teams calls with live intelligence',
      icon: Video,
      color: 'bg-purple-500',
      requiresConfig: true,
      configFields: [
        { key: 'tenantId', label: 'Tenant ID', type: 'text' },
        { key: 'clientId', label: 'Client ID', type: 'text' }
      ]
    },
    {
      id: 'meet' as IntegrationType,
      name: 'Google Meet',
      description: 'Real-time transcription for Google Meet',
      icon: Video,
      color: 'bg-green-500',
      requiresConfig: true,
      configFields: [
        { key: 'clientId', label: 'Client ID', type: 'text' },
        { key: 'apiKey', label: 'API Key', type: 'text' }
      ]
    },
    {
      id: 'manual' as IntegrationType,
      name: 'Manual Audio',
      description: 'Use your microphone for in-person meetings',
      icon: Phone,
      color: 'bg-gray-500',
      requiresConfig: false,
      configFields: []
    }
  ]

  const handleConnect = async (type: IntegrationType) => {
    setIsConnecting(true)
    setSelectedType(type)

    try {
      // Validate configuration if required
      const integration = integrations.find(i => i.id === type)
      if (integration?.requiresConfig) {
        const typeConfig = config[type]
        if (!typeConfig || Object.values(typeConfig).some(v => !v)) {
          toast.error('Please fill in all configuration fields')
          setIsConnecting(false)
          return
        }
      }

      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Call the callback
      onIntegrationSelect(type, config[type])
      
      toast.success(`Connected to ${integration?.name}`)
    } catch (error) {
      toast.error('Failed to connect. Please check your configuration.')
      console.error('Connection error:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleJoinWithUrl = async () => {
    if (!meetingUrl) {
      toast.error('Please enter a meeting URL')
      return
    }

    // Detect integration type from URL
    let type: IntegrationType = 'manual'
    if (meetingUrl.includes('zoom.us')) {
      type = 'zoom'
    } else if (meetingUrl.includes('teams.microsoft.com')) {
      type = 'teams'
    } else if (meetingUrl.includes('meet.google.com')) {
      type = 'meet'
    }

    setSelectedType(type)
    await handleConnect(type)
  }

  const updateConfig = (type: IntegrationType, key: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Quick Join */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Join</CardTitle>
          <CardDescription>
            Paste a meeting URL to automatically detect and join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="https://zoom.us/j/123456789 or meet.google.com/abc-defg-hij"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinWithUrl()}
            />
            <Button 
              onClick={handleJoinWithUrl}
              disabled={isConnecting || !meetingUrl}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Join
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon
          const isSelected = selectedType === integration.id
          const isConnected = currentIntegration === integration.id

          return (
            <Card 
              key={integration.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => !isConnecting && setSelectedType(integration.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${integration.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  {isConnected && (
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              {isSelected && integration.requiresConfig && (
                <CardContent className="space-y-4">
                  {integration.configFields.map((field) => (
                    <div key={field.key}>
                      <Label>{field.label}</Label>
                      <Input
                        type={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={config[integration.id]?.[field.key] || ''}
                        onChange={(e) => updateConfig(integration.id, field.key, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
                  
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConnect(integration.id)
                    }}
                    disabled={isConnecting}
                  >
                    {isConnecting && selectedType === integration.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect'
                    )}
                  </Button>
                </CardContent>
              )}
              
              {isSelected && !integration.requiresConfig && (
                <CardContent>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConnect(integration.id)
                    }}
                    disabled={isConnecting}
                  >
                    {isConnecting && selectedType === integration.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      'Start Recording'
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Calendar Integration */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Calendar className="h-5 w-5 inline mr-2" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your calendar to automatically join scheduled meetings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" disabled>
            Coming Soon
          </Button>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Alert>
        <AlertDescription>
          <strong>Pro tip:</strong> For best results, join meetings at the start. 
          HangJegyzet will capture all audio and provide real-time insights throughout.
        </AlertDescription>
      </Alert>
    </div>
  )
}