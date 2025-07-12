# Real-time Transcription Development Guide

## Overview
Real-time transcription feature allows users to get live transcriptions during meetings using WebSocket + HTTP hybrid approach.

## Architecture

```
┌─────────────┐     Audio      ┌──────────────┐     WebSocket    ┌─────────────┐
│   Browser   │ ─────────────> │  Next.js API │ <─────────────> │ WS Server   │
│ MediaStream │   HTTP POST    │   /api/...   │   Transcripts   │  Port 3001  │
└─────────────┘                └──────────────┘                 └─────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │ Whisper API  │
                               │ (Production) │
                               └──────────────┘
```

## Development Setup

### 1. Start Test WebSocket Server
```bash
# Uses port 3002 for development
npm run dev:test-server
```

### 2. Start Next.js Dev Server
```bash
# In another terminal
npm run dev
```

### 3. Test the Feature
Navigate to: http://localhost:3000/test-realtime

## File Structure

```
/app/api/realtime/
├── audio/
│   ├── route.ts          # Production endpoint (with Supabase auth)
│   └── test/
│       └── route.ts      # Test endpoint (mock data)
│
/components/realtime/
├── realtime-transcription.tsx  # Main UI component
│
/hooks/
├── use-realtime-transcription-v2.ts  # Client hook
│
/lib/realtime/
├── websocket-manager.ts        # WebSocket server logic
├── streaming-transcription.ts  # Audio processing service
│
/server.ts                      # Production server (port 3001)
/server-test.ts                 # Test server (port 3002)
```

## How It Works

### Client Side
1. **MediaRecorder** captures audio in 100ms chunks
2. **Blob accumulation** - collects 1 second of audio
3. **HTTP POST** to `/api/realtime/audio/test` with audio blob
4. **WebSocket** connection for receiving transcripts

### Server Side
1. **HTTP endpoint** receives audio chunks
2. **Mock transcription** in test mode (instant response)
3. **WebSocket broadcast** for real production transcripts

## Test Mode Features

- **Mock transcriptions** - Returns random Hungarian phrases
- **No auth required** - Simplified for testing
- **Instant response** - No actual API calls
- **Console logging** - See all activity

## Production Mode

When `NODE_ENV=production`:
- Uses port 3001 for WebSocket
- Requires Supabase authentication
- Calls actual Whisper API
- Broadcasts via WebSocket to meeting room

## Testing Checklist

- [ ] Microphone permission granted
- [ ] Audio chunks being sent (check Network tab)
- [ ] Mock transcriptions appearing
- [ ] WebSocket connected (green badge)
- [ ] Start/stop recording works
- [ ] Export transcript works
- [ ] Auto-scroll works

## Common Issues

### Port Already in Use
```bash
# Find and kill process
lsof -i :3002
kill <PID>
```

### WebSocket Not Connecting
- Check if test server is running
- Verify port matches (3002 for dev)
- Check browser console for errors

### No Audio Chunks
- Check microphone permissions
- Verify MediaRecorder support
- Look for CORS errors

## Environment Variables

```env
# Development
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# Production
NEXT_PUBLIC_WS_URL=wss://your-domain.com:3001
```

## Production Deployment

1. **Build server**
```bash
npm run build:server
```

2. **Start with PM2**
```bash
pm2 start dist/server.js --name hangjegyzet-ws
```

3. **Configure Nginx**
```nginx
location /socket.io/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

## Next Steps

1. **Add Whisper Integration**
   - Replace mock with actual API calls
   - Handle rate limiting
   - Add language detection

2. **Speaker Diarization**
   - Identify different speakers
   - Track speaking time
   - Generate speaker profiles

3. **Real-time Analytics**
   - Sentiment analysis
   - Key points extraction
   - Action items detection

4. **Performance Optimization**
   - Audio compression
   - Batch processing
   - CDN for static assets