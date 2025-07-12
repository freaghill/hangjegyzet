# Code Review: Real-time Transcription Implementation

## Overview
Reviewing the real-time transcription implementation for bugs, edge cases, and production readiness.

## 🚨 Critical Issues Found

### 1. Memory Leaks in Hook

**File**: `/hooks/use-realtime-transcription-v2.ts`

**Issue**: WebSocket reconnection without cleanup
```typescript
// Line 248-254
useEffect(() => {
  connectWebSocket()
  return () => {
    disconnect()
  }
}, []) // ❌ Missing dependencies
```

**Fix**:
```typescript
useEffect(() => {
  connectWebSocket()
  return () => {
    disconnect()
  }
}, [connectWebSocket, disconnect]) // Add dependencies
```

### 2. Unbounded Transcript Array

**Issue**: Transcript array grows infinitely
```typescript
// Line 192
setTranscript(prev => [...prev, result.transcription])
```

**Fix**:
```typescript
const MAX_TRANSCRIPT_LENGTH = 1000
setTranscript(prev => {
  const updated = [...prev, result.transcription]
  if (updated.length > MAX_TRANSCRIPT_LENGTH) {
    return updated.slice(-MAX_TRANSCRIPT_LENGTH) // Keep last 1000
  }
  return updated
})
```

### 3. No Error Boundary

**Issue**: Crashes entire app if hook throws

**Fix**: Add error boundary component
```typescript
// /components/error-boundary.tsx
export class RealtimeErrorBoundary extends React.Component {
  state = { hasError: false }
  
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  
  componentDidCatch(error: Error) {
    console.error('Realtime transcription error:', error)
  }
  
  render() {
    if (this.state.hasError) {
      return <Alert>Transcription temporarily unavailable</Alert>
    }
    return this.props.children
  }
}
```

## ⚠️ Edge Cases Not Handled

### 1. Microphone Switching Mid-Recording

**Issue**: User unplugs mic or switches audio device
```typescript
// Add to hook:
useEffect(() => {
  const handleDeviceChange = () => {
    if (isRecording) {
      stopRecording()
      toast.error('Audio device changed. Please restart recording.')
    }
  }
  
  navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
  return () => {
    navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
  }
}, [isRecording])
```

### 2. Network Interruptions

**Issue**: Audio chunks lost during disconnection

**Fix**: Implement queue with retry
```typescript
const audioQueue = useRef<Blob[]>([])
const retryTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())

const sendAudioChunk = useCallback(async (audioBlob: Blob, retries = 3) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-Meeting-ID': meetingId },
      body: formData,
    })
    
    if (!response.ok && retries > 0) {
      // Retry with exponential backoff
      const timeout = setTimeout(() => {
        sendAudioChunk(audioBlob, retries - 1)
      }, 1000 * (4 - retries))
      
      retryTimeouts.current.add(timeout)
    }
  } catch (error) {
    if (retries > 0) {
      audioQueue.current.push(audioBlob) // Queue for later
    }
  }
}, [meetingId])
```

### 3. Browser Tab Backgrounding

**Issue**: MediaRecorder may pause in background

**Fix**: Detect visibility change
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden && isRecording) {
      toast.warning('Recording paused - tab in background')
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [isRecording])
```

### 4. Maximum Recording Duration

**Issue**: No limit on recording length

**Fix**: Add timeout
```typescript
const MAX_RECORDING_DURATION = 3600000 // 1 hour

useEffect(() => {
  if (isRecording) {
    const timeout = setTimeout(() => {
      stopRecording()
      toast.warning('Maximum recording duration reached (1 hour)')
    }, MAX_RECORDING_DURATION)
    
    return () => clearTimeout(timeout)
  }
}, [isRecording])
```

## 🔧 Performance Issues

### 1. Excessive Re-renders

**Issue**: Component re-renders on every transcript update

**Fix**: Memoize transcript display
```typescript
const TranscriptDisplay = React.memo(({ segments }) => {
  return segments.map(segment => (
    <div key={segment.id}>{segment.text}</div>
  ))
}, (prev, next) => {
  // Only re-render if segments actually changed
  return prev.segments.length === next.segments.length &&
    prev.segments[prev.segments.length - 1]?.id === 
    next.segments[next.segments.length - 1]?.id
})
```

### 2. Large Audio Chunks

**Issue**: 1-second chunks might be too large for poor connections

**Fix**: Adaptive chunk size
```typescript
const [chunkDuration, setChunkDuration] = useState(1000)
const [uploadSpeed, setUploadSpeed] = useState<number>()

const sendAudioChunk = async (blob: Blob) => {
  const startTime = Date.now()
  await fetch(/* ... */)
  const duration = Date.now() - startTime
  
  // Adjust chunk size based on upload speed
  if (duration > 500) {
    setChunkDuration(prev => Math.max(500, prev - 100))
  } else if (duration < 100) {
    setChunkDuration(prev => Math.min(2000, prev + 100))
  }
}
```

## 🔒 Security Issues

### 1. Missing CORS Configuration

**Issue**: WebSocket accepts connections from any origin

**Fix**: In `server-test.ts`
```typescript
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://hangjegyzet.hu'
      ]
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('CORS error'))
      }
    },
    credentials: true,
  }
})
```

### 2. No Rate Limiting

**Issue**: User can spam audio uploads

**Fix**: Add rate limiting
```typescript
const uploadCounts = new Map<string, number>()

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown'
  const count = uploadCounts.get(ip) || 0
  
  if (count > 60) { // 60 chunks per minute max
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    )
  }
  
  uploadCounts.set(ip, count + 1)
  setTimeout(() => {
    uploadCounts.set(ip, (uploadCounts.get(ip) || 1) - 1)
  }, 60000)
  
  // ... rest of handler
}
```

## 📱 Browser Compatibility

### 1. Safari Issues

**Issue**: MediaRecorder not supported in older Safari

**Fix**: Check support
```typescript
const checkBrowserSupport = () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser does not support audio recording')
  }
  
  if (!window.MediaRecorder) {
    throw new Error('MediaRecorder API not supported')
  }
  
  // Check supported MIME types
  const types = ['audio/webm', 'audio/ogg', 'audio/wav']
  const supported = types.find(type => MediaRecorder.isTypeSupported(type))
  
  if (!supported) {
    throw new Error('No supported audio format found')
  }
  
  return supported
}
```

### 2. Mobile Browser Issues

**Issue**: Background recording stops on mobile

**Fix**: Warn users
```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

if (isMobile && isRecording) {
  toast.warning('Keep app in foreground for continuous recording')
}
```

## ✅ Good Practices Already Implemented

1. **Graceful degradation** - Test mode for development
2. **User feedback** - Connection status, recording indicators
3. **Export functionality** - Users can download transcripts
4. **Hungarian language** - Properly localized UI
5. **Error handling** - Basic try-catch blocks

## 🎯 Production Readiness Checklist

- [ ] Add error boundaries
- [ ] Implement audio queue with retry logic
- [ ] Add rate limiting
- [ ] Handle browser compatibility
- [ ] Add performance monitoring
- [ ] Implement proper logging
- [ ] Add integration tests
- [ ] Security review WebSocket auth
- [ ] Add upload progress indicator
- [ ] Handle maximum file sizes
- [ ] Add connection quality indicator
- [ ] Implement graceful reconnection
- [ ] Add offline support (queue locally)
- [ ] Monitor memory usage
- [ ] Add analytics tracking

## Recommended Next Steps

1. **Immediate fixes** (2-4 hours)
   - Fix memory leaks
   - Add error boundary
   - Limit transcript array size

2. **Before production** (4-8 hours)
   - Add rate limiting
   - Implement retry logic
   - Handle browser compatibility

3. **Nice to have** (8-16 hours)
   - Offline support
   - Advanced audio processing
   - Performance optimizations