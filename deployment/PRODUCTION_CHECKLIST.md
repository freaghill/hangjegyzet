# Production Deployment Checklist - Mode-Based Pricing

## Pre-Deployment (T-7 days)

### 1. Infrastructure Readiness
- [ ] **Database**
  - [ ] Backup current production database
  - [ ] Test migration scripts on staging
  - [ ] Verify rollback procedures
  - [ ] Schedule maintenance window
  ```bash
  # Backup command
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Environment Variables**
  - [ ] `OPENAI_API_KEY` - Verified and rate limits increased
  - [ ] `ANTHROPIC_API_KEY` - For Precision mode
  - [ ] `RESEND_API_KEY` - For email alerts
  - [ ] `SLACK_WEBHOOK_URL` - For alerts
  - [ ] `INTERNAL_WEBHOOK_SECRET` - For cron jobs
  - [ ] `CRON_SECRET` - For scheduled tasks
  - [ ] `SENTRY_DSN` - Error tracking
  - [ ] `STRIPE_SECRET_KEY` - Payment processing
  - [ ] `FEATURE_FLAGS_KEY` - Feature toggles

### 2. Code Readiness
- [ ] All tests passing
  ```bash
  npm run test:ci
  npm run test:e2e
  npm run test:load
  ```
- [ ] No TypeScript errors
  ```bash
  npm run typecheck
  ```
- [ ] ESLint clean
  ```bash
  npm run lint
  ```
- [ ] Build successful
  ```bash
  npm run build:prod
  ```

### 3. Feature Flags Setup
- [ ] Create feature flags in LaunchDarkly/Vercel
  - `mode-based-pricing-enabled`
  - `migration-wizard-enabled`
  - `new-upload-flow-enabled`
  - `usage-monitoring-enabled`
  - `rate-limiting-enabled`

### 4. Monitoring Setup
- [ ] Sentry project configured
- [ ] Datadog/CloudWatch dashboards created
- [ ] Alerts configured for:
  - [ ] High error rates
  - [ ] API response times > 3s
  - [ ] Database connection issues
  - [ ] Rate limit violations
  - [ ] Anomaly detection triggers

## Deployment Day (T-0)

### Phase 1: Database Migration (00:00 - 01:00)
```bash
# Run migrations in order
psql $DATABASE_URL -f supabase/migrations/20250107_mode_based_usage.sql
psql $DATABASE_URL -f supabase/migrations/20250107_alerts_system.sql
psql $DATABASE_URL -f supabase/migrations/20250107_webhook_notifications.sql
psql $DATABASE_URL -f supabase/migrations/20250107_get_current_month_usage.sql

# Verify migrations
psql $DATABASE_URL -c "SELECT * FROM pg_tables WHERE tablename IN ('mode_usage', 'alerts', 'webhook_notifications');"
```

### Phase 2: Deploy Application (01:00 - 02:00)
- [ ] Deploy to Vercel with feature flags OFF
  ```bash
  vercel --prod --env-file=.env.production
  ```
- [ ] Verify deployment health
- [ ] Run smoke tests
- [ ] Check error rates in Sentry

### Phase 3: Enable Features (02:00 - 03:00)
- [ ] Enable for internal team (10 users)
  ```javascript
  // Feature flag configuration
  {
    "mode-based-pricing-enabled": {
      "rules": [
        {
          "clause": "email",
          "operator": "endsWith",
          "value": "@hangjegyzet.hu"
        }
      ]
    }
  }
  ```
- [ ] Monitor for 30 minutes
- [ ] Check all dashboards

### Phase 4: Beta Rollout (Day 1-3)
- [ ] Enable for 5% of users
- [ ] Monitor:
  - [ ] Error rates
  - [ ] API performance
  - [ ] Mode selection distribution
  - [ ] Rate limit hits
- [ ] Collect feedback

### Phase 5: Full Rollout (Day 4-7)
- [ ] Enable for 25% → 50% → 100%
- [ ] Send migration emails in batches
- [ ] Monitor support tickets

## Post-Deployment Monitoring

### Day 1-7 Metrics
Track these KPIs daily:
- **Usage Metrics**
  - Mode distribution (Fast/Balanced/Precision %)
  - Average transcription time by mode
  - Rate limit violations per tier
  
- **Business Metrics**  
  - Migration completion rate
  - Upgrade/downgrade rate
  - Revenue impact
  - Churn rate

- **Technical Metrics**
  - API response times
  - Error rates by endpoint
  - Database query performance
  - Queue processing times

### Rollback Procedures

#### Application Rollback
```bash
# 1. Disable feature flags immediately
curl -X PATCH https://api.launchdarkly.com/api/v2/flags/default/mode-based-pricing-enabled \
  -H "Authorization: $LD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[{"op": "replace", "path": "/on", "value": false}]'

# 2. Revert to previous deployment
vercel rollback

# 3. Clear caches
curl -X POST https://api.vercel.com/v1/integrations/purge-cache \
  -H "Authorization: Bearer $VERCEL_TOKEN"
```

#### Database Rollback
```sql
-- Rollback migrations
DROP TABLE IF EXISTS webhook_notifications CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS mode_usage CASCADE;
DROP TYPE IF EXISTS transcription_mode CASCADE;

-- Restore from backup
psql $DATABASE_URL < backup_20250107_000000.sql
```

## Communication Plan

### T-7: Announcement Email
- Subject: "Új, rugalmasabb árazás érkezik a HangJegyzethez"
- Content: Benefits, timeline, FAQ link

### T-0: Migration Available Email
- Subject: "Az új árazási rendszer elérhető"
- Content: Migration wizard link, benefits reminder

### T+7: Follow-up Email
- Subject: "Még nem váltott? Segítünk!"
- Content: Support offer, deadline reminder

## Support Readiness

### Documentation
- [ ] User guide published
- [ ] FAQ updated
- [ ] Video tutorials created
- [ ] API docs updated

### Support Team
- [ ] Training completed
- [ ] Escalation procedures defined
- [ ] Common issues documented
- [ ] Response templates created

## Success Criteria

### Technical Success
- ✅ < 0.1% error rate
- ✅ < 3s p95 API response time
- ✅ No data loss
- ✅ < 5 critical bugs in first week

### Business Success
- ✅ > 80% migration rate in 30 days
- ✅ < 5% churn increase
- ✅ > 10% revenue increase
- ✅ NPS score maintained or improved

## Emergency Contacts

- **Technical Lead**: +36 XX XXX XXXX
- **Product Manager**: +36 XX XXX XXXX
- **DevOps On-Call**: +36 XX XXX XXXX
- **Customer Success**: +36 XX XXX XXXX

## Sign-offs

- [ ] Engineering: _________________ Date: _______
- [ ] Product: ____________________ Date: _______
- [ ] QA: ________________________ Date: _______
- [ ] DevOps: ____________________ Date: _______
- [ ] Customer Success: ___________ Date: _______
- [ ] CEO: _______________________ Date: _______