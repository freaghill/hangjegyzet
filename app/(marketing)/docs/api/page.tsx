'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Code, Copy, Check, ChevronRight, Key, Globe, Shield } from 'lucide-react'
import { toast } from 'sonner'

const API_BASE_URL = 'https://api.hangjegyzet.ai/v1'

const codeExamples = {
  auth: {
    curl: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  ${API_BASE_URL}/meetings`,
    javascript: `const response = await fetch('${API_BASE_URL}/meetings', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});`,
    python: `import requests

response = requests.get(
  '${API_BASE_URL}/meetings',
  headers={'Authorization': 'Bearer YOUR_API_KEY'}
)`
  },
  createMeeting: {
    curl: `curl -X POST ${API_BASE_URL}/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@meeting.mp3" \\
  -F "title=Team Standup" \\
  -F "mode=balanced"`,
    javascript: `const formData = new FormData();
formData.append('file', file);
formData.append('title', 'Team Standup');
formData.append('mode', 'balanced');

const response = await fetch('${API_BASE_URL}/meetings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: formData
});`,
    python: `import requests

files = {'file': open('meeting.mp3', 'rb')}
data = {
  'title': 'Team Standup',
  'mode': 'balanced'
}

response = requests.post(
  '${API_BASE_URL}/meetings',
  headers={'Authorization': 'Bearer YOUR_API_KEY'},
  files=files,
  data=data
)`
  }
}

export default function APIDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('meetings')

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(id)
    toast.success('Kód vágólapra másolva')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const endpoints = [
    {
      id: 'meetings',
      method: 'GET',
      path: '/meetings',
      description: 'List all meetings'
    },
    {
      id: 'create-meeting',
      method: 'POST',
      path: '/meetings',
      description: 'Create new meeting'
    },
    {
      id: 'get-meeting',
      method: 'GET',
      path: '/meetings/{id}',
      description: 'Get meeting details'
    },
    {
      id: 'transcript',
      method: 'GET',
      path: '/meetings/{id}/transcript',
      description: 'Get transcript'
    },
    {
      id: 'summary',
      method: 'GET',
      path: '/meetings/{id}/summary',
      description: 'Get AI summary'
    },
    {
      id: 'usage',
      method: 'GET',
      path: '/usage',
      description: 'Get usage stats'
    },
    {
      id: 'webhooks',
      method: 'POST',
      path: '/webhooks',
      description: 'Create webhook'
    }
  ]

  const methodColors = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-4">BÉTA</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            API Dokumentáció
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Integrálja a HangJegyzet.AI képességeit saját alkalmazásába. 
            RESTful API teljes transcript és AI funkciókkal.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Gyors kezdés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    1. API kulcs beszerzése
                  </h4>
                  <p className="text-sm text-gray-600">
                    Jelentkezzen be és generáljon API kulcsot a beállításokban.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    2. Base URL
                  </h4>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {API_BASE_URL}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    3. Authentikáció
                  </h4>
                  <p className="text-sm text-gray-600">
                    Bearer token használata minden kéréshez.
                  </p>
                </div>

                <Button asChild className="w-full">
                  <a href="/dashboard/settings/api">API kulcs generálása</a>
                </Button>
              </CardContent>
            </Card>

            {/* Endpoints list */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Végpontok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {endpoints.map((endpoint) => (
                    <button
                      key={endpoint.id}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEndpoint === endpoint.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="secondary" 
                          className={methodColors[endpoint.method as keyof typeof methodColors]}
                        >
                          {endpoint.method}
                        </Badge>
                        <span className="text-sm font-mono">{endpoint.path}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {endpoint.description}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Authentication */}
            <Card>
              <CardHeader>
                <CardTitle>Authentikáció</CardTitle>
                <CardDescription>
                  Minden API kéréshez szükséges Bearer token authentikáció
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                    <TabsTrigger value="python">Python</TabsTrigger>
                  </TabsList>
                  
                  {Object.entries(codeExamples.auth).map(([lang, code]) => (
                    <TabsContent key={lang} value={lang}>
                      <div className="relative">
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                          <code>{code}</code>
                        </pre>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute top-2 right-2"
                          onClick={() => copyCode(code, `auth-${lang}`)}
                        >
                          {copiedCode === `auth-${lang}` ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Create Meeting Example */}
            <Card>
              <CardHeader>
                <CardTitle>Meeting létrehozása</CardTitle>
                <CardDescription>
                  Audio/video fájl feltöltése és feldolgozása
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Request</h4>
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <p className="text-sm">
                        <span className="font-mono">POST</span> /meetings
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Parameters</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <code>file*</code>
                        <span className="text-gray-600">Audio/video file (max 500MB)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <code>title</code>
                        <span className="text-gray-600">Meeting címe</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <code>mode</code>
                        <span className="text-gray-600">fast | balanced | precision</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <code>language</code>
                        <span className="text-gray-600">Nyelv kód (pl: hu, en)</span>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="curl" className="w-full">
                    <TabsList>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="python">Python</TabsTrigger>
                    </TabsList>
                    
                    {Object.entries(codeExamples.createMeeting).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="relative">
                          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{code}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="absolute top-2 right-2"
                            onClick={() => copyCode(code, `create-${lang}`)}
                          >
                            {copiedCode === `create-${lang}` ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  <div>
                    <h4 className="font-medium mb-2">Response</h4>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                      <code>{`{
  "id": "meet_1234567890",
  "title": "Team Standup",
  "status": "processing",
  "duration": null,
  "language": "hu",
  "createdAt": "2024-01-15T10:30:00Z",
  "estimatedCompletionTime": "2024-01-15T10:32:00Z"
}`}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
                <CardDescription>
                  API használati korlátok csomagok szerint
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Kezdő</p>
                      <p className="text-gray-600">60 kérés/óra</p>
                    </div>
                    <div>
                      <p className="font-medium">Professzionális</p>
                      <p className="text-gray-600">600 kérés/óra</p>
                    </div>
                    <div>
                      <p className="font-medium">Vállalati</p>
                      <p className="text-gray-600">6000 kérés/óra</p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Rate limit információk a response headerekben:</strong>
                    </p>
                    <ul className="text-sm mt-2 space-y-1">
                      <li><code>X-RateLimit-Limit</code> - Óránkénti limit</li>
                      <li><code>X-RateLimit-Remaining</code> - Hátralévő kérések</li>
                      <li><code>X-RateLimit-Reset</code> - Reset időpont</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SDKs */}
            <Card>
              <CardHeader>
                <CardTitle>SDK-k és példák</CardTitle>
                <CardDescription>
                  Hivatalos és közösségi kliensek
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Node.js SDK</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Hivatalos TypeScript/JavaScript kliens
                    </p>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      npm install @hangjegyzet/node
                    </code>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Python SDK</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Hivatalos Python kliens
                    </p>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      pip install hangjegyzet
                    </code>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <Button variant="outline" asChild>
                    <a href="https://github.com/hangjegyzet/node-sdk" target="_blank">
                      GitHub - Node.js
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://github.com/hangjegyzet/python-sdk" target="_blank">
                      GitHub - Python
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OpenAPI */}
            <Card>
              <CardHeader>
                <CardTitle>OpenAPI Specification</CardTitle>
                <CardDescription>
                  Teljes API dokumentáció OpenAPI 3.0 formátumban
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Töltse le a teljes API specifikációt Swagger/OpenAPI formátumban,
                    hogy automatikusan generáljon klienseket vagy tesztelje az API-t.
                  </p>
                  <div className="flex gap-4">
                    <Button asChild>
                      <a href="/api/docs" target="_blank">
                        <Code className="w-4 h-4 mr-2" />
                        OpenAPI JSON
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="https://petstore.swagger.io/?url=https://api.hangjegyzet.ai/docs" target="_blank">
                        Swagger UI
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}