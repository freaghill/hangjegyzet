import { check, sleep } from 'k6'
import http from 'k6/http'
import { Rate } from 'k6/metrics'
import { SharedArray } from 'k6/data'

/**
 * K6 Load Testing Script for Concurrent Transcriptions
 * 
 * Tests the system's ability to handle multiple concurrent transcription requests
 * across different modes and subscription tiers.
 * 
 * Run with: k6 run __tests__/load/concurrent-transcriptions.test.ts
 */

// Custom metrics
const errorRate = new Rate('errors')
const rateLimitRate = new Rate('rate_limits')
const successRate = new Rate('successful_transcriptions')

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up
    gradual_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Ramp up to 10 users
        { duration: '5m', target: 10 }, // Stay at 10 users
        { duration: '2m', target: 20 }, // Ramp up to 20 users
        { duration: '5m', target: 20 }, // Stay at 20 users
        { duration: '2m', target: 0 },  // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    
    // Scenario 2: Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 }, // Spike to 50 users
        { duration: '1m', target: 50 },  // Hold
        { duration: '10s', target: 0 },  // Drop
      ],
      gracefulRampDown: '10s',
      startTime: '20m', // Start after gradual load test
    },
    
    // Scenario 3: Sustained load per mode
    fast_mode_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '10m',
      env: { MODE: 'fast' },
      startTime: '25m',
    },
    
    balanced_mode_load: {
      executor: 'constant-vus',
      vus: 3,
      duration: '10m',
      env: { MODE: 'balanced' },
      startTime: '25m',
    },
    
    precision_mode_load: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10m',
      env: { MODE: 'precision' },
      startTime: '25m',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests under 3s
    errors: ['rate<0.1'], // Error rate under 10%
    rate_limits: ['rate<0.2'], // Rate limit hits under 20%
    successful_transcriptions: ['rate>0.8'], // Success rate over 80%
  },
}

// Test data
const testUsers = new SharedArray('users', function () {
  return [
    { email: 'test1@hangjegyzet.hu', password: 'Test123!', tier: 'indulo' },
    { email: 'test2@hangjegyzet.hu', password: 'Test123!', tier: 'profi' },
    { email: 'test3@hangjegyzet.hu', password: 'Test123!', tier: 'vallalati' },
    { email: 'test4@hangjegyzet.hu', password: 'Test123!', tier: 'multinational' },
  ]
})

const audioFiles = new SharedArray('audio', function () {
  return [
    { name: 'short.mp3', size: 2 * 1024 * 1024, duration: 120 }, // 2MB, 2 min
    { name: 'medium.mp3', size: 10 * 1024 * 1024, duration: 600 }, // 10MB, 10 min
    { name: 'long.mp3', size: 50 * 1024 * 1024, duration: 3000 }, // 50MB, 50 min
  ]
})

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export function setup() {
  // Setup test data if needed
  console.log('Setting up test environment...')
  
  // Reset rate limits for test users
  testUsers.forEach(user => {
    const resetResponse = http.post(
      `${BASE_URL}/api/admin/reset-rate-limits`,
      JSON.stringify({ email: user.email }),
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
  })
}

export default function () {
  // Select random user and audio file
  const user = testUsers[Math.floor(Math.random() * testUsers.length)]
  const audio = audioFiles[Math.floor(Math.random() * audioFiles.length)]
  const mode = __ENV.MODE || ['fast', 'balanced', 'precision'][Math.floor(Math.random() * 3)]
  
  // Step 1: Login
  const loginResponse = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
  
  const loginSuccess = check(loginResponse, {
    'Login successful': (r) => r.status === 200,
  })
  
  if (!loginSuccess) {
    errorRate.add(1)
    return
  }
  
  const authToken = loginResponse.json('token')
  
  // Step 2: Check mode availability
  const availabilityResponse = http.get(
    `${BASE_URL}/api/usage/mode-status`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  )
  
  check(availabilityResponse, {
    'Mode status retrieved': (r) => r.status === 200,
  })
  
  const modeStatus = availabilityResponse.json(`modeStatus.#(mode="${mode}")`)
  if (!modeStatus || !modeStatus.available) {
    console.log(`Mode ${mode} not available for user ${user.email}`)
    return
  }
  
  // Step 3: Upload and transcribe
  const formData = {
    file: http.file(generateAudioData(audio.size), audio.name),
    mode: mode,
    estimatedDuration: audio.duration.toString(),
  }
  
  const uploadResponse = http.post(
    `${BASE_URL}/api/meetings/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      timeout: '60s',
    }
  )
  
  const uploadCheck = check(uploadResponse, {
    'Upload successful': (r) => r.status === 200,
    'Not rate limited': (r) => r.status !== 429,
  })
  
  if (uploadResponse.status === 429) {
    rateLimitRate.add(1)
    console.log(`Rate limited: ${uploadResponse.json('error')}`)
    sleep(5) // Back off for 5 seconds
    return
  }
  
  if (!uploadCheck || uploadResponse.status !== 200) {
    errorRate.add(1)
    console.log(`Upload failed: ${uploadResponse.status} - ${uploadResponse.body}`)
    return
  }
  
  const meetingId = uploadResponse.json('meeting.id')
  
  // Step 4: Poll for completion
  let completed = false
  let attempts = 0
  const maxAttempts = 60 // 5 minutes max
  
  while (!completed && attempts < maxAttempts) {
    sleep(5) // Check every 5 seconds
    
    const statusResponse = http.get(
      `${BASE_URL}/api/meetings/${meetingId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    )
    
    if (statusResponse.status === 200) {
      const status = statusResponse.json('status')
      if (status === 'completed') {
        completed = true
        successRate.add(1)
        console.log(`Transcription completed: ${meetingId} (${mode} mode)`)
      } else if (status === 'failed') {
        errorRate.add(1)
        console.log(`Transcription failed: ${meetingId}`)
        break
      }
    }
    
    attempts++
  }
  
  if (!completed && attempts >= maxAttempts) {
    errorRate.add(1)
    console.log(`Transcription timeout: ${meetingId}`)
  }
  
  // Step 5: Verify usage was tracked
  if (completed) {
    const usageResponse = http.get(
      `${BASE_URL}/api/usage/mode-status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    )
    
    check(usageResponse, {
      'Usage tracked': (r) => {
        const newStatus = r.json(`modeStatus.#(mode="${mode}")`)
        return newStatus && newStatus.used > modeStatus.used
      },
    })
  }
  
  // Add realistic think time
  sleep(Math.random() * 5 + 5) // 5-10 seconds
}

export function teardown() {
  console.log('Test completed. Generating report...')
}

// Helper function to generate fake audio data
function generateAudioData(size: number): ArrayBuffer {
  // Create a simple WAV header + silence
  const buffer = new ArrayBuffer(size)
  const view = new DataView(buffer)
  
  // WAV header
  const encoder = new TextEncoder()
  const riff = encoder.encode('RIFF')
  const wave = encoder.encode('WAVE')
  const fmt = encoder.encode('fmt ')
  const data = encoder.encode('data')
  
  let offset = 0
  
  // RIFF chunk
  riff.forEach((byte, i) => view.setUint8(offset + i, byte))
  offset += 4
  view.setUint32(offset, size - 8, true) // File size - 8
  offset += 4
  wave.forEach((byte, i) => view.setUint8(offset + i, byte))
  offset += 4
  
  // fmt chunk
  fmt.forEach((byte, i) => view.setUint8(offset + i, byte))
  offset += 4
  view.setUint32(offset, 16, true) // Chunk size
  offset += 4
  view.setUint16(offset, 1, true) // Audio format (PCM)
  offset += 2
  view.setUint16(offset, 1, true) // Channels (mono)
  offset += 2
  view.setUint32(offset, 44100, true) // Sample rate
  offset += 4
  view.setUint32(offset, 44100 * 2, true) // Byte rate
  offset += 4
  view.setUint16(offset, 2, true) // Block align
  offset += 2
  view.setUint16(offset, 16, true) // Bits per sample
  offset += 2
  
  // data chunk
  data.forEach((byte, i) => view.setUint8(offset + i, byte))
  offset += 4
  view.setUint32(offset, size - offset - 4, true) // Data size
  
  // Rest is silence (zeros)
  
  return buffer
}