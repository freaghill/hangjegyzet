# Real-time Transcription Infrastructure

This directory contains the real-time transcription infrastructure for HangJegyzet, providing low-latency (<500ms) audio transcription with WebSocket support.

## Architecture Overview

### Components

1. **WebSocket Manager** (`websocket-manager.ts`)
   - Handles WebSocket connections using Socket.IO
   - Manages meeting rooms and participants
   - Provides authentication and authorization
   - Implements automatic reconnection and message queuing
   - Broadcasts transcription chunks to meeting participants

2. **Streaming Transcription** (`streaming-transcription.ts`)
   - Processes audio streams in real-time
   - Integrates with OpenAI Whisper for transcription
   - Implements speaker diarization
   - Optimized for Hungarian language
   - Handles audio chunking with overlap for accuracy

3. **Data Pipeline** (`data-pipeline.ts`)
   - Processes transcription segments with enrichments
   - Extracts keywords, action items, and decisions
   - Performs sentiment analysis
   - Manages meeting context and state
   - Persists transcripts to database

4. **Audio Processor** (`audio-processor.ts`)
   - Captures audio from WebRTC
   - Implements noise reduction and echo cancellation
   - Monitors audio levels
   - Converts audio format for Whisper compatibility

## API Endpoints

### `/api/realtime/connect`
- GET: Returns WebSocket connection details
- Requires authentication

### `/api/realtime/stream`
- POST: Start audio streaming for a meeting
- GET: Get stream status and metrics
- DELETE: Stop audio streaming

### `/api/realtime/transcript`
- GET: Access live transcripts
- POST: Add manual transcript segments
- DELETE: Clear transcripts (admin only)

## Usage

### Server Setup

To run the server with WebSocket support:

```bash
# Development
npm run dev:ws

# Production
npm run start:ws
```

### Client Usage

```typescript
import { useRealtimeTranscription } from '@/hooks/use-realtime-transcription'

function MeetingComponent({ meetingId }) {
  const {
    isRecording,
    connectionStatus,
    transcriptionHistory,
    audioLevel,
    startRecording,
    stopRecording,
  } = useRealtimeTranscription({
    meetingId,
    onTranscription: (chunk) => {
      console.log('New transcription:', chunk)
    },
    onError: (error) => {
      console.error('Transcription error:', error)
    },
  })

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
      <div>Status: {connectionStatus}</div>
      <div>Audio Level: {audioLevel}</div>
    </div>
  )
}
```

## Database Schema

The infrastructure uses the `meeting_transcripts` table:

```sql
CREATE TABLE meeting_transcripts (
  id UUID PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id),
  text TEXT NOT NULL,
  speaker VARCHAR(255),
  start_time BIGINT,
  end_time BIGINT,
  confidence FLOAT,
  language VARCHAR(10),
  metadata JSONB,
  created_at TIMESTAMPTZ
)
```

## Performance Metrics

- **Latency**: <500ms end-to-end
- **Audio chunk size**: 100ms with 20ms overlap
- **Buffer size**: 500ms for context
- **Sample rate**: 16kHz mono
- **Persistence interval**: 5 seconds

## Hungarian Language Optimization

The system includes specific optimizations for Hungarian:
- Custom vocabulary and business terms
- Post-processing for common transcription errors
- Hungarian-specific prompt for Whisper
- Support for Hungarian company names and abbreviations

## Security

- WebSocket connections require authentication
- Organization-based access control
- RLS policies for database access
- Automatic session validation

## Error Handling

- Automatic reconnection on connection loss
- Message queuing for reliability
- Graceful degradation
- Comprehensive error logging

## Monitoring

The pipeline provides real-time metrics:
- Total segments processed
- Average latency
- Error rate
- Throughput (segments/second)

## Future Enhancements

- Multi-language support
- Advanced speaker diarization
- Real-time translation
- Custom vocabulary training
- WebRTC mesh networking for P2P