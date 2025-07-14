# 🚀 Backend & Performance Improvements for Hangjegyzet

## Executive Summary
The backend architecture is well-designed with advanced features like parallel transcription processing and AI insights. However, there are critical performance bottlenecks (N+1 queries, synchronous exports) and security gaps that need immediate attention.

---

## 1. Critical Performance Issues

### N+1 Query Problem
**Current Issue**: Multiple database queries for related data
```typescript
// ❌ Current problematic code pattern
const teams = await prisma.team.findMany({ where: { organizationId } })
for (const team of teams) {
  const members = await prisma.teamMember.findMany({ where: { teamId: team.id } })
  const meetings = await prisma.meeting.findMany({ where: { teamId: team.id } })
  // This results in 1 + 2N queries!
}
```

**Solution**: Use Prisma includes for eager loading
```typescript
// ✅ Optimized single query
const teams = await prisma.team.findMany({
  where: { organizationId },
  include: {
    members: {
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    },
    meetings: {
      where: { 
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        title: true,
        duration: true,
        status: true
      }
    },
    _count: {
      select: { meetings: true, members: true }
    }
  }
})
```

### Synchronous Export Blocking
**Current Issue**: PDF/Word generation blocks request thread
```typescript
// ❌ Blocking export
export async function POST(request: NextRequest) {
  const { meetingId, format } = await request.json()
  
  // This can take 30+ seconds for large meetings!
  const pdf = await generatePDF(meetingId)
  
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf' }
  })
}
```

**Solution**: Queue-based async processing
```typescript
// ✅ Non-blocking export with progress tracking
export async function POST(request: NextRequest) {
  const { meetingId, format } = await request.json()
  
  // Queue the job
  const job = await exportQueue.add('generate-export', {
    meetingId,
    format,
    userId: user.id
  })
  
  // Return immediately with job ID
  return NextResponse.json({
    jobId: job.id,
    status: 'processing',
    estimatedTime: calculateEstimatedTime(meetingId)
  })
}

// Status check endpoint
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  const job = await exportQueue.getJob(jobId)
  
  if (job.finishedOn) {
    const url = await getSignedUrl(job.returnvalue.filePath)
    return NextResponse.json({
      status: 'completed',
      downloadUrl: url,
      expiresAt: new Date(Date.now() + 3600000) // 1 hour
    })
  }
  
  return NextResponse.json({
    status: job.failedReason ? 'failed' : 'processing',
    progress: job.progress,
    error: job.failedReason
  })
}
```

---

## 2. Caching Strategy Enhancement

### Current Basic Cache
```typescript
// ❌ No stampede protection
const cached = await redis.get(key)
if (!cached) {
  const data = await expensiveQuery()
  await redis.setex(key, 3600, JSON.stringify(data))
  return data
}
```

### Enhanced Cache with Stampede Protection
```typescript
// ✅ Cache service with stampede protection
class CacheService {
  private locks = new Map<string, Promise<any>>()
  
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 3600, staleWhileRevalidate = 300 } = options
    
    // Try to get from cache
    const cached = await redis.get(key)
    if (cached) {
      const { data, expiry } = JSON.parse(cached)
      
      // Return fresh data
      if (Date.now() < expiry) {
        return data
      }
      
      // Return stale data while revalidating
      if (Date.now() < expiry + staleWhileRevalidate * 1000) {
        this.revalidateInBackground(key, factory, ttl)
        return data
      }
    }
    
    // Prevent stampede with lock
    const existingLock = this.locks.get(key)
    if (existingLock) {
      return existingLock
    }
    
    const promise = this.loadAndCache(key, factory, ttl)
    this.locks.set(key, promise)
    
    try {
      return await promise
    } finally {
      this.locks.delete(key)
    }
  }
  
  private async loadAndCache<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const data = await factory()
    const cacheData = {
      data,
      expiry: Date.now() + ttl * 1000
    }
    
    await redis.setex(key, ttl + 300, JSON.stringify(cacheData))
    return data
  }
  
  private async revalidateInBackground<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    // Fire and forget
    this.loadAndCache(key, factory, ttl).catch(console.error)
  }
}

// Usage
const cache = new CacheService()

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId')
  
  const stats = await cache.getOrSet(
    `org-stats:${orgId}`,
    async () => {
      // Expensive query
      return prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: {
            select: {
              meetings: true,
              members: true,
              teams: true
            }
          },
          meetings: {
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
            select: {
              duration: true,
              status: true
            }
          }
        }
      })
    },
    { ttl: 300, staleWhileRevalidate: 60 }
  )
  
  return NextResponse.json(stats)
}
```

---

## 3. Queue System Improvements

### Enhanced Queue Configuration
```typescript
// lib/queue/config.ts
import Bull from 'bull'
import Redis from 'ioredis'

const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
})

// Queue factory with standard configuration
export function createQueue<T>(name: string, options: QueueOptions = {}) {
  return new Bull<T>(name, {
    redis: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 1000,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      ...options.defaultJobOptions
    }
  })
}

// Specialized queues
export const transcriptionQueue = createQueue('transcription', {
  defaultJobOptions: {
    attempts: 5,
    timeout: 300000 // 5 minutes
  }
})

export const exportQueue = createQueue('export', {
  defaultJobOptions: {
    attempts: 3,
    timeout: 120000 // 2 minutes
  }
})

export const notificationQueue = createQueue('notification', {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'fixed',
      delay: 5000
    }
  }
})

// Job deduplication middleware
export function withDeduplication<T>(
  queue: Bull.Queue<T>,
  getKey: (data: T) => string
) {
  queue.on('waiting', async (jobId) => {
    const job = await queue.getJob(jobId)
    if (!job) return
    
    const dedupKey = getKey(job.data)
    const existingJobId = await redis.get(`dedup:${dedupKey}`)
    
    if (existingJobId && existingJobId !== jobId) {
      await job.remove()
      console.log(`Removed duplicate job ${jobId}, keeping ${existingJobId}`)
      return
    }
    
    await redis.setex(`dedup:${dedupKey}`, 3600, jobId)
  })
}

// Apply deduplication
withDeduplication(transcriptionQueue, (data) => `${data.meetingId}:${data.mode}`)
```

---

## 4. Database Query Optimization

### Query Performance Monitor
```typescript
// lib/prisma/performance.ts
import { Prisma } from '@prisma/client'

export function withQueryLogging(prisma: any) {
  prisma.$use(async (params: any, next: any) => {
    const before = Date.now()
    const result = await next(params)
    const after = Date.now()
    const duration = after - before
    
    // Log slow queries
    if (duration > 100) {
      console.warn(`Slow query detected (${duration}ms):`, {
        model: params.model,
        action: params.action,
        duration
      })
      
      // Send to monitoring
      await trackMetric('db.query.slow', 1, {
        model: params.model,
        action: params.action,
        duration
      })
    }
    
    return result
  })
}

// Query optimization helpers
export const queryOptimizations = {
  // Batch loading to prevent N+1
  async batchLoad<T, K>(
    ids: K[],
    loader: (ids: K[]) => Promise<T[]>,
    getKey: (item: T) => K
  ): Promise<Map<K, T>> {
    const items = await loader(ids)
    return new Map(items.map(item => [getKey(item), item]))
  },
  
  // Cursor-based pagination
  async paginate<T>(
    model: any,
    options: {
      cursor?: string
      take?: number
      where?: any
      orderBy?: any
    }
  ): Promise<{ items: T[]; nextCursor?: string }> {
    const { cursor, take = 20, where, orderBy = { id: 'desc' } } = options
    
    const items = await model.findMany({
      take: take + 1,
      where: cursor ? { ...where, id: { lt: cursor } } : where,
      orderBy
    })
    
    const hasMore = items.length > take
    const nextCursor = hasMore ? items[take - 1].id : undefined
    
    return {
      items: items.slice(0, take),
      nextCursor
    }
  }
}
```

---

## 5. File Upload & Processing Enhancements

### Secure File Validation
```typescript
// lib/upload/validation.ts
import { fileTypeFromBuffer } from 'file-type'
import { createHash } from 'crypto'

export class FileValidator {
  private static readonly ALLOWED_TYPES = new Set([
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/ogg',
    'audio/webm'
  ])
  
  private static readonly MAX_SIZE = 2 * 1024 * 1024 * 1024 // 2GB
  
  static async validate(buffer: Buffer, clientMimeType: string): Promise<ValidationResult> {
    // Verify actual file type
    const fileType = await fileTypeFromBuffer(buffer)
    if (!fileType || !this.ALLOWED_TYPES.has(fileType.mime)) {
      return {
        valid: false,
        error: 'Invalid file type. Only audio files are allowed.'
      }
    }
    
    // Verify size
    if (buffer.length > this.MAX_SIZE) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${this.MAX_SIZE / (1024 * 1024 * 1024)}GB.`
      }
    }
    
    // Generate hash for deduplication
    const hash = createHash('sha256').update(buffer).digest('hex')
    
    return {
      valid: true,
      mimeType: fileType.mime,
      extension: fileType.ext,
      size: buffer.length,
      hash
    }
  }
  
  static async checkDuplicate(hash: string): Promise<string | null> {
    const existing = await prisma.file.findFirst({
      where: { hash },
      select: { id: true }
    })
    
    return existing?.id || null
  }
}

// Usage in upload endpoint
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  
  const buffer = Buffer.from(await file.arrayBuffer())
  const validation = await FileValidator.validate(buffer, file.type)
  
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }
  
  // Check for duplicate
  const existingId = await FileValidator.checkDuplicate(validation.hash!)
  if (existingId) {
    return NextResponse.json({
      id: existingId,
      duplicate: true
    })
  }
  
  // Process new file...
}
```

---

## 6. Webhook Security

### Secure Webhook Handler
```typescript
// lib/webhooks/security.ts
import { createHmac, timingSafeEqual } from 'crypto'

export class WebhookSecurity {
  static generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }
  
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expected = this.generateSignature(payload, secret)
    const actual = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    
    return actual.length === expectedBuffer.length &&
      timingSafeEqual(actual, expectedBuffer)
  }
  
  static verifyTimestamp(timestamp: number, maxAge = 300): boolean {
    const now = Math.floor(Date.now() / 1000)
    return Math.abs(now - timestamp) <= maxAge
  }
}

// Webhook middleware
export function withWebhookAuth(
  handler: (req: NextRequest, payload: any) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const signature = req.headers.get('x-webhook-signature')
    const timestamp = req.headers.get('x-webhook-timestamp')
    
    if (!signature || !timestamp) {
      return NextResponse.json(
        { error: 'Missing webhook headers' },
        { status: 401 }
      )
    }
    
    // Verify timestamp
    if (!WebhookSecurity.verifyTimestamp(parseInt(timestamp))) {
      return NextResponse.json(
        { error: 'Request too old' },
        { status: 401 }
      )
    }
    
    // Verify signature
    const body = await req.text()
    const secret = process.env.WEBHOOK_SECRET!
    
    if (!WebhookSecurity.verifySignature(body, signature, secret)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    const payload = JSON.parse(body)
    return handler(req, payload)
  }
}
```

---

## 7. Performance Monitoring

### Application Performance Monitoring
```typescript
// lib/monitoring/apm.ts
export class APM {
  private static timers = new Map<string, number>()
  
  static startTimer(label: string): void {
    this.timers.set(label, Date.now())
  }
  
  static endTimer(label: string, metadata?: Record<string, any>): number {
    const start = this.timers.get(label)
    if (!start) return 0
    
    const duration = Date.now() - start
    this.timers.delete(label)
    
    // Send to monitoring service
    trackMetric(`performance.${label}`, duration, metadata)
    
    return duration
  }
  
  static async measure<T>(
    label: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTimer(label)
    try {
      const result = await fn()
      return result
    } finally {
      this.endTimer(label, metadata)
    }
  }
}

// Usage
export async function POST(request: NextRequest) {
  return APM.measure('api.transcription.create', async () => {
    const { meetingId } = await request.json()
    
    const meeting = await APM.measure('db.meeting.fetch', () =>
      prisma.meeting.findUnique({ where: { id: meetingId } })
    )
    
    const job = await APM.measure('queue.transcription.add', () =>
      transcriptionQueue.add('process', { meetingId })
    )
    
    return NextResponse.json({ jobId: job.id })
  }, { meetingId })
}
```

---

## Implementation Priority

### Critical (This Week)
1. Fix SQL injection vulnerabilities
2. Implement N+1 query fixes
3. Add webhook signature verification
4. Move exports to async queue

### High (Next 2 Weeks)
1. Implement cache stampede protection
2. Add job deduplication
3. Enhance file validation
4. Add query performance monitoring

### Medium (This Month)
1. Implement APM system
2. Add database query optimization
3. Enhance queue error handling
4. Implement data partitioning

---

## Testing Checklist

- [ ] Load test with 100+ concurrent users
- [ ] Test queue processing under high load
- [ ] Verify cache behavior during traffic spikes
- [ ] Test webhook security with invalid signatures
- [ ] Benchmark query performance improvements
- [ ] Test file upload with malicious files
- [ ] Verify export generation doesn't block