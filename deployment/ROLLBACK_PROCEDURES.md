# HangJegyzet Production Rollback Procedures

## Overview

This document provides comprehensive rollback procedures for the HangJegyzet production deployment. Follow these procedures in case of critical issues requiring immediate reversion to a previous stable state.

## Table of Contents

1. [Emergency Response Framework](#emergency-response-framework)
2. [Rollback Decision Matrix](#rollback-decision-matrix)
3. [Application Rollback](#application-rollback)
4. [Database Rollback](#database-rollback)
5. [Feature Flag Management](#feature-flag-management)
6. [Cache and CDN Management](#cache-and-cdn-management)
7. [Load Balancer Updates](#load-balancer-updates)
8. [Communication Procedures](#communication-procedures)
9. [Verification Steps](#verification-steps)
10. [Post-Rollback Analysis](#post-rollback-analysis)

## Emergency Response Framework

### Severity Levels

| Level | Description | Response Time | Decision Authority |
|-------|-------------|---------------|-------------------|
| P0 | Complete service outage | < 5 minutes | On-call engineer |
| P1 | Major feature broken, >30% users affected | < 15 minutes | On-call + Tech Lead |
| P2 | Significant degradation, 10-30% affected | < 30 minutes | Tech Lead |
| P3 | Minor issues, <10% affected | < 2 hours | Product Manager |

### Emergency Contacts

- **Primary On-Call**: Check PagerDuty/OpsGenie
- **Tech Lead**: [Contact via Slack #emergency]
- **DevOps Lead**: [Contact via Slack #emergency]
- **Product Manager**: [Contact via Slack #emergency]
- **CEO**: [Contact only for P0 incidents]

## Rollback Decision Matrix

| Symptom | Metrics Threshold | Rollback Type | Script |
|---------|------------------|---------------|--------|
| High error rate | >5% 5xx errors | Application | `rollback-application.sh` |
| Database errors | >100 errors/min | Database | `rollback-migration.sh` |
| Performance degradation | p95 latency >5s | Feature flags | `disable-features.sh` |
| Payment failures | >10% failure rate | Full rollback | All scripts |
| Data corruption | Any occurrence | Database + App | Full procedure |

## Application Rollback

### Quick Rollback Steps

1. **Immediate Actions** (< 2 minutes)
   ```bash
   # Run the application rollback script
   ./deployment/rollback-application.sh
   ```

2. **Manual Steps if Script Fails**
   ```bash
   # 1. Get previous deployment ID from Vercel
   vercel ls --prod | head -5
   
   # 2. Rollback to specific deployment
   vercel rollback [deployment-id] --prod
   
   # 3. Verify rollback
   curl -I https://hangjegyzet.hu
   ```

3. **Alternative: Git-based Rollback**
   ```bash
   # Find the last known good commit
   git log --oneline -10
   
   # Create rollback branch
   git checkout -b emergency-rollback [commit-hash]
   
   # Force deploy
   vercel --prod --force
   ```

### Application Components

- **Frontend**: Next.js application on Vercel
- **API Routes**: Vercel Functions
- **Static Assets**: Vercel CDN
- **Environment Variables**: Vercel dashboard

## Database Rollback

### Prerequisites

- Database backup available (check `./backups/` directory)
- `DATABASE_URL` environment variable set
- PostgreSQL client installed

### Rollback Options

1. **Feature-Specific Rollback** (Recommended)
   ```bash
   # Removes only mode-based pricing features
   ./deployment/rollback-migration.sh
   # Select option 1: SQL-based rollback
   ```

2. **Point-in-Time Recovery**
   ```bash
   # List available backups
   ./deployment/rollback-migration.sh
   # Select option 3: List backups
   # Then option 2: Full restore
   ```

3. **Manual Emergency Rollback**
   ```sql
   -- Connect to database
   psql $DATABASE_URL
   
   -- Start transaction
   BEGIN;
   
   -- Drop mode-based tables
   DROP TABLE IF EXISTS mode_usage CASCADE;
   DROP TABLE IF EXISTS alerts CASCADE;
   DROP TABLE IF EXISTS webhook_notifications CASCADE;
   
   -- Remove added columns
   ALTER TABLE meetings DROP COLUMN IF EXISTS transcription_mode;
   ALTER TABLE organizations DROP COLUMN IF EXISTS webhook_url;
   
   -- Verify and commit
   COMMIT;
   ```

## Feature Flag Management

### Emergency Disable All Features

```bash
# Run the feature disable script
./deployment/disable-features.sh --all
```

### Disable Specific Features

```bash
# Disable individual features
./deployment/disable-features.sh --feature mode-based-pricing-enabled
./deployment/disable-features.sh --feature migration-wizard-enabled
```

### Manual Feature Flag Control

1. **LaunchDarkly**
   ```bash
   # Via API
   curl -X PATCH https://api.launchdarkly.com/api/v2/flags/default/[flag-key] \
     -H "Authorization: $LD_API_KEY" \
     -H "Content-Type: application/json" \
     -d '[{"op": "replace", "path": "/on", "value": false}]'
   ```

2. **Vercel Environment Variables**
   ```bash
   # Disable via environment variable
   vercel env rm FEATURE_MODE_BASED_PRICING production
   vercel env add FEATURE_MODE_BASED_PRICING production < echo "false"
   ```

## Cache and CDN Management

### Clear All Caches

```bash
# Run the cache clear script
./deployment/clear-caches.sh --all
```

### Specific Cache Operations

1. **Vercel CDN**
   ```bash
   # Clear Vercel cache
   curl -X POST https://api.vercel.com/v1/integrations/purge-cache \
     -H "Authorization: Bearer $VERCEL_TOKEN"
   ```

2. **Application Cache**
   ```bash
   # Clear Redis cache (if applicable)
   redis-cli FLUSHALL
   
   # Clear in-memory caches
   curl -X POST https://hangjegyzet.hu/api/admin/clear-cache \
     -H "X-Admin-Key: $ADMIN_KEY"
   ```

3. **Browser Cache**
   - Update cache headers
   - Bump asset versions
   - Force refresh via meta tags

## Load Balancer Updates

### Vercel Automatic Handling

Vercel automatically handles load balancing during rollbacks. However, for custom configurations:

1. **Update Edge Config**
   ```bash
   vercel env pull
   # Edit .env.production.local
   vercel env push
   ```

2. **DNS Failover** (if needed)
   - Update DNS to point to backup deployment
   - TTL should be set to 60 seconds for quick propagation

## Communication Procedures

### Internal Communication

1. **Immediate Notification** (< 5 minutes)
   ```
   @channel EMERGENCY: Production rollback initiated
   - Issue: [Brief description]
   - Impact: [User impact]
   - ETA: [Resolution time]
   - Lead: [Person handling]
   ```

2. **Status Updates** (every 15 minutes)
   ```
   UPDATE [timestamp]:
   - Current status: [Rollback progress]
   - Metrics: [Error rates, performance]
   - Next steps: [What's being done]
   ```

### External Communication

1. **Status Page Update**
   - Post to status.hangjegyzet.hu
   - Use pre-approved templates

2. **Customer Email** (if downtime > 30 minutes)
   ```
   Subject: Service Interruption - HangJegyzet
   
   We are currently experiencing technical difficulties.
   Our team is working to resolve this immediately.
   
   Current Status: [Status]
   Expected Resolution: [Time]
   
   We apologize for any inconvenience.
   ```

3. **Social Media** (if asked)
   - Acknowledge the issue
   - Direct to status page
   - Avoid technical details

## Verification Steps

### Automated Verification

```bash
# Run the verification script
./deployment/verify-rollback.sh
```

### Manual Verification Checklist

1. **Application Health**
   - [ ] Homepage loads (< 3 seconds)
   - [ ] Login works
   - [ ] API health endpoint returns 200
   - [ ] No JavaScript errors in console

2. **Core Features**
   - [ ] File upload works
   - [ ] Transcription processes
   - [ ] User dashboard accessible
   - [ ] Payment system operational

3. **Metrics Verification**
   - [ ] Error rate < 0.1%
   - [ ] Response time < 3s (p95)
   - [ ] Database connections stable
   - [ ] Queue processing normal

4. **Feature Flag Status**
   - [ ] All emergency flags disabled
   - [ ] Configuration synchronized
   - [ ] No split-brain scenarios

## Post-Rollback Analysis

### Immediate Tasks (within 2 hours)

1. **Incident Report**
   ```markdown
   ## Incident Report [Date]
   
   ### Summary
   - Start time:
   - End time:
   - Duration:
   - Impact:
   
   ### Root Cause
   [Detailed explanation]
   
   ### Timeline
   [Chronological events]
   
   ### Action Items
   [Prevention measures]
   ```

2. **Metrics Collection**
   - Export error logs
   - Save performance metrics
   - Capture user reports
   - Document rollback steps taken

### Follow-up Tasks (within 24 hours)

1. **Root Cause Analysis (RCA)**
   - Schedule RCA meeting
   - Identify contributing factors
   - Document lessons learned
   - Create prevention plan

2. **Communication**
   - Send RCA to stakeholders
   - Update customers if needed
   - Post public postmortem (if appropriate)

3. **Improvements**
   - Update rollback procedures
   - Add missing monitoring
   - Improve automated tests
   - Update runbooks

### Prevention Measures

1. **Technical Improvements**
   - Add canary deployments
   - Improve staging environment
   - Enhance monitoring coverage
   - Add chaos testing

2. **Process Improvements**
   - Review deployment checklist
   - Update rollback procedures
   - Improve communication flow
   - Schedule fire drills

## Appendix

### Useful Commands

```bash
# Check current deployment
vercel inspect

# View recent deployments
vercel ls --prod

# Check database status
psql $DATABASE_URL -c "SELECT version();"

# Monitor real-time logs
vercel logs --prod --follow

# Check feature flag status
curl https://hangjegyzet.hu/api/feature-flags
```

### Environment Variables Reference

| Variable | Purpose | Rollback Action |
|----------|---------|-----------------|
| `FEATURE_FLAGS_KEY` | Feature management | Update to disable features |
| `DATABASE_URL` | Database connection | No change needed |
| `VERCEL_ENV` | Deployment environment | Automatically managed |
| `SENTRY_DSN` | Error tracking | Keep for debugging |

### Recovery Time Objectives (RTO)

- Application rollback: < 5 minutes
- Database rollback: < 15 minutes
- Full system recovery: < 30 minutes
- Data recovery: < 2 hours

### Rollback Testing Schedule

- Monthly: Application rollback drill
- Quarterly: Database rollback drill
- Bi-annually: Full disaster recovery test

---

**Last Updated**: 2025-01-07
**Document Version**: 1.0
**Owner**: DevOps Team
**Review Schedule**: Monthly