# Hangjegyzet API Examples

This document provides practical examples for common API use cases.

## 🎯 Common Workflows

### 1. Complete Meeting Upload and Transcription Flow

```javascript
// Step 1: Upload audio file
const formData = new FormData();
formData.append('file', audioFile);
formData.append('title', 'Q1 Planning Meeting');
formData.append('language', 'hu');

const uploadResponse = await fetch(`${API_BASE_URL}/meetings/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: formData
});

const { meetingId } = await uploadResponse.json();

// Step 2: Queue transcription
const transcribeResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/transcribe`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    mode: 'balanced',
    language: 'hu'
  })
});

const { jobId, estimatedTime } = await transcribeResponse.json();

// Step 3: Poll for completion (or use webhooks)
const checkStatus = async () => {
  const statusResponse = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { status, progress } = await statusResponse.json();
  
  if (status === 'completed') {
    // Step 4: Get transcription
    const transcriptResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const meeting = await transcriptResponse.json();
    console.log('Transcription:', meeting.transcription);
  } else if (status === 'processing') {
    // Check again in 10 seconds
    setTimeout(checkStatus, 10000);
  }
};

checkStatus();
```

### 2. Real-time Transcription WebSocket Connection

```javascript
// Step 1: Get WebSocket connection details
const connectResponse = await fetch(`${API_BASE_URL}/realtime/connect`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { url, token, protocols } = await connectResponse.json();

// Step 2: Establish WebSocket connection
const ws = new WebSocket(url, protocols);

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
  
  // Start streaming
  ws.send(JSON.stringify({
    type: 'start_stream',
    config: {
      language: 'hu',
      mode: 'realtime'
    }
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'transcript':
      console.log('Transcript:', data.text);
      updateUI(data);
      break;
    case 'speaker_change':
      console.log('New speaker:', data.speaker);
      break;
    case 'insight':
      console.log('Real-time insight:', data.insight);
      break;
  }
};

// Step 3: Stream audio data
const streamAudio = (audioChunk) => {
  ws.send(audioChunk); // Send raw audio data
};

// Step 4: Clean up
ws.onclose = () => {
  console.log('Connection closed');
};
```

### 3. AI Analytics and Insights Generation

```javascript
// Generate comprehensive meeting analysis
async function analyzeMeeting(meetingId) {
  // Step 1: Generate basic analytics
  const analyticsResponse = await fetch(`${API_BASE_URL}/ai/analytics`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meetingId: meetingId,
      analysisType: 'engagement'
    })
  });
  
  const analytics = await analyticsResponse.json();
  
  // Step 2: Extract action items
  const actionsResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/ai/extract-actions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { actions } = await actionsResponse.json();
  
  // Step 3: Get AI predictions
  const predictionsResponse = await fetch(`${API_BASE_URL}/ai/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      meetingId: meetingId,
      predictionType: 'outcomes'
    })
  });
  
  const predictions = await predictionsResponse.json();
  
  return {
    analytics,
    actions,
    predictions
  };
}

// Usage
const insights = await analyzeMeeting('meeting-123');
console.log('Meeting insights:', insights);
```

### 4. Search with Advanced Filters

```javascript
// Complex search with multiple filters
async function searchMeetings(query) {
  const params = new URLSearchParams({
    q: query.text,
    from: query.dateFrom,
    to: query.dateTo,
    speaker: query.speaker,
    tags: query.tags.join(','),
    minDuration: query.minDuration,
    maxDuration: query.maxDuration,
    transcriptionLanguage: 'hu',
    sortBy: 'relevance',
    page: 1,
    limit: 20
  });
  
  const response = await fetch(`${API_BASE_URL}/meetings/search?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const results = await response.json();
  
  // Process results with highlights
  results.meetings.forEach(meeting => {
    console.log(`Meeting: ${meeting.title}`);
    console.log(`Relevance: ${meeting.relevance}`);
    
    // Show search highlights
    meeting.highlights.forEach(highlight => {
      console.log(`- ${highlight.text} (at ${highlight.timestamp}s)`);
    });
  });
  
  return results;
}

// Usage
const searchResults = await searchMeetings({
  text: 'quarterly revenue',
  dateFrom: '2024-01-01',
  dateTo: '2024-03-31',
  speaker: 'CEO',
  tags: ['finance', 'planning'],
  minDuration: 1800, // 30 minutes
  maxDuration: 7200  // 2 hours
});
```

### 5. Zoom Integration Workflow

```javascript
// Complete Zoom integration flow
async function importZoomRecordings() {
  // Step 1: Initiate OAuth
  window.location.href = `${API_BASE_URL}/integrations/zoom/auth?redirect=${encodeURIComponent(window.location.href)}`;
  
  // Step 2: After OAuth callback, list recordings
  const recordingsResponse = await fetch(`${API_BASE_URL}/integrations/zoom/recordings?from=2024-01-01&to=2024-01-31`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const { recordings } = await recordingsResponse.json();
  
  // Step 3: Import selected recordings
  for (const recording of recordings) {
    if (recording.duration > 600) { // Only import recordings > 10 minutes
      const importResponse = await fetch(`${API_BASE_URL}/import/zoom/recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recordingId: recording.id,
          autoTranscribe: true,
          transcriptionMode: 'balanced'
        })
      });
      
      const { meetingId } = await importResponse.json();
      console.log(`Imported Zoom recording as meeting ${meetingId}`);
    }
  }
}
```

### 6. Subscription Management

```javascript
// Complete subscription flow
async function manageSubscription() {
  // Step 1: Check current subscription
  const currentSubResponse = await fetch(`${API_BASE_URL}/subscription/current`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  const currentSub = await currentSubResponse.json();
  
  if (!currentSub || currentSub.status === 'expired') {
    // Step 2: Create new subscription
    const createResponse = await fetch(`${API_BASE_URL}/subscriptions/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan: 'professional',
        billingPeriod: 'yearly', // Save 20%
        paymentMethod: 'card'
      })
    });
    
    const { paymentUrl, transactionId } = await createResponse.json();
    
    // Step 3: Redirect to payment
    window.location.href = paymentUrl;
    
  } else if (currentSub.plan === 'starter') {
    // Step 4: Upgrade existing subscription
    const upgradeResponse = await fetch(`${API_BASE_URL}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newPlan: 'professional'
      })
    });
    
    const { success, nextBillingDate } = await upgradeResponse.json();
    console.log(`Upgraded! Next billing: ${nextBillingDate}`);
  }
}
```

### 7. Batch Operations

```javascript
// Batch process multiple meetings
async function batchProcessMeetings(meetingIds) {
  const results = await Promise.all(
    meetingIds.map(async (meetingId) => {
      try {
        // Generate summary
        const summaryResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/ai/summary`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        // Extract key points
        const keyPointsResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/ai/key-points`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        // Export to PDF
        const exportResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/export`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            format: 'pdf',
            template: 'executive_summary'
          })
        });
        
        const summary = await summaryResponse.json();
        const keyPoints = await keyPointsResponse.json();
        const { downloadUrl } = await exportResponse.json();
        
        return {
          meetingId,
          summary,
          keyPoints,
          downloadUrl,
          success: true
        };
      } catch (error) {
        return {
          meetingId,
          success: false,
          error: error.message
        };
      }
    })
  );
  
  // Report results
  const successful = results.filter(r => r.success).length;
  console.log(`Processed ${successful}/${meetingIds.length} meetings successfully`);
  
  return results;
}
```

### 8. Webhook Configuration

```javascript
// Set up webhooks for real-time notifications
async function configureWebhooks() {
  // Step 1: Create webhook endpoint
  const createResponse = await fetch(`${API_BASE_URL}/notifications/webhooks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: 'https://your-app.com/webhooks/hangjegyzet',
      events: [
        'transcription.completed',
        'meeting.shared',
        'analysis.ready',
        'export.completed'
      ],
      secret: generateWebhookSecret()
    })
  });
  
  const webhook = await createResponse.json();
  
  // Step 2: Test webhook
  const testResponse = await fetch(`${API_BASE_URL}/notifications/test`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhookId: webhook.id
    })
  });
  
  const testResult = await testResponse.json();
  console.log('Webhook test:', testResult);
}

// Webhook handler example (Express.js)
app.post('/webhooks/hangjegyzet', (req, res) => {
  const signature = req.headers['x-hangjegyzet-signature'];
  const event = req.body;
  
  // Verify signature
  if (!verifyWebhookSignature(signature, req.rawBody, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process event
  switch (event.type) {
    case 'transcription.completed':
      console.log(`Transcription ready for meeting ${event.data.meetingId}`);
      processCompletedTranscription(event.data);
      break;
      
    case 'analysis.ready':
      console.log(`Analysis ready for meeting ${event.data.meetingId}`);
      notifyUsers(event.data);
      break;
  }
  
  res.status(200).send('OK');
});
```

## 🔍 Error Handling

```javascript
// Comprehensive error handling
async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('X-RateLimit-Reset');
      const waitTime = retryAfter ? new Date(retryAfter * 1000) - new Date() : 60000;
      
      console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Retry request
      return apiRequest(endpoint, options);
    }
    
    // Handle authentication errors
    if (response.status === 401) {
      // Refresh token or redirect to login
      await refreshAccessToken();
      return apiRequest(endpoint, options);
    }
    
    // Handle other errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('API request failed:', error);
    
    // Implement retry logic for network errors
    if (error.name === 'NetworkError' && options.retries > 0) {
      options.retries--;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiRequest(endpoint, options);
    }
    
    throw error;
  }
}

// Usage with automatic retry
const data = await apiRequest('/meetings/search?q=revenue', {
  method: 'GET',
  retries: 3
});
```

## 📦 SDK Examples

### TypeScript SDK Usage

```typescript
import { HangjegyzetClient, Meeting, TranscriptionMode } from '@hangjegyzet/sdk';

// Initialize client
const client = new HangjegyzetClient({
  apiKey: process.env.HANGJEGYZET_API_KEY,
  baseUrl: 'https://hangjegyzet.hu/api'
});

// Type-safe API calls
async function processMeeting(audioFile: File): Promise<Meeting> {
  // Upload with progress tracking
  const meeting = await client.meetings.upload(audioFile, {
    title: 'Strategic Planning Session',
    language: 'hu',
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  });
  
  // Queue transcription
  const job = await client.meetings.transcribe(meeting.id, {
    mode: TranscriptionMode.Balanced,
    language: 'hu',
    features: ['speaker_diarization', 'punctuation', 'timestamps']
  });
  
  // Wait for completion
  await job.waitForCompletion({
    pollingInterval: 5000,
    onProgress: (progress) => {
      console.log(`Transcription progress: ${progress}%`);
    }
  });
  
  // Get full meeting with transcription
  return await client.meetings.get(meeting.id, {
    include: ['transcription', 'analytics', 'speakers']
  });
}
```

### Python SDK Usage

```python
from hangjegyzet import Client
from hangjegyzet.models import TranscriptionMode
import asyncio

# Initialize client
client = Client(
    api_key=os.environ['HANGJEGYZET_API_KEY'],
    base_url='https://hangjegyzet.hu/api'
)

async def analyze_meeting_series(meeting_ids: list[str]):
    """Analyze a series of related meetings"""
    
    # Fetch all meetings in parallel
    meetings = await asyncio.gather(*[
        client.meetings.get(mid) for mid in meeting_ids
    ])
    
    # Generate comparative analysis
    analysis = await client.ai.analyze_series(
        meeting_ids=meeting_ids,
        analysis_types=['trends', 'action_tracking', 'decision_evolution']
    )
    
    # Create briefing document
    briefing = await client.ai.generate_briefing(
        meetings=meetings,
        format='executive_summary',
        include_sections=[
            'key_decisions',
            'action_items',
            'timeline',
            'recommendations'
        ]
    )
    
    # Export to PDF
    pdf_url = await client.export.create(
        content=briefing,
        format='pdf',
        template='corporate_briefing'
    )
    
    return {
        'analysis': analysis,
        'briefing': briefing,
        'pdf_url': pdf_url
    }

# Usage
results = asyncio.run(analyze_meeting_series([
    'meeting-123',
    'meeting-456',
    'meeting-789'
]))
```

## 🚀 Performance Tips

1. **Use batch endpoints when available**
   ```javascript
   // Instead of multiple individual requests
   const results = await apiRequest('/meetings/batch', {
     method: 'POST',
     body: JSON.stringify({
       operations: [
         { action: 'transcribe', meetingId: 'id1' },
         { action: 'analyze', meetingId: 'id2' },
         { action: 'export', meetingId: 'id3' }
       ]
     })
   });
   ```

2. **Implement caching**
   ```javascript
   const cache = new Map();
   
   async function getCachedMeeting(meetingId) {
     if (cache.has(meetingId)) {
       const cached = cache.get(meetingId);
       if (Date.now() - cached.timestamp < 300000) { // 5 minutes
         return cached.data;
       }
     }
     
     const data = await apiRequest(`/meetings/${meetingId}`);
     cache.set(meetingId, { data, timestamp: Date.now() });
     return data;
   }
   ```

3. **Use webhooks instead of polling**
   ```javascript
   // Configure webhook for transcription completion
   await apiRequest('/notifications/webhooks', {
     method: 'POST',
     body: JSON.stringify({
       url: 'https://your-app.com/webhook',
       events: ['transcription.completed']
     })
   });
   ```

4. **Optimize file uploads**
   ```javascript
   // Use chunked upload for large files
   async function uploadLargeFile(file) {
     const chunkSize = 5 * 1024 * 1024; // 5MB chunks
     const chunks = Math.ceil(file.size / chunkSize);
     
     // Initiate multipart upload
     const { uploadId } = await apiRequest('/meetings/upload/initiate', {
       method: 'POST',
       body: JSON.stringify({
         fileName: file.name,
         fileSize: file.size
       })
     });
     
     // Upload chunks
     for (let i = 0; i < chunks; i++) {
       const start = i * chunkSize;
       const end = Math.min(start + chunkSize, file.size);
       const chunk = file.slice(start, end);
       
       await uploadChunk(uploadId, i, chunk);
     }
     
     // Complete upload
     return await apiRequest('/meetings/upload/complete', {
       method: 'POST',
       body: JSON.stringify({ uploadId })
     });
   }
   ```