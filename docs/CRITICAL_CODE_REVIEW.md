# Critical Code Review: HangJegyzet

## Executive Summary

**Overall Code Quality**: 7/10
**Production Readiness**: 6/10
**Security**: 7/10
**Main Concern**: Payment processing edge cases and real-time system reliability

## 🚨 Critical Issues (Fix Before Launch)

### 1. Payment System Race Conditions

**File**: `/app/api/webhooks/stripe/route.ts`

**Issue**: No idempotency handling for webhook events
```typescript
// Current code processes every webhook
await updateOrganizationSubscription(customer.metadata.organizationId, {
  stripe_subscription_id: session.subscription as string,
  stripe_customer_id: session.customer as string
})
```

**Fix**:
```typescript
// Add idempotency check
const eventId = event.id
const processed = await supabase
  .from('webhook_events')
  .select('id')
  .eq('event_id', eventId)
  .single()

if (processed.data) {
  return NextResponse.json({ received: true })
}

// Process event
await supabase.from('webhook_events').insert({ 
  event_id: eventId,
  type: event.type,
  processed_at: new Date().toISOString()
})
```

### 2. Usage Limits Not Atomic

**File**: `/lib/usage.ts`

**Issue**: Check and increment not atomic
```typescript
export async function checkLimit(mode: 'fast' | 'balanced' | 'precision') {
  const usage = await getCurrentUsage() // Race condition here!
  const limits = await getUsageLimits()
  
  if (usage[mode] >= limits[mode]) {
    return false
  }
  return true
}
```

**Fix**: Use database-level atomic operations
```typescript
// Use a stored procedure or transaction
const { data, error } = await supabase.rpc('increment_usage_if_allowed', {
  org_id: organizationId,
  mode: mode,
  amount: 1
})

if (error || !data) {
  throw new Error('Usage limit exceeded')
}
```

### 3. Memory Leak in WebSocket Manager

**File**: `/lib/realtime/websocket-manager.ts`

**Issue**: Message queue grows unbounded
```typescript
// Line 369-374
const queue = this.messageQueue.get(meetingId)!
queue.push(chunk)

// Keep only last 1000 messages
if (queue.length > 1000) {
  queue.shift() // Only removes one!
}
```

**Fix**:
```typescript
if (queue.length > 1000) {
  // Remove oldest messages to get back to limit
  queue.splice(0, queue.length - 1000)
}
```

### 4. SQL Injection Risk

**File**: `/app/api/admin/analytics/route.ts`

**Issue**: Dynamic query construction
```typescript
// Dangerous if dateRange comes from user input
const query = `
  SELECT * FROM meetings 
  WHERE created_at > '${dateRange.start}' 
  AND created_at < '${dateRange.end}'
`
```

**Fix**: Always use parameterized queries
```typescript
const { data } = await supabase
  .from('meetings')
  .select('*')
  .gte('created_at', dateRange.start)
  .lte('created_at', dateRange.end)
```

### 5. Missing Error Boundaries

**Issue**: Errors crash entire app sections
**Affected**: Meeting page, dashboard, admin panel

**Fix**: Add error boundaries
```typescript
// /components/error-boundary.tsx
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error }>
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Usage
export default withErrorBoundary(MeetingPage, MeetingErrorFallback)
```

## ⚠️ High Priority Issues

### 1. Subscription State Inconsistency

**Issue**: SimplePay and Stripe subscriptions handled differently
```typescript
// SimplePay updates subscription_tier directly
// Stripe only updates stripe_subscription_id
// This can lead to mismatched states
```

**Fix**: Centralize subscription management
```typescript
export async function updateSubscriptionState(
  organizationId: string,
  provider: 'stripe' | 'simplepay',
  data: SubscriptionUpdate
) {
  // Single source of truth for subscription updates
  // Handle both providers consistently
}
```

### 2. File Upload Size Limits

**File**: `/app/api/upload/route.ts`

**Issue**: No file size validation
```typescript
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  // No size check!
}
```

**Fix**:
```typescript
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: 'File too large' },
    { status: 413 }
  )
}
```

### 3. Missing Rate Limiting

**Issue**: APIs vulnerable to abuse
**Affected**: Transcription, AI analysis, exports

**Fix**: Implement rate limiting
```typescript
// /lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)
  
  if (!success) {
    throw new Error(`Rate limit exceeded. Try again in ${reset - Date.now()}ms`)
  }
  
  return { limit, remaining }
}
```

### 4. Webhook Authentication Weak

**File**: `/app/api/internal/webhook/route.ts`

**Issue**: Simple bearer token, no signatures
```typescript
if (authHeader !== `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Fix**: Use HMAC signatures
```typescript
import { createHmac } from 'crypto'

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  return signature === `sha256=${expectedSignature}`
}
```

## 🔒 Security Issues

### 1. API Keys Stored in Plain Text

**Issue**: API keys visible in database
**Table**: `api_keys`

**Fix**: Hash API keys
```typescript
import { randomBytes, createHash } from 'crypto'

export function generateApiKey() {
  const key = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(key).digest('hex')
  
  return {
    key: `hj_${key}`, // Only shown once
    hash // Store this in database
  }
}
```

### 2. CORS Too Permissive

**File**: `/app/api/[...]/route.ts`

**Issue**: CORS allows all origins in some endpoints

**Fix**: Restrict CORS
```typescript
const allowedOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  'https://hangjegyzet.hu',
  'https://app.hangjegyzet.hu'
].filter(Boolean)

if (!allowedOrigins.includes(origin)) {
  return new Response('CORS error', { status: 403 })
}
```

### 3. Missing Input Validation

**Issue**: Many endpoints trust client data

**Fix**: Add validation schemas
```typescript
import { z } from 'zod'

const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().min(1).max(480).optional()
})

export async function POST(request: Request) {
  const body = await request.json()
  const validated = createMeetingSchema.parse(body) // Throws if invalid
}
```

## 📊 Performance Issues

### 1. N+1 Query Problem

**File**: `/app/api/meetings/route.ts`

**Issue**: Fetching participants separately
```typescript
const meetings = await getMeetings(orgId)
for (const meeting of meetings) {
  meeting.participants = await getParticipants(meeting.id) // N+1!
}
```

**Fix**: Join in single query
```typescript
const meetings = await supabase
  .from('meetings')
  .select(`
    *,
    meeting_participants (
      user_id,
      profiles (name, email)
    )
  `)
  .eq('organization_id', orgId)
```

### 2. No Pagination

**Issue**: Loading all meetings at once
**Affected**: Dashboard, admin panel

**Fix**: Implement cursor pagination
```typescript
export async function getMeetings(cursor?: string, limit = 20) {
  let query = supabase
    .from('meetings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
    
  if (cursor) {
    query = query.lt('created_at', cursor)
  }
  
  return query
}
```

### 3. Large Bundle Size

**Issue**: Importing entire libraries
```typescript
import * as Sentry from '@sentry/nextjs' // Imports everything!
```

**Fix**: Use specific imports
```typescript
import { captureException } from '@sentry/nextjs'
```

## ✅ Positive Findings

1. **Good TypeScript usage** - Most types are properly defined
2. **Supabase RLS** - Row-level security properly configured
3. **Environment variables** - Sensitive data not hardcoded
4. **Error logging** - Sentry integration for monitoring
5. **Component structure** - Clean separation of concerns

## 🎯 Pre-Launch Checklist

### Must Fix (8-12 hours)
- [ ] Payment webhook idempotency
- [ ] Atomic usage limits
- [ ] WebSocket memory leak
- [ ] SQL injection prevention
- [ ] Add error boundaries

### Should Fix (12-16 hours)
- [ ] Rate limiting
- [ ] File size limits
- [ ] API key hashing
- [ ] Input validation
- [ ] Webhook signatures

### Nice to Have (16-24 hours)
- [ ] Performance optimizations
- [ ] Advanced caching
- [ ] Bundle size reduction
- [ ] Comprehensive logging
- [ ] A/B testing setup

## Recommendations

1. **Focus on payment reliability** - This is your revenue
2. **Add monitoring** - You can't fix what you can't see
3. **Test error paths** - Happy path works, but what about failures?
4. **Document edge cases** - Future you will thank you
5. **Set up alerts** - For payment failures, usage spikes, errors

## Overall Assessment

The codebase is generally well-structured but has several critical issues around payment processing, usage tracking, and system reliability. The real-time features are ambitious but need hardening for production use.

**Estimated time to production-ready**: 20-30 hours of focused work

**Biggest risk**: Payment processing edge cases causing revenue loss

**Quick win**: Add idempotency and atomic operations (4-6 hours, high impact)