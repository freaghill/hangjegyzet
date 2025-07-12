# Mode-Based Pricing Migration Plan

## Overview
This document outlines the migration strategy for existing HangJegyzet customers from the current minute-based plans to the new mode-based pricing structure.

## Migration Timeline

### Phase 1: Announcement (Week 1-2)
- Email announcement to all existing customers
- In-app notifications
- Webinar for enterprise customers
- FAQ publication

### Phase 2: Preview Period (Week 3-6)
- Existing customers can preview new modes
- Usage simulator available
- Mode recommendation based on historical usage
- No changes to current billing

### Phase 3: Opt-in Migration (Week 7-10)
- Customers can voluntarily switch to new plans
- Early adopter benefits (10% discount for 3 months)
- Grandfathering option for those who prefer current plans
- Support team assistance for plan selection

### Phase 4: Full Migration (Week 11-12)
- Automatic migration for remaining customers
- 30-day grace period with both plans active
- Final grandfathering deadline

## Customer Mapping

### Current Plan → New Plan Mapping

| Current Plan | Minutes | Recommended New Plan | Mode Allocation |
|-------------|---------|---------------------|-----------------|
| Trial | 100 min | Trial | 100 Fast, 20 Balanced |
| Starter | 500 min | Indulo | 500 Fast, 100 Balanced |
| Professional | 2000 min | Profi | 2000 Fast, 500 Balanced, 50 Precision |
| Enterprise | 10000 min | Vallalati | 10000 Fast, 2000 Balanced, 200 Precision |
| Enterprise Custom | Unlimited | Multinational | Unlimited Fast, 10000 Balanced, 1000 Precision |

### Usage Pattern Analysis

```typescript
// Automated recommendation based on historical usage
export function recommendPlan(historicalUsage: UsageHistory): PlanRecommendation {
  const avgMonthlyMinutes = historicalUsage.averageMonthlyMinutes
  const audioQuality = historicalUsage.averageAudioQuality
  const meetingTypes = historicalUsage.meetingTypes
  
  // Calculate optimal mode distribution
  const fastPercentage = audioQuality > 0.8 ? 0.7 : 0.5
  const balancedPercentage = meetingTypes.includes('business') ? 0.25 : 0.3
  const precisionPercentage = meetingTypes.includes('legal') ? 0.05 : 0
  
  return {
    recommendedPlan: selectOptimalPlan(avgMonthlyMinutes),
    estimatedModeUsage: {
      fast: avgMonthlyMinutes * fastPercentage,
      balanced: avgMonthlyMinutes * balancedPercentage,
      precision: avgMonthlyMinutes * precisionPercentage
    }
  }
}
```

## Communication Templates

### Email Announcement

**Subject: Új, rugalmasabb árazás a HangJegyzetnél - Többet kap ugyanazért az árért**

Kedves [Customer Name],

Örömmel jelentjük be, hogy bevezettük az új mód-alapú árazási rendszerünket, amely még több rugalmasságot és értéket biztosít Önnek.

**Mi változik?**
- 3 átírási mód közül választhat minden meeting esetén
- Ugyanazért az árért több percet kap
- Jobb kontroll a költségek felett

**Az Ön jelenlegi csomagja:**
- Jelenlegi: [Current Plan] - [X] perc/hó
- Ajánlott új: [New Plan] - [X] Fast + [Y] Balanced + [Z] Precision perc

[Részletek megtekintése] [Maradok a jelenlegi csomaggal]

### In-App Notification

```javascript
{
  title: "Új mód-alapú árazás elérhető",
  message: "Fedezze fel az új Fast, Balanced és Precision módokat. Ugyanaz az ár, több lehetőség!",
  actions: [
    { label: "Részletek", action: "showMigrationGuide" },
    { label: "Később", action: "dismiss" }
  ]
}
```

## Technical Migration

### Database Updates

```sql
-- Add mode usage tracking for existing meetings
UPDATE meetings 
SET transcription_mode = 'balanced' 
WHERE transcription_mode IS NULL;

-- Initialize mode usage for current month
INSERT INTO mode_usage (organization_id, month, balanced_minutes)
SELECT 
  organization_id,
  date_trunc('month', CURRENT_DATE)::date,
  SUM(CEIL(duration_seconds / 60.0))::integer
FROM meetings
WHERE status = 'completed' 
  AND created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY organization_id
ON CONFLICT (organization_id, month) DO UPDATE SET
  balanced_minutes = mode_usage.balanced_minutes + EXCLUDED.balanced_minutes;
```

### API Compatibility

```typescript
// Backward compatibility wrapper
export class LegacyAPIWrapper {
  async createMeeting(params: LegacyMeetingParams): Promise<Meeting> {
    // Map legacy parameters to new mode-based system
    const mode = this.inferModeFromLegacy(params)
    return this.modernAPI.createMeeting({
      ...params,
      mode: mode || 'balanced'
    })
  }
  
  private inferModeFromLegacy(params: LegacyMeetingParams): TranscriptionMode {
    if (params.priority === 'high') return 'precision'
    if (params.quick === true) return 'fast'
    return 'balanced'
  }
}
```

## Support Resources

### Customer Success Playbook

1. **Plan Selection Assistance**
   - Usage analysis tool
   - Cost comparison calculator
   - Mode recommendation quiz

2. **Migration Support**
   - Dedicated migration hotline
   - Live chat with extended hours
   - Video tutorials in Hungarian

3. **FAQ Topics**
   - What happens to unused minutes?
   - Can I change plans mid-month?
   - How do modes affect accuracy?
   - Grandfathering terms

### Training Materials

- **For Customer Success Team**
  - Mode benefits cheat sheet
  - Common objection handling
  - Migration calculator training

- **For Customers**
  - "Choosing the Right Mode" guide
  - Video: "Maximizing Value with Mode-Based Pricing"
  - Interactive mode selector tool

## Success Metrics

### KPIs to Track

1. **Migration Rate**
   - Target: 80% voluntary migration
   - 95% total migration by deadline

2. **Customer Satisfaction**
   - NPS before/after migration
   - Support ticket volume
   - Churn rate comparison

3. **Revenue Impact**
   - ARPU changes
   - Upgrade/downgrade patterns
   - Mode usage distribution

### Monitoring Dashboard

```typescript
interface MigrationMetrics {
  totalCustomers: number
  migratedCustomers: number
  voluntaryMigrations: number
  pendingMigrations: number
  
  satisfactionScores: {
    preMigration: number
    postMigration: number
  }
  
  revenueImpact: {
    projectedMRR: number
    actualMRR: number
    variance: number
  }
  
  modeUsageDistribution: {
    fast: number
    balanced: number
    precision: number
  }
}
```

## Risk Mitigation

### Potential Issues & Solutions

1. **Customer Confusion**
   - Solution: Proactive education campaign
   - Mode selector wizard
   - Comparison tools

2. **Price Sensitivity**
   - Solution: Grandfathering option
   - Migration incentives
   - Value demonstration

3. **Technical Issues**
   - Solution: Phased rollout
   - Rollback capability
   - Extended support hours

## Post-Migration

### Month 1
- Daily monitoring of mode usage
- Proactive outreach to heavy users
- Adjustment recommendations

### Month 2-3
- Usage pattern analysis
- Plan optimization suggestions
- Success story collection

### Ongoing
- Quarterly business reviews
- Mode usage optimization tips
- Continuous education on new features