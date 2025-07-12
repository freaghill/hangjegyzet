# Load Testing and Performance Optimization Guide

## Overview

This guide covers the comprehensive load testing infrastructure and performance optimization tools implemented for HangJegyzet.AI. The system is designed to identify bottlenecks, measure performance under various conditions, and provide actionable insights for optimization.

## Load Testing with k6

### Test Scenarios

We have four main load testing scenarios:

#### 1. Smoke Test (`npm run load-test:smoke`)
- **Purpose**: Basic functionality check
- **Duration**: 1 minute
- **Load**: 1 virtual user
- **Use**: Quick validation that system is working

```bash
npm run load-test:smoke
```

#### 2. Load Test (`npm run load-test:load`)
- **Purpose**: Normal production load simulation
- **Duration**: ~37 minutes
- **Load**: Ramps up to 100 users
- **Stages**:
  - 0 → 10 users (2 min)
  - 10 → 50 users (5 min)
  - 50 users steady (10 min)
  - 50 → 100 users (5 min)
  - 100 users steady (10 min)
  - 100 → 0 users (5 min)

```bash
npm run load-test:load
```

#### 3. Stress Test (`npm run load-test:stress`)
- **Purpose**: Find breaking point
- **Duration**: ~37 minutes
- **Load**: Ramps up to 500 users
- **Stages**: Gradual increase to find system limits

```bash
npm run load-test:stress
```

#### 4. Spike Test (`npm run load-test:spike`)
- **Purpose**: Test sudden traffic increases
- **Duration**: ~8 minutes
- **Pattern**: Normal → Spike → Normal → Recovery

```bash
npm run load-test:spike
```

### Running Tests

#### Individual Tests
```bash
# Run specific test
npm run load-test:smoke
npm run load-test:load
npm run load-test:stress
npm run load-test:spike
```

#### All Tests
```bash
# Run all tests sequentially
npm run load-test:all
```

#### With Custom Parameters
```bash
# Run with custom base URL
BASE_URL=https://staging.hangjegyzet.ai k6 run load-tests/scenarios/load-test.js

# Run with authentication token
API_TOKEN=your-token-here k6 run load-tests/scenarios/load-test.js

# Run with custom duration
k6 run --duration 10m load-tests/scenarios/load-test.js
```

### Understanding Results

#### Key Metrics
- **http_req_duration**: Response time percentiles (p50, p95, p99)
- **http_req_failed**: Percentage of failed requests
- **vus**: Number of virtual users
- **iterations**: Total completed test iterations

#### Success Criteria
- Error rate < 1% (normal load)
- p95 response time < 1s
- p99 response time < 2s
- No memory leaks during extended tests

### Test Reports

Reports are generated in the `reports/` directory:
- `smoke-test-summary.html` - Visual smoke test report
- `load-test-summary.json` - Detailed load test data
- `stress-test-summary.json` - Stress test results
- `spike-test-summary.json` - Spike test analysis

## Performance Monitoring

### Real-time Monitoring

The application includes built-in performance monitoring:

```typescript
import { performanceMonitor, measure } from '@/lib/performance/monitor'

// Measure async operation
const result = await measure('database_query', async () => {
  return await db.query('SELECT * FROM meetings')
})

// Get statistics
const stats = performanceMonitor.getStats('database_query')
console.log(`Average: ${stats.avgDuration}ms, p95: ${stats.p95}ms`)
```

### Resource Monitoring

Monitor CPU and memory usage:

```typescript
import { startResourceMonitoring, getMemoryUsage, getCpuUsage } from '@/lib/performance/monitor'

// Start monitoring (logs every minute)
startResourceMonitoring(60000)

// Get current usage
const memory = getMemoryUsage()
const cpu = getCpuUsage()
```

### Using Decorators

```typescript
import { measurePerformance } from '@/lib/performance/monitor'

class MeetingService {
  @measurePerformance('meeting_processing')
  async processMeeting(id: string) {
    // Method execution time is automatically tracked
  }
}
```

## Performance Analysis

### Running Analysis

```bash
# Analyze current performance
npm run performance:analyze

# Generate HTML/Markdown reports
npm run performance:report
```

### What Gets Analyzed

1. **Database Performance**
   - Slow queries (>500ms)
   - Missing indexes
   - Table sizes and growth
   - Query patterns and frequency

2. **API Performance**
   - Endpoint response times
   - Success rates
   - Slow endpoints (p95 > 1s)
   - Request patterns

3. **Load Test Results**
   - Error rates under load
   - Response time degradation
   - Breaking points
   - Recovery behavior

4. **System Resources**
   - Memory usage patterns
   - CPU utilization
   - Connection pool status

### Generated Reports

- `performance-analysis-{timestamp}.json` - Raw analysis data
- `performance-report.html` - Visual dashboard
- `performance-report.md` - Markdown summary

## Optimization Utilities

### 1. Request Deduplication

Prevent duplicate concurrent requests:

```typescript
import { deduplicateRequest } from '@/lib/performance/optimizations'

const userData = await deduplicateRequest(
  `user-${userId}`,
  async () => await fetchUserData(userId)
)
```

### 2. Batch Processing

Batch multiple operations for efficiency:

```typescript
import { BatchProcessor } from '@/lib/performance/optimizations'

const emailBatcher = new BatchProcessor(
  async (emails) => await sendBulkEmails(emails),
  { maxBatchSize: 100, maxWaitTime: 1000 }
)

// Individual calls are batched automatically
await emailBatcher.process(emailData)
```

### 3. Connection Pooling

Manage database connections efficiently:

```typescript
import { ConnectionPool } from '@/lib/performance/optimizations'

const dbPool = new ConnectionPool(
  async () => await createConnection(),
  async (conn) => await conn.close(),
  { min: 5, max: 20 }
)

const conn = await dbPool.acquire()
try {
  // Use connection
} finally {
  await dbPool.release(conn)
}
```

### 4. Query Optimization

```typescript
import { OptimizedQueryBuilder } from '@/lib/performance/database-optimizer'

const results = await new OptimizedQueryBuilder()
  .select('id', 'title', 'created_at')
  .from('meetings')
  .where('organization_id = $1')
  .orderBy('created_at', 'DESC')
  .limit(10)
  .execute<Meeting>()
```

## Common Performance Issues and Solutions

### 1. Slow Database Queries

**Symptoms**: High p95 latency, timeouts under load

**Solutions**:
```sql
-- Add missing indexes
CREATE INDEX idx_meetings_org_created 
ON meetings(organization_id, created_at DESC);

-- Optimize common queries
CREATE INDEX idx_transcripts_meeting_id 
ON transcripts(meeting_id) 
INCLUDE (content, created_at);
```

### 2. Memory Leaks

**Symptoms**: Increasing memory usage over time

**Solutions**:
```typescript
// Clear caches periodically
setInterval(() => {
  performanceMonitor.clear()
  globalCache.reset()
}, 3600000) // Every hour

// Properly cleanup resources
class Service {
  async cleanup() {
    this.listeners.forEach(l => l.remove())
    this.timers.forEach(t => clearInterval(t))
  }
}
```

### 3. API Bottlenecks

**Symptoms**: Slow endpoints, high CPU usage

**Solutions**:
```typescript
// Add caching
const cached = await cache.get(key)
if (cached) return cached

const result = await expensiveOperation()
await cache.set(key, result, 300) // 5 min TTL

// Implement pagination
const { data, pagination } = paginate(allResults, {
  page: query.page || 1,
  limit: Math.min(query.limit || 10, 100)
})
```

### 4. Concurrent Request Overload

**Symptoms**: Database connection exhaustion, timeouts

**Solutions**:
```typescript
// Rate limiting
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

// Request queuing
const queue = new Queue('api-requests', {
  concurrency: 10,
  maxQueueSize: 100
})
```

## Performance Checklist

### Before Deployment

- [ ] Run smoke test: `npm run load-test:smoke`
- [ ] Check for slow queries: `npm run performance:analyze`
- [ ] Review error rates in test results
- [ ] Verify memory usage is stable
- [ ] Ensure caching is configured
- [ ] Check database indexes are present

### Weekly Performance Review

- [ ] Run full load test suite
- [ ] Analyze performance trends
- [ ] Review slow query log
- [ ] Check for missing indexes
- [ ] Update capacity planning

### Optimization Priorities

1. **Database queries** - Biggest impact on user experience
2. **API response times** - Direct user-facing latency
3. **Background jobs** - Can cause resource contention
4. **Third-party APIs** - Often the slowest component
5. **Frontend bundle size** - Initial load performance

## Monitoring in Production

### Key Metrics to Track

```typescript
// Application metrics
- API response time (p50, p95, p99)
- Error rate by endpoint
- Database query time
- Cache hit rate
- Queue depth and processing time

// Infrastructure metrics
- CPU utilization
- Memory usage
- Disk I/O
- Network throughput
- Database connections
```

### Alert Thresholds

```yaml
alerts:
  - metric: api_response_time_p95
    threshold: 1000ms
    severity: warning
    
  - metric: error_rate
    threshold: 1%
    severity: critical
    
  - metric: memory_usage_percent
    threshold: 85%
    severity: warning
    
  - metric: database_connections
    threshold: 80% of max
    severity: critical
```

## Best Practices

### 1. Load Testing
- Run tests regularly (at least weekly)
- Test after significant changes
- Use realistic data volumes
- Test with production-like infrastructure
- Include think time in scripts

### 2. Performance Optimization
- Measure before optimizing
- Focus on user-facing metrics
- Optimize the critical path first
- Cache aggressively but intelligently
- Use database indexes effectively

### 3. Monitoring
- Set up proactive alerts
- Track trends, not just current values
- Correlate metrics with deployments
- Monitor both application and infrastructure
- Keep historical data for comparison

### 4. Capacity Planning
- Plan for 2x expected peak load
- Account for growth projections
- Consider seasonal variations
- Test failover scenarios
- Document scaling procedures

## Troubleshooting

### High Memory Usage
```bash
# Check for memory leaks
node --inspect server.js
# Use Chrome DevTools Memory Profiler

# Analyze heap dump
node --heapsnapshot server.js
```

### Slow Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 500;

-- Check current queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### API Timeouts
```typescript
// Add detailed logging
const timer = performanceMonitor.startTimer('api_call')
try {
  const result = await apiCall()
  timer()
} catch (error) {
  const duration = timer()
  log.error('API timeout', { duration, error })
}
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Web Performance](https://web.dev/performance/)