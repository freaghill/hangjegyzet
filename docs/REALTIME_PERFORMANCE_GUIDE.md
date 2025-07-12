# Real-Time Meeting Copilot - Performance Optimization Guide

## Overview

This guide covers performance optimization strategies for the HangJegyzet Real-Time Meeting Copilot to ensure <500ms latency and smooth user experience.

## 🎯 Performance Targets

### Latency Requirements
- **Audio to Transcript**: <500ms
- **Insight Generation**: <1s
- **Alert Detection**: <2s
- **UI Updates**: 60fps (16ms per frame)
- **WebSocket Round Trip**: <100ms

### Resource Constraints
- **CPU Usage**: <30% average, <50% peak
- **Memory**: <500MB per meeting
- **Network**: <1Mbps upload, <500Kbps download
- **Battery**: <10% drain per hour on mobile

## 🚀 Optimization Strategies

### 1. Audio Processing Optimization

#### Efficient Chunking
```typescript
// Optimal chunk size for low latency
const CHUNK_SIZE = 100 // ms
const OVERLAP = 20 // ms
const SAMPLE_RATE = 16000 // Hz (optimal for speech)

// Use Web Audio API for efficient processing
const audioContext = new AudioContext({ 
  sampleRate: SAMPLE_RATE,
  latencyHint: 'interactive' 
})
```

#### Audio Preprocessing
```typescript
// Reduce processing load with preprocessing
const preprocessAudio = (audioData: Float32Array): Float32Array => {
  // Downsample if needed
  if (audioContext.sampleRate > 16000) {
    return downsample(audioData, audioContext.sampleRate, 16000)
  }
  
  // Apply noise gate
  return applyNoiseGate(audioData, -50) // dB threshold
}
```

### 2. WebSocket Optimization

#### Connection Management
```typescript
// Use binary frames for audio data
socket.binaryType = 'arraybuffer'

// Enable compression
const socket = io({
  transports: ['websocket'],
  upgrade: false,
  perMessageDeflate: {
    threshold: 1024
  }
})

// Implement heartbeat for connection health
setInterval(() => {
  socket.emit('ping', Date.now())
}, 30000)
```

#### Message Batching
```typescript
// Batch multiple updates
const updateBatch: any[] = []
const BATCH_INTERVAL = 100 // ms

const batchUpdate = (update: any) => {
  updateBatch.push(update)
  
  if (updateBatch.length === 1) {
    setTimeout(() => {
      socket.emit('batch', updateBatch)
      updateBatch.length = 0
    }, BATCH_INTERVAL)
  }
}
```

### 3. Transcription Optimization

#### Streaming with Buffering
```typescript
// Smart buffering for reliability
class TranscriptionBuffer {
  private buffer: AudioChunk[] = []
  private processing = false
  
  async add(chunk: AudioChunk) {
    this.buffer.push(chunk)
    
    if (!this.processing && this.buffer.length >= 3) {
      await this.process()
    }
  }
  
  private async process() {
    this.processing = true
    
    while (this.buffer.length > 0) {
      const chunk = this.buffer.shift()!
      await this.transcribe(chunk)
    }
    
    this.processing = false
  }
}
```

#### Language Model Optimization
```typescript
// Use specialized Hungarian model
const whisperConfig = {
  model: 'whisper-large-v2-hungarian-optimized',
  language: 'hu',
  task: 'transcribe',
  temperature: 0, // Deterministic for speed
  beam_size: 1, // Faster than default 5
  best_of: 1
}
```

### 4. Real-Time Analysis Optimization

#### Sliding Window Analysis
```typescript
// Efficient sliding window implementation
class SlidingWindow<T> {
  private window: T[] = []
  private maxSize: number
  
  constructor(maxSize: number) {
    this.maxSize = maxSize
  }
  
  add(item: T) {
    this.window.push(item)
    if (this.window.length > this.maxSize) {
      this.window.shift()
    }
  }
  
  analyze<R>(analyzer: (items: T[]) => R): R {
    return analyzer(this.window)
  }
}
```

#### Debounced Analysis
```typescript
// Prevent over-analysis
const debouncedAnalysis = debounce(async (transcript: string) => {
  const [sentiment, topics, alerts] = await Promise.all([
    analyzeSentiment(transcript),
    extractTopics(transcript),
    checkAlerts(transcript)
  ])
  
  updateUI({ sentiment, topics, alerts })
}, 500)
```

### 5. UI Rendering Optimization

#### Virtual Scrolling
```typescript
// Only render visible transcript segments
import { VariableSizeList } from 'react-window'

<VariableSizeList
  height={600}
  itemCount={segments.length}
  itemSize={(index) => getSegmentHeight(segments[index])}
  overscanCount={5}
>
  {({ index, style }) => (
    <div style={style}>
      <TranscriptSegment segment={segments[index]} />
    </div>
  )}
</VariableSizeList>
```

#### React Optimization
```typescript
// Memoize expensive components
const TranscriptSegment = React.memo(({ segment }) => {
  return <div>{segment.text}</div>
}, (prev, next) => {
  return prev.segment.id === next.segment.id &&
         prev.segment.text === next.segment.text
})

// Use state batching
import { unstable_batchedUpdates } from 'react-dom'

const updateMultipleStates = () => {
  unstable_batchedUpdates(() => {
    setTranscript(newTranscript)
    setAlerts(newAlerts)
    setMetrics(newMetrics)
  })
}
```

### 6. Memory Management

#### Cleanup Old Data
```typescript
// Automatic cleanup of old segments
const MAX_SEGMENTS = 1000
const CLEANUP_INTERVAL = 60000 // 1 minute

setInterval(() => {
  if (segments.length > MAX_SEGMENTS) {
    // Keep recent segments, archive old ones
    const toArchive = segments.splice(0, segments.length - MAX_SEGMENTS)
    archiveSegments(toArchive)
  }
}, CLEANUP_INTERVAL)
```

#### Resource Pooling
```typescript
// Reuse audio buffers
class AudioBufferPool {
  private pool: Float32Array[] = []
  private size: number
  
  constructor(bufferSize: number, poolSize: number = 10) {
    this.size = bufferSize
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Float32Array(bufferSize))
    }
  }
  
  acquire(): Float32Array {
    return this.pool.pop() || new Float32Array(this.size)
  }
  
  release(buffer: Float32Array) {
    buffer.fill(0) // Clear data
    this.pool.push(buffer)
  }
}
```

## 📊 Performance Monitoring

### Client-Side Metrics
```typescript
// Track key metrics
const metrics = {
  audioLatency: 0,
  transcriptionLatency: 0,
  wsRoundTrip: 0,
  fps: 0,
  memoryUsage: 0
}

// Monitor FPS
let lastTime = performance.now()
let frames = 0

const measureFPS = () => {
  frames++
  const currentTime = performance.now()
  
  if (currentTime >= lastTime + 1000) {
    metrics.fps = Math.round(frames * 1000 / (currentTime - lastTime))
    frames = 0
    lastTime = currentTime
  }
  
  requestAnimationFrame(measureFPS)
}

// Monitor memory
if (performance.memory) {
  setInterval(() => {
    metrics.memoryUsage = Math.round(
      performance.memory.usedJSHeapSize / 1048576
    )
  }, 5000)
}
```

### Server-Side Metrics
```typescript
// Track processing times
import { performance } from 'perf_hooks'

const measureProcessingTime = async (
  operation: string, 
  fn: () => Promise<any>
) => {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  // Send to monitoring service
  metrics.record(operation, duration)
  
  return result
}
```

## 🧪 Load Testing

### Simulated Load Test
```typescript
// Test with multiple concurrent meetings
const loadTest = async (concurrentMeetings: number) => {
  const meetings = []
  
  for (let i = 0; i < concurrentMeetings; i++) {
    meetings.push(simulateMeeting({
      duration: 3600, // 1 hour
      participants: 5,
      audioQuality: 'high'
    }))
  }
  
  const results = await Promise.all(meetings)
  
  console.log('Load test results:', {
    avgLatency: average(results.map(r => r.avgLatency)),
    maxLatency: Math.max(...results.map(r => r.maxLatency)),
    errors: results.filter(r => r.errors > 0).length
  })
}
```

### Stress Testing
```bash
# Using Artillery for WebSocket load testing
artillery run websocket-stress-test.yml

# websocket-stress-test.yml
config:
  target: "ws://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 100
scenarios:
  - name: "Real-time transcription"
    engine: "ws"
    flow:
      - send: '{"type": "join", "meetingId": "test-{{ $randomNumber(1, 1000) }}"}'
      - loop:
        - send: '{"type": "audio", "data": "{{ $randomBytes(4096) }}"}'
        - think: 0.1
        count: 600
```

## 🔧 Browser-Specific Optimizations

### Chrome/Edge
```typescript
// Use OffscreenCanvas for charts
const offscreen = canvas.transferControlToOffscreen()
const worker = new Worker('chart-worker.js')
worker.postMessage({ canvas: offscreen }, [offscreen])
```

### Safari
```typescript
// Handle Safari's stricter autoplay policies
const initAudioContext = async () => {
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }
}

// Add user interaction handler
button.addEventListener('click', initAudioContext)
```

### Mobile Browsers
```typescript
// Reduce quality on mobile
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)

const audioConstraints = isMobile ? {
  sampleRate: 8000,
  echoCancellation: true,
  noiseSuppression: true
} : {
  sampleRate: 16000,
  echoCancellation: true,
  noiseSuppression: true
}
```

## 📝 Performance Checklist

### Pre-Deployment
- [ ] Audio latency <500ms in optimal conditions
- [ ] Transcription accuracy >95% for Hungarian
- [ ] UI maintains 60fps during active transcription
- [ ] Memory usage stays under 500MB for 1-hour meetings
- [ ] WebSocket reconnection works smoothly
- [ ] Mobile performance acceptable on mid-range devices

### Monitoring
- [ ] Set up performance monitoring dashboard
- [ ] Configure alerts for latency spikes
- [ ] Track error rates and types
- [ ] Monitor server resource usage
- [ ] Implement user experience metrics

### Optimization Cycle
1. **Measure**: Collect performance data
2. **Analyze**: Identify bottlenecks
3. **Optimize**: Apply targeted improvements
4. **Validate**: Ensure optimizations work
5. **Monitor**: Track long-term performance

## 🚨 Common Performance Issues

### High Latency
- **Cause**: Network congestion, server overload
- **Solution**: Implement edge servers, optimize server code

### Audio Dropouts
- **Cause**: Buffer underruns, packet loss
- **Solution**: Increase buffer size, implement jitter buffer

### UI Freezing
- **Cause**: Main thread blocking
- **Solution**: Use Web Workers, optimize React renders

### Memory Leaks
- **Cause**: Event listeners, uncleaned resources
- **Solution**: Proper cleanup, use WeakMap for caches

---

Last updated: 2025-01-08