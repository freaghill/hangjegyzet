import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/admin'
import { redisClients } from '@/lib/cache/redis-sentinel'
import { getQueueHealth } from '@/lib/queue/health'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/cache/redis-sentinel')
jest.mock('@/lib/queue/health')

describe('Health Check API', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should return healthy status when all services are up', async () => {
    // Mock healthy database
    mockSupabase.single.mockResolvedValue({ data: { id: 1 }, error: null })

    // Mock healthy Redis
    ;(redisClients.cache.ping as jest.Mock).mockResolvedValue('PONG')
    ;(redisClients.queue.ping as jest.Mock).mockResolvedValue('PONG')

    // Mock healthy queues
    ;(getQueueHealth as jest.Mock).mockResolvedValue({
      healthy: true,
      queues: {
        transcription: { active: 5, waiting: 10, completed: 100, failed: 2 },
        'ai-processing': { active: 2, waiting: 5, completed: 50, failed: 1 },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
    expect(data.checks.database.status).toBe('healthy')
    expect(data.checks.redis.status).toBe('healthy')
    expect(data.checks.queues.status).toBe('healthy')
    expect(data.checks.storage.status).toBe('healthy')
  })

  it('should return degraded status when some services are down', async () => {
    // Mock database error
    mockSupabase.single.mockResolvedValue({ data: null, error: 'Connection failed' })

    // Mock healthy Redis
    ;(redisClients.cache.ping as jest.Mock).mockResolvedValue('PONG')
    ;(redisClients.queue.ping as jest.Mock).mockResolvedValue('PONG')

    // Mock healthy queues
    ;(getQueueHealth as jest.Mock).mockResolvedValue({ healthy: true })

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.checks.database.status).toBe('unhealthy')
    expect(data.checks.redis.status).toBe('healthy')
  })

  it('should handle detailed health check request', async () => {
    mockSupabase.single.mockResolvedValue({ data: { id: 1 }, error: null })
    ;(redisClients.cache.ping as jest.Mock).mockResolvedValue('PONG')
    ;(redisClients.queue.ping as jest.Mock).mockResolvedValue('PONG')
    ;(getQueueHealth as jest.Mock).mockResolvedValue({
      healthy: true,
      queues: {
        transcription: { active: 5, waiting: 10, completed: 100, failed: 2 },
      },
    })

    const request = new NextRequest('http://localhost:3000/api/health?detailed=true')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.checks.queues.details).toBeDefined()
    expect(data.checks.queues.details.transcription).toBeDefined()
    expect(data.environment).toBeDefined()
    expect(data.uptime).toBeDefined()
  })

  it('should timeout gracefully', async () => {
    // Mock slow database
    mockSupabase.single.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'Timeout' }), 6000))
    )

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('degraded')
    expect(data.message).toContain('timeout')
  }, 10000)

  it('should check external service health', async () => {
    mockSupabase.single.mockResolvedValue({ data: { id: 1 }, error: null })
    ;(redisClients.cache.ping as jest.Mock).mockResolvedValue('PONG')
    ;(redisClients.queue.ping as jest.Mock).mockResolvedValue('PONG')
    ;(getQueueHealth as jest.Mock).mockResolvedValue({ healthy: true })

    // Mock external service checks
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('openai')) {
        return Promise.resolve({ ok: true, status: 200 })
      }
      if (url.includes('supabase')) {
        return Promise.resolve({ ok: true, status: 200 })
      }
      return Promise.resolve({ ok: false, status: 503 })
    })

    const request = new NextRequest('http://localhost:3000/api/health?detailed=true')
    const response = await GET(request)
    const data = await response.json()

    expect(data.checks.external_services).toBeDefined()
    expect(data.checks.external_services.openai).toBe('healthy')
    expect(data.checks.external_services.supabase).toBe('healthy')
  })
})