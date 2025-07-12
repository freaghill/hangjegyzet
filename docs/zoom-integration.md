# Zoom Integration Setup Guide

This guide explains how to set up the Zoom cloud recording webhook integration for the HangJegyzet app.

## Prerequisites

1. A Zoom account with cloud recording enabled
2. Access to create a Zoom OAuth app
3. Environment variables configured in your application

## Setting up Zoom OAuth App

1. Go to the [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click on "Develop" → "Build App"
3. Choose "OAuth" as the app type
4. Fill in the app information:
   - App Name: HangJegyzet
   - Short Description: Meeting transcription and analysis
   - Company Name: Your company name

### OAuth Configuration

1. In the OAuth section, configure:
   - **Redirect URL**: `https://your-domain.com/api/integrations/zoom/auth`
   - **Add Allow List**: Add your production domain
   - **Scopes**: Add the following scopes:
     - `recording:read` - View cloud recordings
     - `recording:write` - Delete cloud recordings
     - `user:read` - View user information

### Webhook Configuration

1. In the Feature section, enable Event Subscriptions
2. Add Event Subscription URL: `https://your-domain.com/api/integrations/zoom/webhook`
3. Subscribe to the following events:
   - `recording.completed` - When a recording is ready
   - `recording.deleted` - When a recording is deleted
   - `recording.recovered` - When a recording is recovered
   - `recording.transcript_completed` - When transcript is ready

## Environment Variables

Add these to your `.env.local` file:

```bash
# Zoom OAuth
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_REDIRECT_URI=https://your-domain.com/api/integrations/zoom/auth
ZOOM_WEBHOOK_SECRET=your_webhook_secret

# For webhook verification and internal API calls
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Database Setup

Run the migration to create Zoom integration tables:

```bash
supabase migration up
```

This creates:
- `zoom_integrations` - Stores OAuth tokens and settings
- `zoom_recordings` - Tracks Zoom cloud recordings
- `zoom_webhook_logs` - Logs webhook events for debugging

## How It Works

### 1. User Authentication Flow

1. User clicks "Connect Zoom" in settings
2. Redirected to Zoom OAuth consent page
3. After approval, redirected back with authorization code
4. Code exchanged for access/refresh tokens
5. Tokens stored encrypted in database
6. Recent recordings (last 7 days) imported automatically

### 2. Webhook Processing

When a recording is completed:
1. Zoom sends webhook to `/api/integrations/zoom/webhook`
2. Webhook signature verified for security
3. Recording metadata stored in database
4. If auto-download enabled, recording queued for download
5. Download process:
   - Recording file downloaded from Zoom
   - Uploaded to Supabase storage
   - Meeting record created
   - Transcription triggered automatically
   - Optional: Recording deleted from Zoom

### 3. Manual Operations

Users can:
- Sync recordings from last 30 days
- Manually import specific recordings
- Enable/disable auto-download
- Configure delete-after-download

## API Endpoints

### OAuth Flow
- `GET /api/integrations/zoom/auth` - Initiates OAuth flow or handles callback

### Webhook Handler
- `POST /api/integrations/zoom/webhook` - Receives Zoom webhooks
- `GET /api/integrations/zoom/webhook` - Webhook verification

### Recording Operations
- `GET /api/integrations/zoom/recordings` - List user's recordings
- `POST /api/integrations/zoom/recordings` - Download/sync recordings
- `DELETE /api/integrations/zoom/recordings` - Remove integration

## Security Considerations

1. **OAuth Tokens**: Stored encrypted, refreshed automatically
2. **Webhook Verification**: All webhooks verified using HMAC signature
3. **Row Level Security**: Users can only access their own data
4. **Rate Limiting**: API endpoints protected by rate limits

## Troubleshooting

### Common Issues

1. **OAuth Error**: Check redirect URI matches exactly
2. **Webhook Not Received**: Verify webhook URL and event subscriptions
3. **Download Fails**: Check token validity and recording availability
4. **Sync Issues**: Ensure user has recordings in specified date range

### Debug Webhook Events

Check webhook logs in database:
```sql
SELECT * FROM zoom_webhook_logs 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Testing

1. **Local Development**: Use ngrok for webhook testing
   ```bash
   ngrok http 3000
   # Update webhook URL in Zoom app settings
   ```

2. **Test Recording Import**:
   - Create a test Zoom meeting
   - Enable cloud recording
   - End meeting and wait for processing
   - Check if webhook received and recording imported

## Monitoring

Monitor integration health:
- Check `zoom_webhook_logs` for failed events
- Monitor `zoom_recordings` download_status
- Set up alerts for failed downloads
- Track token refresh failures