'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import { 
  Brain, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  Target,
  Users,
  Calendar,
  TrendingUp,
  Mail,
  Lightbulb,
  BarChart3,
  Copy,
  Download
} from 'lucide-react'

interface AIActionExtractorProps {
  meetingId: string
  onActionItemsExtracted?: (items: any[]) => void
}

export function AIActionExtractor({ meetingId, onActionItemsExtracted }: AIActionExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [settings, setSettings] = useState({
    useReasoning: true,
    includeContext: true,
    generateEmail: false,
    provider: 'openai' as 'openai' | 'anthropic'
  })

  const handleExtract = async () => {
    setIsExtracting(true)
    
    try {
      const response = await fetch(`/api/meetings/${meetingId}/ai/extract-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        throw new Error('Extraction failed')
      }
      
      const data = await response.json()
      setResults(data)
      
      if (onActionItemsExtracted && data.insights?.action_items) {
        onActionItemsExtracted(data.insights.action_items)
      }
      
      toast.success(`${data.stats.totalActionItems} akció pont kinyerve!`)
    } catch (error) {
      console.error('Extraction error:', error)
      toast.error('AI kinyerés sikertelen')
    } finally {
      setIsExtracting(false)
    }
  }

  const copyEmail = () => {
    if (results?.emailContent) {
      navigator.clipboard.writeText(results.emailContent)
      toast.success('Email tartalom másolva')
    }
  }

  const downloadResults = () => {
    if (results) {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-insights-${meetingId}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Eredmények letöltve')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'task': return <Target className="w-4 h-4" />
      case 'decision': return <CheckCircle className="w-4 h-4" />
      case 'follow-up': return <TrendingUp className="w-4 h-4" />
      case 'research': return <Lightbulb className="w-4 h-4" />
      case 'meeting': return <Calendar className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Action Item Extraction
          </CardTitle>
          <CardDescription>
            Intelligens akció pont és insight kinyerés a meeting átiratból
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Settings */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="reasoning" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Részletes elemzés reasoning-gel
              </Label>
              <Switch
                id="reasoning"
                checked={settings.useReasoning}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, useReasoning: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="context" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Korábbi meetingek kontextusa
              </Label>
              <Switch
                id="context"
                checked={settings.includeContext}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, includeContext: checked }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Follow-up email generálás
              </Label>
              <Switch
                id="email"
                checked={settings.generateEmail}
                onCheckedChange={(checked) => setSettings(s => ({ ...s, generateEmail: checked }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>AI Provider</Label>
              <RadioGroup value={settings.provider} onValueChange={(value: any) => setSettings(s => ({ ...s, provider: value }))}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="openai" id="openai" />
                  <Label htmlFor="openai">OpenAI GPT-4</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anthropic" id="anthropic" />
                  <Label htmlFor="anthropic">Anthropic Claude</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          
          <Button 
            onClick={handleExtract} 
            disabled={isExtracting}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                AI elemzés folyamatban...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Akció pontok kinyerése
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Kinyert eredmények</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyEmail} disabled={!results.emailContent}>
                  <Copy className="w-4 h-4 mr-2" />
                  Email másolás
                </Button>
                <Button size="sm" variant="outline" onClick={downloadResults}>
                  <Download className="w-4 h-4 mr-2" />
                  Letöltés
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{results.stats.totalActionItems}</p>
                <p className="text-sm text-gray-600">Akció pont</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{results.stats.validActionItems}</p>
                <p className="text-sm text-gray-600">Érvényes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{results.stats.qualityScore}%</p>
                <p className="text-sm text-gray-600">Minőség</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{results.stats.decisions}</p>
                <p className="text-sm text-gray-600">Döntés</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{results.stats.blockers}</p>
                <p className="text-sm text-gray-600">Blocker</p>
              </div>
            </div>
            
            <Tabs defaultValue="actions" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="actions">Akció pontok</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
                <TabsTrigger value="validation">Validáció</TabsTrigger>
                {results.emailContent && <TabsTrigger value="email">Email</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="actions" className="space-y-4">
                {results.insights.action_items.map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getCategoryIcon(item.category)}
                        <div>
                          <p className="font-medium">{item.text}</p>
                          {item.context && (
                            <p className="text-sm text-gray-600 mt-1">{item.context}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPriorityColor(item.priority)} text-white`}>
                          {item.priority === 'high' ? 'Sürgős' : item.priority === 'medium' ? 'Közepes' : 'Alacsony'}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(item.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {item.assignee && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {item.assignee}
                        </span>
                      )}
                      {item.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="insights" className="space-y-4">
                {results.insights.key_decisions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Döntések
                    </h4>
                    <ul className="space-y-1">
                      {results.insights.key_decisions.map((decision: string, i: number) => (
                        <li key={i} className="text-sm flex items-start">
                          <span className="text-green-600 mr-2">✓</span>
                          {decision}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.insights.blockers.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      Blockerek
                    </h4>
                    <ul className="space-y-1">
                      {results.insights.blockers.map((blocker: string, i: number) => (
                        <li key={i} className="text-sm flex items-start">
                          <span className="text-red-600 mr-2">⚠</span>
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.insights.metrics_kpis.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      Metrikák és KPI-k
                    </h4>
                    <div className="space-y-2">
                      {results.insights.metrics_kpis.map((kpi: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{kpi.metric}</span>
                          <div className="text-sm">
                            {kpi.value && <span className="font-mono">{kpi.value}</span>}
                            {kpi.target && <span className="text-gray-600 ml-2">→ {kpi.target}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="validation" className="space-y-4">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Minőségi pontszám</span>
                    <span className="text-sm font-bold">{results.validation.score}%</span>
                  </div>
                  <Progress value={results.validation.score} className="h-2" />
                </div>
                
                {results.validation.invalid.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {results.validation.invalid.length} akció pont validációs problémával
                    </AlertDescription>
                  </Alert>
                )}
                
                {results.validation.invalid.map((item: any, i: number) => (
                  <div key={i} className="border border-red-200 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">{item.item.text}</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {item.issues.map((issue: string, j: number) => (
                        <li key={j}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </TabsContent>
              
              {results.emailContent && (
                <TabsContent value="email">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div dangerouslySetInnerHTML={{ __html: results.emailContent }} />
                  </div>
                </TabsContent>
              )}
            </Tabs>
            
            {/* Reasoning */}
            {results.reasoning && (
              <Collapsible open={showReasoning} onOpenChange={setShowReasoning} className="mt-4">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showReasoning ? 'rotate-180' : ''}`} />
                  AI reasoning megtekintése
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 bg-gray-100 rounded-lg text-sm whitespace-pre-wrap">
                    {results.reasoning}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}