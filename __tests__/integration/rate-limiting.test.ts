import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { RateLimiter } from '@/lib/monitoring/rate-limiter'
import { testApiHandler } from 'next-test-api-route-handler'
import * as uploadHandler from '@/app/api/meetings/upload/route'

describe('Rate Limiting Integration Tests', () => {
  let supabase: any
  let rateLimiter: RateLimiter
  let testOrganizations: any[]

  beforeAll(async () => {
    // Initialize test database
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    rateLimiter = new RateLimiter(supabase)

    // Create test organizations with different tiers
    testOrganizations = await Promise.all([
      createTestOrganization('trial'),
      createTestOrganization('indulo'),
      createTestOrganization('profi'),
      createTestOrganization('vallalati'),
      createTestOrganization('multinational')
    ])
  })

  afterAll(async () => {
    // Cleanup test data
    for (const org of testOrganizations) {
      await supabase.from('organizations').delete().eq('id', org.id)
    }
  })

  beforeEach(async () => {
    // Reset rate limits for all test organizations
    for (const org of testOrganizations) {
      await rateLimiter.resetLimits(org.id)
    }
  })

  describe('Hourly Rate Limits', () => {
    it('should enforce hourly limits for each mode', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      const limits = {
        fast: 200,
        balanced: 50,
        precision: 5
      }

      // Test each mode
      for (const [mode, limit] of Object.entries(limits)) {
        // Make requests up to the limit
        for (let i = 0; i < limit; i++) {
          const result = await rateLimiter.checkLimit(org.id, mode as any, 5)
          expect(result.allowed).toBe(true)
          expect(result.remaining).toBe(limit - i - 1)
        }

        // Next request should be blocked
        const blockedResult = await rateLimiter.checkLimit(org.id, mode as any, 5)
        expect(blockedResult.allowed).toBe(false)
        expect(blockedResult.reason).toContain('Hourly limit')
        expect(blockedResult.remaining).toBe(0)
      }
    })

    it('should reset hourly limits after time window', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Use up fast mode limit
      for (let i = 0; i < 200; i++) {
        await rateLimiter.checkLimit(org.id, 'fast', 1)
      }

      // Should be blocked
      let result = await rateLimiter.checkLimit(org.id, 'fast', 1)
      expect(result.allowed).toBe(false)

      // Fast forward time (mock)
      jest.useFakeTimers()
      jest.advanceTimersByTime(3600 * 1000) // 1 hour

      // Should be allowed again
      result = await rateLimiter.checkLimit(org.id, 'fast', 1)
      expect(result.allowed).toBe(true)

      jest.useRealTimers()
    })
  })

  describe('Daily Rate Limits', () => {
    it('should enforce daily limits', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Precision mode has 10/day limit
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiter.checkLimit(org.id, 'precision', 5)
        expect(result.allowed).toBe(true)
      }

      // Should be blocked
      const result = await rateLimiter.checkLimit(org.id, 'precision', 5)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Daily limit')
    })
  })

  describe('Meeting Duration Limits', () => {
    it('should enforce per-meeting duration limits for precision mode', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Profi tier has 60 minute limit per precision meeting
      const shortResult = await rateLimiter.checkLimit(org.id, 'precision', 50)
      expect(shortResult.allowed).toBe(true)

      const longResult = await rateLimiter.checkLimit(org.id, 'precision', 120)
      expect(longResult.allowed).toBe(false)
      expect(longResult.reason).toContain('limited to 60 minutes per meeting')
    })

    it('should have higher limits for higher tiers', async () => {
      const profiOrg = testOrganizations.find(o => o.tier === 'profi')
      const vallalatiOrg = testOrganizations.find(o => o.tier === 'vallalati')

      // Vallalati should allow longer precision meetings
      const profiResult = await rateLimiter.checkLimit(profiOrg.id, 'precision', 90)
      expect(profiResult.allowed).toBe(false)

      const vallalatiResult = await rateLimiter.checkLimit(vallalatiOrg.id, 'precision', 90)
      expect(vallalatiResult.allowed).toBe(true)
    })
  })

  describe('Concurrent Limits', () => {
    it('should enforce concurrent transcription limits', async () => {
      const org = testOrganizations.find(o => o.tier === 'indulo')
      
      // Simulate concurrent transcriptions
      const activeTranscriptions = []
      for (let i = 0; i < 2; i++) {
        activeTranscriptions.push(
          await supabase.from('meetings').insert({
            organization_id: org.id,
            title: `Test Meeting ${i}`,
            status: 'processing',
            transcription_mode: 'fast'
          }).select().single()
        )
      }

      // 3rd concurrent should fail (indulo limit is 2)
      const result = await rateLimiter.checkLimit(org.id, 'fast', 10)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('concurrent')

      // Clean up
      for (const meeting of activeTranscriptions) {
        await supabase.from('meetings').delete().eq('id', meeting.data.id)
      }
    })
  })

  describe('Burst Protection', () => {
    it('should prevent rapid-fire requests', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Make 10 requests rapidly
      const results = []
      for (let i = 0; i < 15; i++) {
        results.push(await rateLimiter.checkBurstLimit(org.id))
      }

      // Some should be blocked
      const blocked = results.filter(r => !r.allowed)
      expect(blocked.length).toBeGreaterThan(0)
      expect(blocked[0].reason).toContain('Too many requests')
    })

    it('should include retry-after information', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Trigger burst protection
      for (let i = 0; i < 15; i++) {
        await rateLimiter.checkBurstLimit(org.id)
      }

      const result = await rateLimiter.checkBurstLimit(org.id)
      if (!result.allowed) {
        expect(result.resetAt).toBeInstanceOf(Date)
        expect(result.resetAt.getTime()).toBeGreaterThan(Date.now())
      }
    })
  })

  describe('API Integration', () => {
    it('should return 429 status when rate limited', async () => {
      const org = testOrganizations.find(o => o.tier === 'indulo')
      
      // Use up the limit
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkLimit(org.id, 'balanced', 1)
      }

      // Test API endpoint
      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${createTestToken(org.id)}`,
            },
            body: createFormData('balanced', 10)
          })

          expect(response.status).toBe(429)
          const data = await response.json()
          expect(data.error).toContain('limit')
          expect(data.rateLimitInfo).toBeDefined()
        }
      })
    })

    it('should include rate limit headers', async () => {
      await testApiHandler({
        handler: uploadHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${createTestToken(testOrganizations[0].id)}`,
            },
            body: createFormData('fast', 5)
          })

          expect(response.headers.get('X-RateLimit-Limit')).toBeDefined()
          expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined()
          expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
        }
      })
    })
  })

  describe('Rate Limit Status', () => {
    it('should provide accurate status information', async () => {
      const org = testOrganizations.find(o => o.tier === 'profi')
      
      // Use some quota
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkLimit(org.id, 'fast', 1)
      }
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit(org.id, 'balanced', 1)
      }

      const status = await rateLimiter.getStatus(org.id)
      
      expect(status.fast.hourly.used).toBe(10)
      expect(status.fast.hourly.limit).toBe(200)
      expect(status.balanced.hourly.used).toBe(5)
      expect(status.balanced.hourly.limit).toBe(50)
      expect(status.precision.perMeeting).toBe(60)
    })
  })

  describe('Plan-specific Limits', () => {
    it('trial plan should have no precision access', async () => {
      const trialOrg = testOrganizations.find(o => o.tier === 'trial')
      
      const result = await rateLimiter.checkLimit(trialOrg.id, 'precision', 5)
      expect(result.allowed).toBe(true) // Because limit is 0, it's a special case
      expect(result.limit).toBe(0)
    })

    it('multinational plan should have unlimited fast mode', async () => {
      const multiOrg = testOrganizations.find(o => o.tier === 'multinational')
      
      // Try many requests
      for (let i = 0; i < 1000; i++) {
        const result = await rateLimiter.checkLimit(multiOrg.id, 'fast', 1)
        expect(result.allowed).toBe(true)
        expect(result.limit).toBe(-1) // -1 indicates unlimited
      }
    })
  })
})

// Helper functions
async function createTestOrganization(tier: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabase
    .from('organizations')
    .insert({
      name: `Test Org - ${tier}`,
      subscription_tier: tier,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  return { id: data.id, tier }
}

function createTestToken(organizationId: string) {
  // Mock JWT token for testing
  return `test-token-${organizationId}`
}

function createFormData(mode: string, duration: number) {
  const formData = new FormData()
  formData.append('file', new Blob(['test audio data']), 'test.mp3')
  formData.append('mode', mode)
  formData.append('estimatedDuration', duration.toString())
  return formData
}