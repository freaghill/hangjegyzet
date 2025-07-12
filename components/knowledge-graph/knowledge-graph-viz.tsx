'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  Network, Users, FileText, Target, Lightbulb, CheckCircle,
  ZoomIn, ZoomOut, Maximize2, Filter, Download, RefreshCw,
  Building2
} from 'lucide-react'
import type { GraphNode, GraphLink, KnowledgeGraph } from '@/lib/knowledge-graph/graph-service'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

interface KnowledgeGraphVizProps {
  organizationId: string
}

export function KnowledgeGraphViz({ organizationId }: KnowledgeGraphVizProps) {
  const [graphData, setGraphData] = useState<KnowledgeGraph | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [filters, setFilters] = useState({
    showMeetings: true,
    showPeople: true,
    showTopics: true,
    showActionItems: true,
    showDecisions: true,
    minConnections: 1
  })
  const [graphSettings, setGraphSettings] = useState({
    nodeSize: 1,
    linkDistance: 50,
    chargeStrength: -300,
    centerForce: 0.05
  })
  const [viewMode, setViewMode] = useState<'organization' | 'person'>('organization')
  const [selectedPerson, setSelectedPerson] = useState<string>('')
  
  const graphRef = useRef<any>()

  useEffect(() => {
    loadGraphData()
  }, [organizationId, viewMode, selectedPerson, filters.minConnections])

  const loadGraphData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          viewMode,
          personIdentifier: selectedPerson,
          minConnections: filters.minConnections
        })
      })

      if (response.ok) {
        const data = await response.json()
        setGraphData(data)
      }
    } catch (error) {
      console.error('Error loading graph data:', error)
      toast.error('Tudásgráf betöltése sikertelen')
    } finally {
      setIsLoading(false)
    }
  }

  const getNodeColor = (node: GraphNode) => {
    switch (node.type) {
      case 'organization': return '#1f2937'
      case 'meeting': return '#3b82f6'
      case 'person': return '#10b981'
      case 'topic': return '#f59e0b'
      case 'action_item': return '#ef4444'
      case 'decision': return '#8b5cf6'
      default: return '#6b7280'
    }
  }

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'organization': return <Building2 className="w-4 h-4" />
      case 'meeting': return <FileText className="w-4 h-4" />
      case 'person': return <Users className="w-4 h-4" />
      case 'topic': return <Lightbulb className="w-4 h-4" />
      case 'action_item': return <Target className="w-4 h-4" />
      case 'decision': return <CheckCircle className="w-4 h-4" />
      default: return <Network className="w-4 h-4" />
    }
  }

  const getLinkColor = (link: GraphLink) => {
    switch (link.type) {
      case 'participated': return '#10b981'
      case 'assigned': return '#ef4444'
      case 'mentioned': return '#f59e0b'
      case 'decided': return '#8b5cf6'
      case 'created': return '#3b82f6'
      case 'related': return '#6b7280'
      default: return '#e5e7eb'
    }
  }

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    
    // Center on clicked node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000)
      graphRef.current.zoom(2, 1000)
    }
  }, [])

  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(1.5, 500)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(0.75, 500)
    }
  }

  const handleZoomFit = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(500)
    }
  }

  const exportGraph = () => {
    if (!graphRef.current) return
    
    const canvas = graphRef.current.scene()?.renderer?.domElement
    if (canvas) {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `knowledge-graph-${new Date().toISOString()}.png`
          a.click()
          URL.revokeObjectURL(url)
          toast.success('Gráf exportálva')
        }
      })
    }
  }

  const filteredGraphData = graphData ? {
    nodes: graphData.nodes.filter(node => {
      if (node.type === 'organization') return true
      if (node.type === 'meeting' && !filters.showMeetings) return false
      if (node.type === 'person' && !filters.showPeople) return false
      if (node.type === 'topic' && !filters.showTopics) return false
      if (node.type === 'action_item' && !filters.showActionItems) return false
      if (node.type === 'decision' && !filters.showDecisions) return false
      return true
    }),
    links: graphData.links.filter(link => {
      const sourceVisible = graphData.nodes.find(n => n.id === link.source && 
        (n.type === 'organization' ||
         (n.type === 'meeting' && filters.showMeetings) ||
         (n.type === 'person' && filters.showPeople) ||
         (n.type === 'topic' && filters.showTopics) ||
         (n.type === 'action_item' && filters.showActionItems) ||
         (n.type === 'decision' && filters.showDecisions)))
      
      const targetVisible = graphData.nodes.find(n => n.id === link.target && 
        (n.type === 'organization' ||
         (n.type === 'meeting' && filters.showMeetings) ||
         (n.type === 'person' && filters.showPeople) ||
         (n.type === 'topic' && filters.showTopics) ||
         (n.type === 'action_item' && filters.showActionItems) ||
         (n.type === 'decision' && filters.showDecisions)))
      
      return sourceVisible && targetVisible
    })
  } : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Tudásgráf vizualizáció</CardTitle>
          <CardDescription>
            Interaktív kapcsolati háló a meetingek, résztvevők és témák között
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList>
              <TabsTrigger value="organization">Szervezeti nézet</TabsTrigger>
              <TabsTrigger value="person">Személyi nézet</TabsTrigger>
            </TabsList>
            
            <TabsContent value="organization" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-meetings"
                    checked={filters.showMeetings}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, showMeetings: checked }))}
                  />
                  <Label htmlFor="show-meetings" className="text-sm cursor-pointer">
                    Meetingek
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-people"
                    checked={filters.showPeople}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, showPeople: checked }))}
                  />
                  <Label htmlFor="show-people" className="text-sm cursor-pointer">
                    Résztvevők
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-topics"
                    checked={filters.showTopics}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, showTopics: checked }))}
                  />
                  <Label htmlFor="show-topics" className="text-sm cursor-pointer">
                    Témák
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-actions"
                    checked={filters.showActionItems}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, showActionItems: checked }))}
                  />
                  <Label htmlFor="show-actions" className="text-sm cursor-pointer">
                    Feladatok
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-decisions"
                    checked={filters.showDecisions}
                    onCheckedChange={(checked) => setFilters(f => ({ ...f, showDecisions: checked }))}
                  />
                  <Label htmlFor="show-decisions" className="text-sm cursor-pointer">
                    Döntések
                  </Label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Minimum kapcsolatok: {filters.minConnections}</Label>
                <Slider
                  value={[filters.minConnections]}
                  onValueChange={([value]) => setFilters(f => ({ ...f, minConnections: value }))}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="person" className="space-y-4">
              <div className="space-y-2">
                <Label>Válasszon személyt</Label>
                <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon egy résztvevőt" />
                  </SelectTrigger>
                  <SelectContent>
                    {graphData?.nodes
                      .filter(n => n.type === 'person')
                      .map(person => (
                        <SelectItem key={person.id} value={person.name}>
                          {person.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleZoomFit}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={loadGraphData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={exportGraph}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Graph */}
      <Card>
        <CardContent className="p-0">
          <div className="relative h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {filteredGraphData && (
              <ForceGraph2D
                ref={graphRef}
                graphData={filteredGraphData}
                nodeId="id"
                nodeLabel="name"
                nodeVal={(node: GraphNode) => node.size * graphSettings.nodeSize}
                nodeColor={(node: GraphNode) => getNodeColor(node)}
                nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const label = node.name
                  const fontSize = 12 / globalScale
                  ctx.font = `${fontSize}px Sans-Serif`
                  const textWidth = ctx.measureText(label).width
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)

                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
                  ctx.fillRect(
                    node.x! - bckgDimensions[0] / 2,
                    node.y! - bckgDimensions[1] / 2,
                    bckgDimensions[0],
                    bckgDimensions[1]
                  )

                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillStyle = getNodeColor(node)
                  ctx.fillText(label, node.x!, node.y!)

                  return node
                }}
                nodeCanvasObjectMode={() => 'after'}
                linkColor={(link: GraphLink) => getLinkColor(link)}
                linkWidth={(link: GraphLink) => link.value}
                linkDirectionalParticles={(link: GraphLink) => link.value}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={handleNodeClick}
                onNodeHover={setHoveredNode}
                cooldownTicks={100}
                d3Force="link"
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
                enableZoomInteraction={true}
                enablePanInteraction={true}
              />
            )}
            
            {/* Node details */}
            {(hoveredNode || selectedNode) && (
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  {getNodeIcon((hoveredNode || selectedNode)!.type)}
                  <h3 className="font-semibold">{(hoveredNode || selectedNode)!.name}</h3>
                </div>
                <Badge variant="secondary" className="mb-2">
                  {(hoveredNode || selectedNode)!.type}
                </Badge>
                {(hoveredNode || selectedNode)!.metadata && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries((hoveredNode || selectedNode)!.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {graphData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{graphData.metadata.totalMeetings}</div>
              <p className="text-xs text-muted-foreground">Meetingek</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{filteredGraphData?.nodes.filter(n => n.type === 'person').length || 0}</div>
              <p className="text-xs text-muted-foreground">Résztvevők</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{graphData.metadata.totalTopics}</div>
              <p className="text-xs text-muted-foreground">Témák</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{graphData.metadata.totalActionItems}</div>
              <p className="text-xs text-muted-foreground">Feladatok</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}