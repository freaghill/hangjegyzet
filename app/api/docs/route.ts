import { NextResponse } from 'next/server'

const apiDocumentation = {
  openapi: '3.0.0',
  info: {
    title: 'HangJegyzet.AI API',
    version: '1.0.0',
    description: 'AI-powered meeting transcription and note-taking API',
    contact: {
      email: 'api@hangjegyzet.ai'
    }
  },
  servers: [
    {
      url: 'https://api.hangjegyzet.ai/v1',
      description: 'Production API'
    },
    {
      url: 'http://localhost:3000/api/v1',
      description: 'Development API'
    }
  ],
  security: [
    {
      bearerAuth: []
    }
  ],
  paths: {
    '/meetings': {
      get: {
        tags: ['Meetings'],
        summary: 'List all meetings',
        description: 'Get a paginated list of all meetings for the authenticated user',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Page number'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 },
            description: 'Items per page'
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' },
            description: 'Search in title and content'
          }
        ],
        responses: {
          200: {
            description: 'List of meetings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meetings: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Meeting' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Meetings'],
        summary: 'Create a new meeting',
        description: 'Upload an audio/video file to create a new meeting',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio or video file (max 500MB)'
                  },
                  title: {
                    type: 'string',
                    description: 'Meeting title'
                  },
                  mode: {
                    type: 'string',
                    enum: ['fast', 'balanced', 'precision'],
                    default: 'balanced',
                    description: 'Transcription mode'
                  },
                  language: {
                    type: 'string',
                    default: 'hu',
                    description: 'Primary language code'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Meeting created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Meeting' }
              }
            }
          }
        }
      }
    },
    '/meetings/{id}': {
      get: {
        tags: ['Meetings'],
        summary: 'Get meeting details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Meeting details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MeetingDetail' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Meetings'],
        summary: 'Delete a meeting',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: {
            description: 'Meeting deleted'
          }
        }
      }
    },
    '/meetings/{id}/transcript': {
      get: {
        tags: ['Meetings'],
        summary: 'Get meeting transcript',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'format',
            in: 'query',
            schema: { 
              type: 'string',
              enum: ['json', 'txt', 'srt', 'docx'],
              default: 'json'
            }
          }
        ],
        responses: {
          200: {
            description: 'Meeting transcript',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transcript' }
              },
              'text/plain': {
                schema: { type: 'string' }
              }
            }
          }
        }
      }
    },
    '/meetings/{id}/summary': {
      get: {
        tags: ['Meetings'],
        summary: 'Get AI-generated summary',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Meeting summary',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Summary' }
              }
            }
          }
        }
      }
    },
    '/meetings/{id}/export': {
      post: {
        tags: ['Meetings'],
        summary: 'Export meeting',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  format: {
                    type: 'string',
                    enum: ['pdf', 'docx', 'txt'],
                    default: 'pdf'
                  },
                  includeTranscript: {
                    type: 'boolean',
                    default: true
                  },
                  includeSummary: {
                    type: 'boolean',
                    default: true
                  },
                  includeActionItems: {
                    type: 'boolean',
                    default: true
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Export URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string' },
                    expiresAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/usage': {
      get: {
        tags: ['Account'],
        summary: 'Get usage statistics',
        responses: {
          200: {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Usage' }
              }
            }
          }
        }
      }
    },
    '/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        responses: {
          200: {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Webhook' }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['meeting.created', 'meeting.completed', 'meeting.failed']
                    }
                  },
                  secret: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Webhook created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Webhook' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Meeting: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          duration: { type: 'integer', description: 'Duration in seconds' },
          language: { type: 'string' },
          status: {
            type: 'string',
            enum: ['processing', 'completed', 'failed']
          },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time' }
        }
      },
      MeetingDetail: {
        allOf: [
          { $ref: '#/components/schemas/Meeting' },
          {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              keyPoints: {
                type: 'array',
                items: { type: 'string' }
              },
              actionItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    assignee: { type: 'string' },
                    dueDate: { type: 'string', format: 'date' }
                  }
                }
              },
              speakers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    duration: { type: 'integer' }
                  }
                }
              }
            }
          }
        ]
      },
      Transcript: {
        type: 'object',
        properties: {
          segments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                speaker: { type: 'string' },
                text: { type: 'string' },
                start: { type: 'number' },
                end: { type: 'number' },
                confidence: { type: 'number' }
              }
            }
          }
        }
      },
      Summary: {
        type: 'object',
        properties: {
          brief: { type: 'string' },
          detailed: { type: 'string' },
          keyPoints: {
            type: 'array',
            items: { type: 'string' }
          },
          decisions: {
            type: 'array',
            items: { type: 'string' }
          },
          nextSteps: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      Usage: {
        type: 'object',
        properties: {
          plan: { type: 'string' },
          credits: {
            type: 'object',
            properties: {
              used: { type: 'integer' },
              total: { type: 'integer' },
              remaining: { type: 'integer' }
            }
          },
          period: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date' },
              end: { type: 'string', format: 'date' }
            }
          }
        }
      },
      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: { type: 'string' }
          },
          active: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' }
        }
      }
    }
  }
}

export async function GET() {
  return NextResponse.json(apiDocumentation)
}