# Notification Integration Guide

This guide explains how to set up and use Slack and Microsoft Teams notifications in the HangJegyzet application.

## Overview

The notification system allows organizations to receive real-time updates about their meetings through Slack or Microsoft Teams webhooks. Notifications can be sent for various events including:

- Meeting completion
- Processing failures
- Action items creation
- User mentions
- Highlight creation
- Transcription availability
- Summary generation

## Setting Up Notifications

### 1. Navigate to Settings

Go to Settings → Integrations → Notification Webhooks in the HangJegyzet application.

### 2. Create a Webhook

#### For Slack:

1. In your Slack workspace, go to Apps → Incoming Webhooks
2. Click "Add to Slack"
3. Choose a channel and click "Add Incoming Webhooks Integration"
4. Copy the webhook URL
5. In HangJegyzet, click "Add Webhook"
6. Enter a name, select "Slack" as type, and paste the webhook URL
7. Optionally specify a channel override (e.g., #general)

#### For Microsoft Teams:

1. In your Teams channel, click the three dots menu → Connectors
2. Search for "Incoming Webhook" and click "Configure"
3. Give it a name and optionally upload an image
4. Click "Create" and copy the webhook URL
5. In HangJegyzet, click "Add Webhook"
6. Enter a name, select "Teams" as type, and paste the webhook URL

### 3. Test the Webhook

Click the test button (test tube icon) next to your webhook to send a test notification and verify it's working correctly.

### 4. Configure Notification Preferences

Click the settings button next to a webhook to configure which events should trigger notifications:

- **Meeting Completed**: Notifies when transcription and processing are complete
- **Processing Failed**: Alerts when meeting processing encounters an error
- **Action Items Created**: Sends a list of new action items extracted from the meeting
- **User Mentioned**: Notifies users when they're mentioned in annotations
- **Highlight Created**: Alerts when important moments are identified in a meeting

## Notification Formats

### Slack Notifications

Slack notifications use rich formatting with:
- Headers for clear event identification
- Structured sections for meeting details
- Action buttons for quick access to meetings
- Context information like timestamps and participants

### Teams Notifications

Teams notifications use MessageCard format with:
- Themed cards with appropriate colors
- Activity sections with facts and details
- Action buttons to open meetings in the app
- Markdown support for rich text formatting

## Advanced Configuration

### Notification Filters

You can configure filters for specific event types:

```json
{
  "min_duration": 300,      // Minimum meeting duration in seconds
  "keywords": ["urgent", "important"],  // Keywords to match in summaries
  "users": ["user-id-1", "user-id-2"]  // Specific users for mentions
}
```

### API Integration

You can also manage webhooks programmatically using the API:

#### Create a webhook:
```bash
POST /api/notifications/webhooks
{
  "name": "Marketing Team",
  "type": "slack",
  "webhook_url": "https://hooks.slack.com/services/...",
  "channel": "#marketing"
}
```

#### Update preferences:
```bash
PUT /api/notifications/preferences
{
  "preferences": [
    {
      "webhook_id": "webhook-id",
      "event_type": "meeting_completed",
      "enabled": true,
      "filters": {
        "min_duration": 600
      }
    }
  ]
}
```

#### Test a webhook:
```bash
POST /api/notifications/test
{
  "type": "slack",
  "webhookUrl": "https://hooks.slack.com/services/...",
  "webhookId": "webhook-id"
}
```

## Troubleshooting

### Webhook Not Receiving Notifications

1. Verify the webhook is active (green checkmark)
2. Check notification preferences are enabled
3. Use the test button to verify connectivity
4. Check the webhook URL is correct and not expired

### Missing Notifications

1. Check if filters are too restrictive
2. Verify the event type is enabled in preferences
3. Check notification logs in the database

### Teams Webhook Returns Errors

- Ensure the webhook URL is from an Incoming Webhook connector
- Verify the Teams channel still exists
- Check if the connector hasn't been removed

### Slack Channel Override Not Working

- Use the format `#channel-name` with the # symbol
- Ensure the webhook has permission to post to that channel
- Leave blank to use the default channel

## Security Considerations

1. **Webhook URLs are sensitive** - They allow posting to your Slack/Teams channels
2. Only organization admins can manage webhooks
3. Webhook URLs are encrypted in the database
4. Test webhooks before enabling for production use
5. Regularly review and remove unused webhooks

## Best Practices

1. **Use descriptive names** for webhooks to identify their purpose
2. **Test webhooks** after creation to ensure they work
3. **Configure filters** to reduce notification noise
4. **Use separate webhooks** for different teams or purposes
5. **Monitor webhook health** and disable failing webhooks
6. **Review preferences** periodically to ensure relevance