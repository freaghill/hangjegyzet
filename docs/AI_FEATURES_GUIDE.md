# HangJegyzet AI Features Guide

## Overview

HangJegyzet now includes cutting-edge AI features that transform meeting data into actionable intelligence. This guide covers all the new AI capabilities and how to integrate them into your workflow.

## 🎯 Core AI Features

### 1. Predictive Meeting Intelligence
- **Topic Prediction**: AI predicts what topics will likely be discussed based on participants and history
- **Duration Estimation**: Accurate meeting length predictions based on type and participants
- **Cost Analysis**: Real-time meeting cost calculations with ROI insights
- **Pattern Recognition**: Identifies recurring patterns like "They usually ask about budget on slide 12"

### 2. Pre-Meeting Intelligence Briefs
- **Context Summary**: What happened in previous meetings with the same participants
- **Action Item Status**: Track unresolved items from past meetings
- **Participant Insights**: Communication styles and preferences of attendees
- **Preparation Tips**: AI-suggested talking points and agenda items

### 3. Real-Time Meeting Analytics
- **Speaking Time Analysis**: Track who's dominating conversations with interruption detection
- **Engagement Scoring**: Real-time participant engagement metrics
- **Energy Level Tracking**: Monitor meeting energy and suggest breaks
- **Pattern Detection**: Identify when meetings go off-track

### 4. Business Intelligence Extraction
- **Deal Probability**: For sales meetings, calculate closure likelihood
- **Compliance Detection**: Automatic flagging of potential compliance issues
- **Market Intelligence**: Extract competitor mentions and market trends
- **Risk Identification**: Detect and categorize business risks

### 5. Speaker Intelligence
- **Voice Fingerprinting**: Recognize speakers across meetings
- **Communication Profiling**: Identify communication styles (direct, diplomatic, analytical)
- **Speaking Pattern Analysis**: Track filler words, pace, and vocabulary
- **Performance Evolution**: Monitor speaker improvement over time

### 6. Meeting Optimization
- **Participant Suggestions**: AI recommends who should attend
- **Time Slot Optimization**: Find when meetings are most productive
- **Meeting ROI Analysis**: Calculate value vs. cost of meetings
- **Structure Recommendations**: Optimal agenda and time allocation

## 🚀 Getting Started

### Enable AI Features

1. **Feature Flags**: Enable AI features in the admin panel:
   ```
   /admin/features
   ```
   - Enable `predictive-intelligence-enabled`
   - Enable `speaker-analysis-enabled`
   - Enable `meeting-optimization-enabled`

2. **API Configuration**: Ensure API keys are set:
   ```env
   ANTHROPIC_API_KEY=your_claude_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

### Using AI Features

#### Pre-Meeting Preparation

1. **View Intelligence Brief**:
   ```
   /meetings/[id]/intelligence
   ```
   - See predicted topics and duration
   - Review participant insights
   - Check unresolved action items

2. **Meeting Creation with AI**:
   - AI automatically suggests participants
   - Predicts optimal duration
   - Recommends agenda items

#### During Meetings

1. **Real-Time Insights Panel**:
   - Monitor speaking balance
   - Track engagement levels
   - Get live suggestions

2. **Meeting Coach**:
   - Alerts when someone dominates
   - Suggests when to involve quiet participants
   - Tracks meeting pace

#### Post-Meeting Analysis

1. **Comprehensive Analytics**:
   ```
   /dashboard/ai-insights
   ```
   - Meeting effectiveness scores
   - Pattern analysis
   - Speaker performance metrics

2. **Automated Follow-ups**:
   - AI-generated email summaries
   - Smart calendar invites
   - Action item tracking

## 📊 API Reference

### Predictions API
```typescript
GET /api/ai/predictions?participants=email1,email2&type=sales
Response: {
  topics: [{ topic: string, probability: number }],
  estimatedDuration: number,
  estimatedCost: number,
  insights: string[]
}
```

### Pre-Meeting Brief API
```typescript
GET /api/ai/briefing?meetingId=uuid
Response: {
  executiveSummary: string,
  previousContext: MeetingContext[],
  unresolvedItems: ActionItem[],
  participantInsights: ParticipantProfile[],
  suggestedAgenda: string[]
}
```

### Analytics API
```typescript
GET /api/ai/analytics?meetingId=uuid
Response: {
  speakingTime: SpeakerMetrics[],
  effectiveness: number,
  patterns: Pattern[],
  engagement: EngagementData
}
```

### Business Insights API
```typescript
GET /api/ai/insights?meetingId=uuid
Response: {
  dealProbability?: DealAnalysis,
  compliance?: ComplianceIssue[],
  marketInsights?: MarketIntelligence[],
  risks?: Risk[]
}
```

## 🎨 UI Components

### Pre-Meeting Dashboard
```tsx
import { PreMeetingDashboard } from '@/components/ai/pre-meeting-dashboard'

<PreMeetingDashboard meetingId={meetingId} />
```

### Meeting Insights Panel
```tsx
import { MeetingInsightsPanel } from '@/components/ai/meeting-insights-panel'

<MeetingInsightsPanel 
  meetingId={meetingId}
  showRealTime={true}
/>
```

### Predictive Analytics
```tsx
import { PredictiveAnalytics } from '@/components/ai/predictive-analytics'

<PredictiveAnalytics organizationId={orgId} />
```

## 🔧 Configuration

### AI Models
Configure which AI models to use:
```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  claude: {
    model: 'claude-3-opus-20240229',
    temperature: 0.3
  },
  openai: {
    model: 'gpt-4-turbo-preview',
    embedding: 'text-embedding-ada-002'
  }
}
```

### Thresholds
Adjust AI sensitivity:
```typescript
// lib/ai/thresholds.ts
export const THRESHOLDS = {
  speakingDominance: 0.4, // 40% speaking time triggers alert
  engagementLow: 0.3,     // Below 30% is low engagement
  meetingOverload: 8,     // More than 8 meetings/day
  patternFrequency: 3     // Pattern must occur 3+ times
}
```

## 📈 Best Practices

### 1. Data Quality
- Ensure good audio quality for accurate speaker analysis
- Use consistent participant emails for better tracking
- Complete meeting titles and descriptions

### 2. Privacy
- All AI analysis happens within organization boundaries
- Voice fingerprints are anonymized
- Compliance with GDPR and data protection

### 3. Gradual Rollout
- Start with predictions and briefs
- Add real-time features once comfortable
- Enable automation features last

### 4. Feedback Loop
- Review AI predictions vs. actual outcomes
- Adjust thresholds based on your organization
- Report inaccuracies to improve models

## 🐛 Troubleshooting

### Common Issues

1. **Predictions Not Appearing**:
   - Check feature flags are enabled
   - Ensure sufficient historical data (5+ meetings)
   - Verify API keys are configured

2. **Speaker Recognition Issues**:
   - Check audio quality
   - Ensure consistent speaker names
   - Rebuild voice fingerprints if needed

3. **Low Accuracy**:
   - AI improves with more data
   - Ensure meeting types are correctly set
   - Check language settings (Hungarian/English)

### Debug Mode
Enable debug logging:
```typescript
localStorage.setItem('ai_debug', 'true')
```

## 🚦 Performance Considerations

- AI features add 2-5 seconds to meeting processing
- Real-time features use WebSocket connections
- Embeddings are cached for 24 hours
- Background jobs process heavy analytics

## 📚 Further Reading

- [AI Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Privacy Policy](./PRIVACY.md)
- [API Documentation](./API.md)
- [Feature Roadmap](./ROADMAP.md)

## 💡 Feature Ideas & Feedback

We're constantly improving our AI features. Share your ideas:
- Email: ai-feedback@hangjegyzet.hu
- Slack: #ai-features
- GitHub: issues/feature-requests

---

Last updated: 2025-01-08