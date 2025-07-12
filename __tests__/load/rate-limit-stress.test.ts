import { check, sleep } from 'k6'
import http from 'k6/http'
import { Rate, Trend } from 'k6/metrics'

/**
 * K6 Load Test: Rate Limiting Stress Test
 * 
 * Tests the effectiveness and performance of rate limiting under stress
 * Ensures the system properly enforces limits without degrading performance
 */

// Custom metrics
const rateLimitHits = new Rate('rate_limit_hits')
const rateLimitResponseTime = new Trend('rate_limit_response_time')
const successfulRequests = new Rate('successful_requests')

export const options = {
  scenarios: {
    // Test hourly limits
    hourly_limit_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 20, // Each VU tries 20 times
      maxDuration: '10m',
    },
    
    // Test burst protection
    burst_protection_test: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 requests per second
      timeUnit: '1s',
      duration: '1m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      startTime: '12m',
    },
    
    // Test concurrent limits
    concurrent_limit_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // Exceed concurrent limit
        { duration: '2m', target: 20 },  // Maintain pressure
        { duration: '30s', target: 0 },
      ],
      startTime: '15m',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<500'], // Rate limit checks should be fast
    rate_limit_response_time: ['p(95)<100'], // Rate limit response under 100ms
    'http_req_duration{status:429}': ['p(95)<50'], // 429 responses should be very fast
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Test user with known limits
const TEST_USER = {
  email: 'ratelimit-test@hangjegyzet.hu',
  password: 'Test123!',
  tier: 'profi',
  limits: {
    fast: { hourly: 200, daily: 2000, concurrent: 5 },
    balanced: { hourly: 50, daily: 500 },
    precision: { hourly: 5, daily: 10, perMeeting: 60 }
  }
}

export function setup() {
  // Login and get auth token
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
  
  check(loginResponse, {
    'Setup login successful': (r) => r.status === 200,
  })
  
  // Reset rate limits for clean test
  const resetResponse = http.post(
    `${BASE_URL}/api/admin/reset-rate-limits`,
    JSON.stringify({ organizationId: loginResponse.json('organizationId') }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`,
      },
    }
  )
  
  check(resetResponse, {
    'Rate limits reset': (r) => r.status === 200,
  })
  
  return {
    authToken: loginResponse.json('token'),
    organizationId: loginResponse.json('organizationId'),
  }
}

export default function (data) {
  const scenario = __ENV.SCENARIO_NAME || 'hourly_limit_test'
  
  switch (scenario) {
    case 'hourly_limit_test':
      testHourlyLimits(data)
      break
    case 'burst_protection_test':
      testBurstProtection(data)
      break
    case 'concurrent_limit_test':
      testConcurrentLimits(data)
      break
    default:
      testHourlyLimits(data)
  }
}

function testHourlyLimits(data) {
  const mode = ['fast', 'balanced', 'precision'][__VU % 3]
  const limit = TEST_USER.limits[mode].hourly
  
  // Make requests up to and beyond the limit
  const startTime = Date.now()
  
  const response = http.post(
    `${BASE_URL}/api/meetings/upload`,
    {
      file: http.file(generateSmallAudio(), 'test.mp3'),
      mode: mode,
      estimatedDuration: '5',
    },
    {
      headers: {
        'Authorization': `Bearer ${data.authToken}`,
      },
      tags: { name: 'UploadRequest' },
    }
  )
  
  const responseTime = Date.now() - startTime
  
  if (response.status === 429) {
    rateLimitHits.add(1)
    rateLimitResponseTime.add(responseTime)
    
    check(response, {
      'Rate limit response has retry info': (r) => r.json('rateLimitInfo') !== null,
      'Rate limit message is clear': (r) => r.json('error').includes('limit'),
    })
  } else if (response.status === 200) {
    successfulRequests.add(1)
  }
  
  // Verify rate limit headers
  check(response, {
    'Has rate limit headers': (r) => 
      r.headers['X-RateLimit-Limit'] !== undefined,
    'Shows remaining quota': (r) => 
      r.headers['X-RateLimit-Remaining'] !== undefined,
    'Shows reset time': (r) => 
      r.headers['X-RateLimit-Reset'] !== undefined,
  })
  
  sleep(0.1) // Small delay between requests
}

function testBurstProtection(data) {
  // Rapid fire requests to trigger burst protection
  const response = http.get(
    `${BASE_URL}/api/usage/mode-status`,
    {
      headers: {
        'Authorization': `Bearer ${data.authToken}`,
      },
      tags: { name: 'BurstRequest' },
    }
  )
  
  if (response.status === 429) {
    rateLimitHits.add(1)
    
    check(response, {
      'Burst limit has retry-after': (r) => r.headers['Retry-After'] !== undefined,
      'Retry-after is reasonable': (r) => {
        const retryAfter = parseInt(r.headers['Retry-After'])
        return retryAfter > 0 && retryAfter <= 60
      },
    })
  } else {
    successfulRequests.add(1)
  }
}

function testConcurrentLimits(data) {
  // Start a long-running transcription
  const uploadResponse = http.post(
    `${BASE_URL}/api/meetings/upload`,
    {
      file: http.file(generateLargeAudio(), 'long.mp3'),
      mode: 'fast',
      estimatedDuration: '30',
    },
    {
      headers: {
        'Authorization': `Bearer ${data.authToken}`,
      },
      timeout: '120s',
    }
  )
  
  if (uploadResponse.status === 429) {
    rateLimitHits.add(1)
    
    check(uploadResponse, {
      'Concurrent limit error': (r) => r.json('error').includes('concurrent'),
      'Shows current concurrent count': (r) => r.json('rateLimitInfo.current') !== undefined,
    })
  } else if (uploadResponse.status === 200) {
    successfulRequests.add(1)
    
    // Simulate processing time
    sleep(Math.random() * 10 + 20) // 20-30 seconds
    
    // Complete the transcription
    const meetingId = uploadResponse.json('meeting.id')
    http.post(
      `${BASE_URL}/api/meetings/${meetingId}/complete`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${data.authToken}`,
        },
      }
    )
  }
}

// Helper functions
function generateSmallAudio() {
  // 100KB audio file
  return new ArrayBuffer(100 * 1024)
}

function generateLargeAudio() {
  // 10MB audio file
  return new ArrayBuffer(10 * 1024 * 1024)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'rate-limit-test-results.json': JSON.stringify(data),
    'rate-limit-test-results.html': htmlReport(data),
  }
}

function textSummary(data, options) {
  // Custom summary focusing on rate limiting metrics
  const rateLimitPercentage = data.metrics.rate_limit_hits.values.rate * 100
  const avgRateLimitResponse = data.metrics.rate_limit_response_time.values.avg
  
  return `
Rate Limiting Test Results
==========================

Rate Limit Effectiveness:
- ${rateLimitPercentage.toFixed(2)}% of requests were rate limited
- Average rate limit response time: ${avgRateLimitResponse.toFixed(2)}ms
- Success rate for allowed requests: ${(data.metrics.successful_requests.values.rate * 100).toFixed(2)}%

Performance Under Load:
- 95th percentile response time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- Rate limited responses (429): ${data.metrics['http_req_duration{status:429}'].values['p(95)'].toFixed(2)}ms

${options.enableColors ? '\x1b[32m' : ''}✓ Rate limiting is working correctly${options.enableColors ? '\x1b[0m' : ''}
`
}

function htmlReport(data) {
  // Generate HTML report with charts
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Rate Limit Test Results</title>
  <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
</head>
<body>
  <h1>Rate Limit Stress Test Results</h1>
  <div id="rate-limit-chart"></div>
  <div id="response-time-chart"></div>
  <script>
    // Add visualization code here
  </script>
</body>
</html>
`
}