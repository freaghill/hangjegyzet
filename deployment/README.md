# HangJegyzet Deployment Scripts and Procedures

This directory contains all deployment, rollback, and incident response procedures for HangJegyzet production environment.

## Quick Start - Emergency Rollback

If you need to perform an emergency rollback:

```bash
# 1. Quick application rollback (< 5 minutes)
./rollback-application.sh --force

# 2. Disable all features immediately
./disable-features.sh --all --emergency

# 3. Clear all caches
./clear-caches.sh --all

# 4. Verify rollback success
./verify-rollback.sh --quick
```

## Directory Contents

### Documentation

- **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** - Complete deployment checklist
- **[ROLLBACK_PROCEDURES.md](./ROLLBACK_PROCEDURES.md)** - Comprehensive rollback procedures
- **[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)** - Incident response playbook
- **[verify-rollback.md](./verify-rollback.md)** - Manual rollback verification checklist

### Scripts

#### Deployment Scripts
- **[migrate-production.sh](./migrate-production.sh)** - Production database migration script
- **[rollback-migration.sh](./rollback-migration.sh)** - Database rollback script

#### Emergency Response Scripts
- **[rollback-application.sh](./rollback-application.sh)** - Application rollback script
- **[disable-features.sh](./disable-features.sh)** - Feature flag emergency disable
- **[clear-caches.sh](./clear-caches.sh)** - Cache clearing utility
- **[verify-rollback.sh](./verify-rollback.sh)** - Automated rollback verification

## Common Scenarios

### 1. High Error Rate (>5%)
```bash
./rollback-application.sh --force
./verify-rollback.sh --quick
```

### 2. Performance Degradation
```bash
./clear-caches.sh --all
./disable-features.sh --feature rate-limiting-enabled
```

### 3. Database Issues
```bash
./rollback-migration.sh
# Select option 1 for SQL-based rollback
```

### 4. Complete Service Outage
```bash
# Run all emergency procedures
./rollback-application.sh --force
./disable-features.sh --all --emergency
./clear-caches.sh --all
./verify-rollback.sh --continuous
```

## Environment Variables

Required environment variables for scripts:

```bash
# Vercel
export VERCEL_TOKEN="your-vercel-token"

# Database
export DATABASE_URL="postgresql://..."

# Feature Flags
export LD_API_KEY="launchdarkly-api-key"

# Monitoring
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
export ADMIN_KEY="admin-api-key"

# Optional
export REDIS_URL="redis://..."
export CLOUDFLARE_TOKEN="cf-token"
export CLOUDFLARE_ZONE="zone-id"
```

## Script Usage Details

### rollback-application.sh
```bash
# Rollback to specific deployment
./rollback-application.sh --deployment-id dpl_xxxxx

# Rollback to deployment from 2 hours ago
./rollback-application.sh --hours-ago 2

# Dry run (no changes)
./rollback-application.sh --dry-run
```

### disable-features.sh
```bash
# Disable all features
./disable-features.sh --all

# Disable specific feature
./disable-features.sh --feature mode-based-pricing-enabled

# List all features
./disable-features.sh --list

# Emergency mode (no confirmations)
./disable-features.sh --all --emergency
```

### clear-caches.sh
```bash
# Clear all caches
./clear-caches.sh --all

# Clear specific cache types
./clear-caches.sh --vercel
./clear-caches.sh --redis
./clear-caches.sh --application
```

### verify-rollback.sh
```bash
# Quick verification (5 min)
./verify-rollback.sh --quick

# Full verification (30 min)
./verify-rollback.sh --full

# Continuous monitoring
./verify-rollback.sh --continuous

# Generate report
./verify-rollback.sh --quick --report
```

## Best Practices

1. **Always verify after rollback**
   - Run `verify-rollback.sh` after any rollback operation
   - Check the generated reports in `./logs/`

2. **Document everything**
   - Use the incident response playbook
   - Fill out post-mortem templates
   - Update procedures based on lessons learned

3. **Test regularly**
   - Monthly rollback drills
   - Quarterly full disaster recovery tests
   - Keep scripts and documentation updated

4. **Communication is key**
   - Update status page immediately
   - Use Slack templates for consistency
   - Keep stakeholders informed

## Support

For questions or issues with these procedures:
- Slack: #devops or #emergency
- On-call: Check PagerDuty/OpsGenie
- Documentation: Update via PR

---

Last Updated: 2025-01-07
Version: 1.0