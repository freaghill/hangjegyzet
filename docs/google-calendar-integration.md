# Google Calendar Integration

## Overview
The Google Calendar integration allows HangJegyzet users to:
- View upcoming meetings from their Google Calendar on the dashboard
- Link uploaded recordings to calendar events
- Automatically sync meeting summaries back to calendar events
- Support for recurring meetings
- Extract meeting titles from calendar events

## Setup

### Prerequisites
1. Google Cloud Console project with Calendar API enabled
2. OAuth 2.0 credentials configured
3. Redirect URI set up for calendar authentication

### Environment Variables
```env
# Existing Google OAuth credentials
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Calendar-specific redirect URI (optional, falls back to GOOGLE_REDIRECT_URI)
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/integrations/calendar/auth
```

### Database Schema
The integration uses two main tables:
- `google_calendar_integrations` - Stores OAuth tokens and selected calendars
- `calendar_events` - Synced calendar events with meeting links

## User Flow

### 1. Initial Connection
Users connect their Google Calendar from Settings > Integrations:
1. Click "Connect Google Calendar"
2. Authorize access to view and edit calendar events
3. Select which calendars to sync
4. Integration is saved with OAuth tokens

### 2. Dashboard Widget
The "Upcoming Meetings" widget shows:
- Events from the next 7 days
- Meeting links (Zoom, Google Meet, Teams)
- Linked transcriptions
- Quick access to join meetings

### 3. Upload with Calendar Link
When uploading a recording:
1. Enable "Calendar Link" toggle
2. Select the matching calendar event
3. Meeting title is auto-populated from the event
4. Recording is linked to the calendar event

### 4. Sync Back to Calendar
After transcription completes:
1. Click "Sync with Calendar" on the meeting page
2. Summary and action items are added to the calendar event description
3. Link to full transcript is included

## API Endpoints

### Authentication
- `GET /api/integrations/calendar/auth` - OAuth flow initiation/callback
- `DELETE /api/integrations/calendar/auth` - Disconnect integration
- `PATCH /api/integrations/calendar/auth` - Update selected calendars

### Calendar Events
- `GET /api/integrations/calendar/events` - List upcoming events
- `POST /api/integrations/calendar/events` - Create new event
- `PATCH /api/integrations/calendar/events` - Update event or link meeting

### Sync
- `POST /api/integrations/calendar/sync` - Sync meeting summary to calendar
- `GET /api/integrations/calendar/sync` - Bulk sync past events

## Features

### Automatic Token Refresh
The integration automatically refreshes expired access tokens using the stored refresh token.

### Meeting Link Detection
The system automatically detects meeting links in:
- Event location field
- Event description
- Google Meet links (hangoutLink)
- Conference data

Supported platforms:
- Google Meet
- Zoom
- Microsoft Teams

### Recurring Events
Recurring events are supported with proper handling of:
- Individual occurrences
- Series modifications
- Linking to specific instances

### Privacy & Security
- OAuth tokens are encrypted in the database
- Users can revoke access at any time
- Only selected calendars are accessed
- Read/write permissions are clearly displayed

## Development

### Testing Locally
1. Set up OAuth credentials in Google Cloud Console
2. Add `http://localhost:3000/api/integrations/calendar/auth` as redirect URI
3. Configure environment variables
4. Run database migrations

### Adding New Features
Common extension points:
- Additional calendar providers (Outlook, Apple Calendar)
- Two-way sync (create events from meetings)
- Automatic recording scheduling
- Calendar analytics

## Troubleshooting

### Common Issues
1. **"Calendar not connected" error**
   - User needs to connect Google Calendar in settings
   - OAuth token may have expired

2. **Events not showing**
   - Check selected calendars in settings
   - Verify time range parameters
   - Ensure events have proper permissions

3. **Sync fails**
   - Meeting must be linked to a calendar event
   - User needs write permissions for the calendar
   - Event may have been deleted