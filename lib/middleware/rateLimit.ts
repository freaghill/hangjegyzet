import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create a rate limiter that allows 10 requests per 10 seconds
export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: 'hangjegyzet',
})

// Different rate limiters for different endpoints
export const apiLimiters = {
  // Transcription endpoint - expensive operation
  transcription: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    analytics: true,
    prefix: 'hangjegyzet:transcription',
  }),
  
  // Auth endpoints
  auth: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'hangjegyzet:auth',
  }),
  
  // General API
  api: new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'hangjegyzet:api',
  }),
}