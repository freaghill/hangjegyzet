# Real-Time Meeting Intelligence Guide

## Overview

HangJegyzet's real-time meeting intelligence provides live coaching, contextual suggestions, fact-checking, and decision tracking during meetings. These features work together to enhance meeting productivity and ensure nothing important is missed.

## Core Components

### 1. Live Coach (`/lib/realtime/live-coach.ts`)

The Live Coach monitors meeting dynamics in real-time and provides actionable coaching tips.

**Features:**
- **Speaking Balance Monitoring**: Tracks who's dominating the conversation
- **Participation Tracking**: Alerts when someone hasn't spoken for 5+ minutes
- **Meeting Pace Analysis**: Detects if discussion is too fast/slow
- **Energy Level Monitoring**: Suggests breaks after 45 minutes
- **Interruption Detection**: Coaches on letting others finish
- **Hungarian Business Culture**: Provides cultural coaching for formality and hierarchy

**Key Metrics:**
```typescript
interface SpeakerMetrics {
  speakerId: string
  totalSpeakingTime: number
  turnCount: number
  interruptionCount: number
  silencePeriods: number
}
```

**Usage Example:**
```typescript
import { getLiveCoach } from '@/lib/realtime/live-coach'

const coach = getLiveCoach()

// Process transcript segments
coach.processSegment({
  speaker: "John Doe",
  text: "I think we should consider...",
  startTime: Date.now(),
  endTime: Date.now() + 5000
})

// Listen for coaching tips
coach.on('coaching:tip', (tip) => {
  console.log(`${tip.severity}: ${tip.title} - ${tip.actionable}`)
})

// Get current metrics
const metrics = coach.getMetricsSummary()
```

### 2. Suggestion Engine (`/lib/realtime/suggestion-engine.ts`)

Provides context-aware suggestions to improve meeting flow and outcomes.

**Features:**
- **Question Suggestions**: Context-aware questions to explore topics deeper
- **Topic Transitions**: Smooth transition phrases between topics
- **Sales Closing Techniques**: Detects buying signals and suggests closing strategies
- **Time Management**: Alerts when meetings run long
- **Follow-up Generation**: Creates follow-up questions for unanswered queries
- **Action Item Clarification**: Prompts for missing details (assignee, deadline)

**Suggestion Types:**
- `question`: Exploratory or clarifying questions
- `transition`: Topic transition recommendations
- `closing`: Sales closing opportunities
- `time`: Time management alerts
- `follow-up`: Unanswered question reminders
- `action`: Action item related suggestions
- `clarification`: Requests for more details

**Usage Example:**
```typescript
import { getSuggestionEngine } from '@/lib/realtime/suggestion-engine'

const engine = getSuggestionEngine('sales') // or 'team', 'review', 'planning', 'general'

// Get current suggestions
const suggestions = engine.getSuggestions()
suggestions.forEach(suggestion => {
  if (suggestion.priority === 'high' && suggestion.timing === 'immediate') {
    // Display to user immediately
  }
})

// Track action items
const actionItems = engine.getActionItems()
```

### 3. Fact Checker (`/lib/realtime/fact-checker.ts`)

Verifies facts and tracks commitments in real-time.

**Features:**
- **Number Verification**: Checks numerical consistency
- **Commitment Tracking**: Monitors promises and deadlines
- **Contradiction Detection**: Finds conflicting statements
- **Historical Reference**: Compares with past meeting data
- **Statistical Validation**: Verifies percentage claims
- **Date Consistency**: Checks timeline conflicts

**Fact Check Types:**
- `number`: Numerical inconsistencies
- `commitment`: Commitment tracking
- `contradiction`: Conflicting statements
- `reference`: Historical data comparison
- `statistic`: Statistical claim verification
- `date`: Date/deadline issues

**Usage Example:**
```typescript
import { getFactChecker } from '@/lib/realtime/fact-checker'

const factChecker = getFactChecker()

// Process segments for fact checking
await factChecker.processSegment(segment)

// Get fact check results
const results = factChecker.getResults()
results.forEach(result => {
  if (result.severity === 'error') {
    // Highlight critical fact errors
    console.error(`${result.speaker}: ${result.issue}`)
  }
})

// Track commitments
const commitments = factChecker.getCommitments()
```

### 4. Decision Tracker (`/lib/realtime/decision-tracker.ts`)

Tracks decisions throughout the meeting and ensures quality.

**Features:**
- **Decision Detection**: Identifies when decisions are proposed
- **Quality Scoring**: Rates decision quality (0-100)
- **Stakeholder Tracking**: Monitors who agrees/disagrees
- **Conflict Detection**: Finds contradicting decisions
- **Auto-documentation**: Creates decision summaries

**Decision Quality Metrics:**
- Has clear rationale
- Considers alternatives
- Includes risk assessment
- Defines success criteria
- Assigns ownership
- Sets timeline

**Usage Example:**
```typescript
import { getDecisionTracker } from '@/lib/realtime/decision-tracker'

const tracker = getDecisionTracker()

// Get current decisions
const decisions = tracker.getDecisions('agreed')

// Listen for decision events
tracker.on('decision:proposed', (decision) => {
  console.log(`New decision proposed: ${decision.description}`)
})

tracker.on('decision:conflict', (conflict) => {
  console.warn(`Conflict detected: ${conflict.description}`)
})
```

## API Endpoints

### Suggestions API
```
GET /api/realtime/suggestions?meetingId={id}&type={type}
POST /api/realtime/suggestions
  - Actions: dismiss, confirmAction
```

### Coaching API
```
GET /api/realtime/coaching?meetingId={id}&limit={limit}
POST /api/realtime/coaching
  - Actions: recordBreak, reset
```

### Fact Check API
```
GET /api/realtime/factcheck?meetingId={id}&type={type}
POST /api/realtime/factcheck
  - Actions: resolve, updateCommitment, reset
PUT /api/realtime/factcheck
  - Manual fact checking
```

### Decisions API
```
GET /api/realtime/decisions?meetingId={id}&status={status}
POST /api/realtime/decisions
  - Actions: updateStatus, resolveConflict, reset
PUT /api/realtime/decisions
  - Export decisions (JSON/Markdown)
```

## Integration Example

```typescript
import { MeetingIntelligenceOrchestrator } from '@/lib/realtime/integration-example'

// Create orchestrator for a sales meeting
const intelligence = new MeetingIntelligenceOrchestrator(meetingId, 'sales')

// Start intelligence monitoring
intelligence.start()

// Process transcript segments
intelligence.processSegment({
  id: 'seg-1',
  meetingId: meetingId,
  speaker: 'John Doe',
  text: 'We need to increase our budget by 50%',
  startTime: Date.now(),
  endTime: Date.now() + 3000,
  confidence: 0.95
})

// Listen for intelligence events
intelligence.on('intelligence:event', (event) => {
  switch(event.type) {
    case 'coaching':
      // Display coaching tip
      break
    case 'suggestion':
      // Show suggestion
      break
    case 'factcheck':
      // Highlight fact issue
      break
    case 'decision':
      // Track decision
      break
    case 'alert':
      // Show important alert
      break
  }
})

// Get comprehensive summary
const summary = intelligence.getSummary()

// Clean up
intelligence.destroy()
```

## Best Practices

### 1. Non-Intrusive Design
- Display suggestions as subtle notifications
- Allow users to dismiss/snooze tips
- Prioritize high-severity items
- Batch similar notifications

### 2. Performance Optimization
- Process segments asynchronously
- Maintain reasonable buffer sizes
- Use debouncing for UI updates
- Clean up old data regularly

### 3. Privacy & Security
- Process data locally when possible
- Encrypt sensitive information
- Respect user preferences
- Allow opt-out options

### 4. Cultural Sensitivity
- Adapt coaching to local business culture
- Support multiple languages
- Consider hierarchy in suggestions
- Respect formal/informal preferences

## Configuration

### Thresholds and Timings
```typescript
// Customize thresholds
const SILENCE_THRESHOLD = 5000 // 5 seconds
const PARTICIPATION_WARNING = 300000 // 5 minutes
const MONOLOGUE_WARNING = 120000 // 2 minutes
const BREAK_INTERVAL = 2700000 // 45 minutes
```

### Language Support
The system supports both English and Hungarian with automatic detection:
- English patterns: "will", "suggest", "agree"
- Hungarian patterns: "fog", "javaslom", "egyetértek"

## Troubleshooting

### Common Issues

1. **Too Many Notifications**
   - Adjust severity thresholds
   - Implement notification grouping
   - Add user preference controls

2. **False Positives in Fact Checking**
   - Tune confidence thresholds
   - Add context validation
   - Implement user feedback loop

3. **Missed Decisions**
   - Expand decision patterns
   - Add industry-specific keywords
   - Train on organization's language

## Future Enhancements

1. **AI-Powered Insights**
   - GPT integration for deeper analysis
   - Custom ML models for organization
   - Predictive meeting outcomes

2. **Advanced Analytics**
   - Meeting effectiveness scoring
   - Team dynamics analysis
   - Long-term trend tracking

3. **Integration Expansions**
   - CRM auto-updates
   - Calendar integration
   - Task management sync

## Support

For questions or issues:
- Technical documentation: `/docs/TECHNICAL_ARCHITECTURE.md`
- API reference: `/docs/API_REFERENCE.md`
- Support email: support@hangjegyzet.com