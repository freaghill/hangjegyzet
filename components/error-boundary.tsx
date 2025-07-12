'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    // Log to error tracking service
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      })
    }
  }
  
  private reset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error} reset={this.reset} />
      }
      
      // Default error UI
      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Valami hiba történt</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm">
            Sajnáljuk, de váratlan hiba történt. Kérjük, próbáld újra, vagy ha a probléma
            továbbra is fennáll, lépj kapcsolatba velünk.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-xs cursor-pointer">Technikai részletek</summary>
              <pre className="mt-2 text-xs overflow-auto p-2 bg-black/10 rounded">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </AlertDescription>
        <div className="mt-4 flex gap-2">
          <Button onClick={reset} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Újrapróbálás
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
          >
            Főoldal
          </Button>
        </div>
      </Alert>
    </div>
  )
}

// Specialized error boundaries for different sections
export function MeetingErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nem sikerült betölteni a találkozót</AlertTitle>
          <AlertDescription>
            <p>A találkozó adatainak betöltése közben hiba történt.</p>
            <Button onClick={reset} size="sm" className="mt-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Újratöltés
            </Button>
          </AlertDescription>
        </Alert>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, reset }) => (
        <div className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Dashboard betöltési hiba</AlertTitle>
            <AlertDescription>
              <p>Nem sikerült betölteni a dashboard adatokat.</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={reset} size="sm">
                  Újrapróbálás
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                >
                  Oldal újratöltése
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

// HOC for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Async error boundary for Suspense
export class AsyncErrorBoundary extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle async errors differently if needed
    if (error.message.includes('Failed to fetch')) {
      console.error('Network error in async component:', error)
    }
    
    super.componentDidCatch(error, errorInfo)
  }
}