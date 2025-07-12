# Customer Migration Plan: Mode-Based Pricing

## Overview
This document outlines the migration strategy for existing customers from the old minute-based pricing to the new mode-based allocation system.

## Migration Timeline

### Phase 1: Preparation (Week 1-2)
- Deploy new pricing structure code
- Run database migrations
- Test mode allocation system
- Prepare customer communications

### Phase 2: Soft Launch (Week 3-4)
- Enable new pricing for NEW customers only
- Existing customers remain on old plans
- Monitor system performance
- Gather feedback

### Phase 3: Customer Communication (Week 5)
- Email all existing customers about changes
- Provide 30-day notice
- Offer migration incentives
- Set up support resources

### Phase 4: Migration (Week 6-8)
- Migrate customers in batches
- Provide grace period
- Handle edge cases
- Monitor usage patterns

## Customer Mapping

### Current Plans → New Plans

| Old Plan | Old Price | New Plan | New Price | Change |
|----------|-----------|----------|-----------|---------|
| Trial (Free) | 0 Ft | Trial | 0 Ft | Updated limits |
| Starter | 24,900 Ft | Profi | 29,990 Ft | +20% |
| Professional | 74,900 Ft | Vállalati | 89,990 Ft | +20% |
| Enterprise | 224,900 Ft | Multinational | €599 | New tier |

### Migration Benefits for Customers

1. **Starter → Profi Migration**
   - Old: 500 minutes (any type)
   - New: 2000 fast + 500 balanced + 50 precision = 2550 total minutes
   - **5x more minutes** with mode flexibility

2. **Professional → Vállalati Migration**
   - Old: 2000 minutes (any type)
   - New: 10,000 fast + 2,000 balanced + 200 precision = 12,200 total minutes
   - **6x more minutes** with better quality options

3. **Enterprise → Multinational Migration**
   - Old: Unlimited minutes
   - New: Unlimited fast + 10,000 balanced + 1,000 precision
   - Better cost control with premium modes

## Communication Templates

### Email 1: Announcement (30 days before)
```
Subject: Fontos változások a HangJegyzet árazásában - Több érték ugyanazon az áron

Kedves [Name],

Örömmel jelentjük be, hogy jelentősen fejlesztettük szolgáltatásunkat! 

Új, mód-alapú árazási rendszerünk 3 átírási módot kínál:
• Fast - Gyors átírás jó minőségű hanganyagokhoz
• Balanced - Kiegyensúlyozott mód a legtöbb meetinghez  
• Precision - Maximális pontosság kritikus megbeszélésekhez

Az Ön jelenlegi [Current Plan] csomagja automatikusan [New Plan] csomagra kerül átállításra [Migration Date] dátummal.

Előnyök:
- 5-6x több perc összesen
- Rugalmas mód választás
- Jobb költségkontroll

Részletek: [Link to FAQ]

Üdvözlettel,
A HangJegyzet csapata
```

### Email 2: Reminder (7 days before)
```
Subject: Emlékeztető: HangJegyzet csomag váltás 7 nap múlva

[Shorter reminder with key dates and support contact]
```

## Technical Migration Steps

### 1. Database Migration
```sql
-- Update organization subscription tiers
UPDATE organizations 
SET subscription_tier = CASE 
  WHEN subscription_tier = 'starter' THEN 'profi'
  WHEN subscription_tier = 'professional' THEN 'vallalati'
  WHEN subscription_tier = 'enterprise' THEN 'multinational'
  ELSE subscription_tier
END
WHERE subscription_tier IN ('starter', 'professional', 'enterprise');
```

### 2. Billing Adjustments
- Update Stripe/Billingo subscriptions
- Apply promotional pricing for 3 months
- Handle prorated charges

### 3. Usage Reset
- Keep historical data
- Reset monthly counters
- Initialize mode allocations

## Special Cases

### Grandfathering Options
For customers who may be negatively impacted:

1. **High-Volume Users**
   - If using >80% of precision equivalent minutes
   - Offer 6-month grandfather pricing
   - Custom negotiation for enterprise

2. **Price-Sensitive Customers**
   - Offer 3-month discount (20% off)
   - Option to downgrade to Induló
   - Extended trial of new features

### Churn Prevention
1. **At-Risk Identification**
   - Customers with <50% usage
   - Recent support complaints
   - Payment failures

2. **Retention Offers**
   - 50% off for 3 months
   - Free consultation on mode usage
   - Custom onboarding session

## Success Metrics

### Week 1-2 Post-Migration
- Migration completion rate: >95%
- Support ticket volume: <2x normal
- Churn rate: <10%

### Month 1 Post-Migration
- Mode usage distribution
- Revenue impact
- Customer satisfaction scores
- Feature adoption rates

## FAQ for Support Team

**Q: Why are prices increasing?**
A: While the base price is slightly higher, customers get 5-6x more minutes and the flexibility to choose quality levels based on their needs.

**Q: Can I keep my old plan?**
A: We're standardizing on the new system for better service. However, we offer grandfather pricing for qualifying high-volume customers.

**Q: What if I only need basic transcription?**
A: The new Induló plan at 9,990 Ft provides 500 fast minutes - perfect for basic needs at a lower price than the old Starter plan.

**Q: How do I know which mode to use?**
A: Our system recommends the optimal mode based on audio quality. Fast mode works great for 90% of meetings.

## Risk Mitigation

1. **Technical Risks**
   - Rollback plan ready
   - Gradual migration (not all at once)
   - Extra monitoring during migration

2. **Business Risks**
   - Churn budget allocated
   - Customer success team expanded
   - Executive escalation path

3. **Communication Risks**
   - Multi-channel approach
   - Clear, simple messaging
   - Emphasis on value, not price

## Post-Migration Review

### Week 2 Checklist
- [ ] All customers successfully migrated
- [ ] Billing systems updated
- [ ] Support tickets resolved
- [ ] Churn analysis complete
- [ ] Revenue impact assessed
- [ ] Customer feedback collected
- [ ] Mode usage patterns analyzed
- [ ] Next steps determined

## Conclusion

This migration represents a significant improvement in our service offering. While some customers may experience price increases, the value proposition is substantially better with 5-6x more minutes and quality flexibility. The key to success is clear communication, generous transition support, and quick response to any issues.