import { NextResponse } from 'next/server'

/**
 * GET /api/v1 - API documentation
 */
export async function GET() {
  return NextResponse.json({
    name: 'HangJegyzet API',
    version: '1.0.0',
    description: 'API for accessing meeting transcriptions and analytics',
    authentication: {
      type: 'Bearer token',
      header: 'Authorization',
      format: 'Bearer YOUR_API_KEY'
    },
    endpoints: {
      meetings: {
        list: {
          method: 'GET',
          path: '/api/v1/meetings',
          description: 'List all meetings',
          parameters: {
            page: 'Page number (default: 1)',
            limit: 'Items per page (max: 100, default: 20)',
            status: 'Filter by status (uploading, processing, completed, failed)',
            from: 'Filter by creation date (ISO 8601)',
            to: 'Filter by creation date (ISO 8601)'
          },
          permissions: ['meetings:read']
        },
        create: {
          method: 'POST',
          path: '/api/v1/meetings',
          description: 'Create a meeting from URL',
          body: {
            url: 'URL of the audio/video file (required)',
            title: 'Meeting title (optional)',
            language: 'Language code (default: hu)'
          },
          permissions: ['meetings:write']
        },
        get: {
          method: 'GET',
          path: '/api/v1/meetings/:id',
          description: 'Get meeting details',
          permissions: ['meetings:read']
        },
        delete: {
          method: 'DELETE',
          path: '/api/v1/meetings/:id',
          description: 'Delete a meeting',
          permissions: ['meetings:write']
        },
        transcript: {
          method: 'GET',
          path: '/api/v1/meetings/:id/transcript',
          description: 'Get meeting transcript',
          parameters: {
            format: 'Output format (json, text, srt) (default: json)'
          },
          permissions: ['transcripts:read']
        }
      },
      webhooks: {
        email: {
          method: 'POST',
          path: '/api/v1/webhooks/email',
          description: 'Process email attachments for transcription',
          note: 'Contact support for webhook configuration'
        }
      }
    },
    rate_limits: {
      default: '1000 requests per hour',
      note: 'Rate limits can be adjusted per API key'
    },
    support: {
      email: 'api@hangjegyzet.hu',
      documentation: 'https://docs.hangjegyzet.hu/api'
    }
  })
}