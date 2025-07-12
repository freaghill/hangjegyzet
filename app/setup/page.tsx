'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export default function SetupPage() {
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<any>(null)

  const checkSetup = async () => {
    setIsChecking(true)
    const checks = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
                    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://xyzcompany.supabase.co',
      supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && 
                    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('fakekey'),
      appUrl: process.env.NEXT_PUBLIC_APP_URL === 'http://localhost:4000',
    }
    
    setResults(checks)
    setIsChecking(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>HangJegyzet Setup</CardTitle>
          <CardDescription>
            Welcome! Let's check your configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Setup Steps:</h3>
            
            <div className="space-y-2">
              <h4 className="font-medium">1. Create a Supabase Project</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                <li>Go to <a href="https://supabase.com" target="_blank" className="text-blue-600 hover:underline">supabase.com</a></li>
                <li>Create a free account and new project</li>
                <li>Wait for the project to initialize (~2 minutes)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">2. Get Your Credentials</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
                <li>In Supabase dashboard, go to Settings → API</li>
                <li>Copy the "Project URL" and "anon public" key</li>
                <li>Update your <code className="bg-gray-100 px-1 rounded">.env.local</code> file</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">3. Run Database Migrations</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm">
{`cd hangjegyzet-app
npx supabase db push`}
              </pre>
            </div>
          </div>

          <Button onClick={checkSetup} disabled={isChecking} className="w-full">
            {isChecking ? 'Checking...' : 'Check Configuration'}
          </Button>

          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {results.supabaseUrl ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm">
                  Supabase URL: {results.supabaseUrl ? 'Configured' : 'Using dummy value'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {results.supabaseKey ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm">
                  Supabase Key: {results.supabaseKey ? 'Configured' : 'Using dummy value'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {results.appUrl ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className="text-sm">
                  App URL: {results.appUrl ? 'Correct' : 'Check port configuration'}
                </span>
              </div>
            </div>
          )}

          {results && !results.supabaseUrl && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to configure Supabase to use the app. The current values are placeholders.
                Once configured, restart the server with: <code className="font-mono">npm run dev</code>
              </AlertDescription>
            </Alert>
          )}

          {results && results.supabaseUrl && results.supabaseKey && (
            <Alert className="border-green-600">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Great! Your configuration looks good. You can now{' '}
                <a href="/" className="text-blue-600 hover:underline">
                  go to the app
                </a>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}