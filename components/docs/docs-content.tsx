'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Calendar,
  Edit,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocsContentProps {
  content: {
    title: string
    lastUpdated: string
    content: string
  }
}

export function DocsContent({ content }: DocsContentProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<boolean | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFeedback = (isHelpful: boolean) => {
    setHelpful(isHelpful)
    // Here you would send feedback to your analytics
    console.log('Feedback:', isHelpful ? 'helpful' : 'not helpful')
  }

  return (
    <article className="max-w-4xl">
      {/* Header */}
      <header className="mb-8 pb-8 border-b">
        <h1 className="text-4xl font-bold mb-4">{content.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Frissítve: {content.lastUpdated}</span>
          </div>
          <Button variant="ghost" size="sm" className="gap-1">
            <Edit className="h-3 w-3" />
            Szerkesztés
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown
          components={{
            // Custom heading renderer with anchor links
            h1: ({ children, ...props }) => {
              const id = children?.toString().toLowerCase().replace(/\s+/g, '-')
              return (
                <h1 id={id} className="group relative" {...props}>
                  {children}
                  <a
                    href={`#${id}`}
                    className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #
                  </a>
                </h1>
              )
            },
            h2: ({ children, ...props }) => {
              const id = children?.toString().toLowerCase().replace(/\s+/g, '-')
              return (
                <h2 id={id} className="group relative" {...props}>
                  {children}
                  <a
                    href={`#${id}`}
                    className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #
                  </a>
                </h2>
              )
            },
            h3: ({ children, ...props }) => {
              const id = children?.toString().toLowerCase().replace(/\s+/g, '-')
              return (
                <h3 id={id} className="group relative" {...props}>
                  {children}
                  <a
                    href={`#${id}`}
                    className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    #
                  </a>
                </h3>
              )
            },
            // Custom code block with copy button
            pre: ({ children, ...props }) => {
              const codeString = children?.props?.children?.toString() || ''
              const codeId = Math.random().toString(36).substr(2, 9)
              
              return (
                <div className="relative group">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto" {...props}>
                    {children}
                  </pre>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyToClipboard(codeString, codeId)}
                        >
                          {copied === codeId ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{copied === codeId ? 'Másolva!' : 'Másolás'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )
            },
            // Custom table with better styling
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto my-6">
                <table className="min-w-full divide-y divide-gray-200" {...props}>
                  {children}
                </table>
              </div>
            ),
            th: ({ children, ...props }) => (
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
                {children}
              </th>
            ),
            td: ({ children, ...props }) => (
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props}>
                {children}
              </td>
            ),
            // Custom blockquote
            blockquote: ({ children, ...props }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-700" {...props}>
                {children}
              </blockquote>
            ),
            // Custom links
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                {...props}
              >
                {children}
              </a>
            ),
          }}
        >
          {content.content}
        </ReactMarkdown>
      </div>

      {/* Feedback section */}
      <Card className="mt-12">
        <CardHeader>
          <CardTitle className="text-lg">Hasznos volt ez az oldal?</CardTitle>
        </CardHeader>
        <CardContent>
          {helpful === null ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(true)}
                className="gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                Igen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(false)}
                className="gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                Nem
              </Button>
            </div>
          ) : (
            <div className="text-sm text-green-600">
              Köszönjük a visszajelzést! 
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related articles */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Kapcsolódó cikkek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <a href="/docs/transcription" className="block text-sm text-blue-600 hover:text-blue-800">
              Átírás és feldolgozás →
            </a>
            <a href="/docs/collaboration" className="block text-sm text-blue-600 hover:text-blue-800">
              Csapatmunka funkciók →
            </a>
            <a href="/docs/integrations" className="block text-sm text-blue-600 hover:text-blue-800">
              Integrációk beállítása →
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Contact support */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            További segítségre van szüksége?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-3">
            Támogatási csapatunk készséggel áll rendelkezésére.
          </p>
          <Button size="sm">Kapcsolatfelvétel</Button>
        </CardContent>
      </Card>
    </article>
  )
}