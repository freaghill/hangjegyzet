# Google Drive Integration Setup

This document explains how to set up and use the Google Drive integration in HangJegyzet.

## Prerequisites

1. A Google Cloud Project with the Google Drive API enabled
2. OAuth 2.0 credentials configured for your application

## Google Cloud Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click on it and press "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/integrations/google-drive/auth`
     - For production: `https://yourdomain.com/api/integrations/google-drive/auth`
   - Save the Client ID and Client Secret

## Environment Variables

Add these to your `.env.local` file:

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-drive/auth
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

Run the migration to create the necessary tables:

```bash
supabase migration up
```

This creates:
- `google_drive_integrations` table for storing user tokens and settings
- `google_drive_sync_logs` table for tracking sync history

## Features

### OAuth2 Authentication Flow
- Users can connect their Google Drive account
- Tokens are securely stored in the database
- Automatic token refresh when expired

### Folder Management
- List and select Google Drive folders to watch
- Multiple folders can be watched simultaneously
- Remove folders from watch list

### File Syncing
- Automatically detects audio/video files in watched folders
- Imports new files as meetings for transcription
- Prevents duplicate imports
- Manual sync button for immediate updates

### Automatic Syncing (Optional)
- Set up a cron job to call `/api/integrations/google-drive/cron`
- Automatically syncs all active integrations every 5 minutes
- Add `CRON_SECRET` environment variable for security

## User Guide

1. Navigate to Settings > Integrations
2. Click "Connect Google Drive"
3. Authorize the application to access your Google Drive
4. Select folders to watch for new recordings
5. Files will be automatically imported and queued for transcription

## API Endpoints

- `GET/POST /api/integrations/google-drive/auth` - OAuth flow
- `GET /api/integrations/google-drive` - Get integration status
- `GET/POST/DELETE /api/integrations/google-drive/folders` - Manage folders
- `POST /api/integrations/google-drive/sync` - Manual sync
- `GET /api/integrations/google-drive/cron` - Automated sync endpoint

## Security Considerations

1. Tokens are encrypted at rest in the database
2. Row Level Security (RLS) ensures users can only access their own integrations
3. OAuth state parameter prevents CSRF attacks
4. Refresh tokens allow long-term access without storing passwords

## Troubleshooting

### Common Issues

1. **"Failed to connect to Google Drive"**
   - Check that Google Drive API is enabled
   - Verify OAuth credentials are correct
   - Ensure redirect URI matches exactly

2. **Files not syncing**
   - Check that folders are properly selected
   - Verify files are audio/video format
   - Look at sync logs for errors

3. **Token expired errors**
   - The system should auto-refresh tokens
   - If issues persist, disconnect and reconnect

## Future Enhancements

- Real-time sync using Google Drive webhooks
- Selective file filtering by name/date
- Two-way sync (upload transcripts back to Drive)
- Folder creation and organization features