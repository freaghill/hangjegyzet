# Production Deployment Guide

This guide covers the complete process of deploying HangJegyzet.AI to production.

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests pass (`npm test`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] TypeScript builds without errors (`npm run build`)
- [ ] No console.log statements in production code
- [ ] All TODO comments addressed

### Security
- [ ] All API endpoints have authentication
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database connection uses SSL
- [ ] File upload limits enforced
- [ ] XSS and SQL injection protections verified

### Performance
- [ ] Images optimized and using Next.js Image component
- [ ] JavaScript bundles under 500KB
- [ ] Lighthouse score > 90
- [ ] Database queries optimized with indexes
- [ ] Redis caching implemented
- [ ] CDN configured for static assets

### Business Logic
- [ ] Payment flows tested with real cards
- [ ] Invoice generation working
- [ ] Email notifications sending
- [ ] Usage limits enforced correctly
- [ ] Subscription upgrades/downgrades work

## Environment Setup

### 1. Production Environment Variables

Create `.env.production` with production values:

```env
# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://hangjegyzet.ai
NEXTAUTH_URL=https://hangjegyzet.ai
NEXTAUTH_SECRET=<strong-production-secret>

# Database
DATABASE_URL=postgresql://hangjegyzet:<strong-password>@localhost:5432/hangjegyzet
DATABASE_POOL_URL=<pooled-connection-url>

# Redis
REDIS_URL=redis://:<password>@localhost:6379/0

# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-key>

# Payment Providers (Live Keys)
STRIPE_SECRET_KEY=sk_live_<key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_<key>
STRIPE_WEBHOOK_SECRET=whsec_<key>

SIMPLEPAY_MERCHANT=<live-merchant>
SIMPLEPAY_SECRET_KEY=<live-secret>
SIMPLEPAY_SANDBOX=false

BILLINGO_API_KEY=<live-api-key>
BILLINGO_BLOCK_ID=<live-block-id>

# Monitoring
SENTRY_DSN=https://<key>@sentry.io/<project>
NEXT_PUBLIC_SENTRY_DSN=https://<key>@sentry.io/<project>
```

### 2. Server Configuration

Ensure production server has:
- Ubuntu 22.04 LTS
- Node.js 18.x
- PostgreSQL 15
- Redis 7.x
- Nginx with SSL
- PM2 for process management
- Automated backups configured

## Deployment Process

### 1. Final Checks

```bash
# Ensure on main branch
git checkout main
git pull origin main

# Run all tests
npm test
npm run lint

# Build locally to verify
npm run build
```

### 2. Deploy to Production

```bash
# Run automated deployment
npm run deploy:production
```

This script will:
1. Run safety checks
2. Create backups
3. Build the application
4. Deploy with zero downtime
5. Verify deployment
6. Run post-deployment tasks

### 3. Manual Deployment (if needed)

```bash
# SSH to production server
ssh deploy@hangjegyzet.ai

# Navigate to app directory
cd /var/www/hangjegyzet.ai

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Run migrations
npm run db:migrate

# Restart services
pm2 reload all
```

## Post-Deployment Verification

### 1. Functional Tests

- [ ] Homepage loads correctly
- [ ] User can register/login
- [ ] File upload works
- [ ] Transcription processes correctly
- [ ] Payment flow completes
- [ ] Invoices generated
- [ ] Email notifications sent

### 2. Performance Monitoring

Check these metrics:
- Server CPU < 70%
- Memory usage < 80%
- Response time < 200ms
- Error rate < 0.1%
- Database query time < 100ms

### 3. Security Verification

```bash
# Check SSL certificate
curl -I https://hangjegyzet.ai

# Test security headers
curl -I https://hangjegyzet.ai | grep -E "X-Frame-Options|X-Content-Type"

# Verify HTTPS redirect
curl -I http://hangjegyzet.ai
```

## Rollback Procedure

If issues are detected:

### 1. Automatic Rollback

The deployment script automatically rolls back if health checks fail.

### 2. Manual Rollback

```bash
# SSH to production
ssh deploy@hangjegyzet.ai

# List releases
ls -la /var/www/hangjegyzet.ai/releases/

# Rollback to previous release
cd /var/www/hangjegyzet.ai
ln -sfn releases/<previous-release> current
pm2 reload all
```

### 3. Database Rollback

```bash
# Restore from backup
psql hangjegyzet < backups/db-backup-<timestamp>.sql
```

## Monitoring

### Real-time Monitoring

1. **Application Logs**
   ```bash
   pm2 logs hangjegyzet-prod
   pm2 monit
   ```

2. **Error Tracking**
   - Sentry dashboard: https://sentry.io/organizations/hangjegyzet
   - Check for new errors after deployment

3. **Performance Metrics**
   ```bash
   # Server metrics
   htop
   
   # Database connections
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Redis info
   redis-cli INFO stats
   ```

### Alerts Setup

Configure alerts for:
- High error rate (> 1%)
- Slow response time (> 500ms)
- High CPU usage (> 80%)
- Low disk space (< 10GB)
- Payment failures

## Maintenance Mode

To enable maintenance mode:

```bash
# Create maintenance file
touch /var/www/hangjegyzet.ai/maintenance.enabled

# Remove to disable
rm /var/www/hangjegyzet.ai/maintenance.enabled
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check PM2 processes: `pm2 list`
   - Review logs: `pm2 logs`
   - Restart if needed: `pm2 restart all`

2. **Database Connection Issues**
   - Check PostgreSQL: `sudo systemctl status postgresql`
   - Review connection pool: `psql -c "SHOW max_connections;"`

3. **High Memory Usage**
   - Check for memory leaks: `pm2 monit`
   - Review large file handling
   - Clear Redis if needed: `redis-cli FLUSHDB`

4. **Payment Processing Errors**
   - Verify API keys are production keys
   - Check webhook endpoints accessible
   - Review payment provider dashboards

## Communication

### Deployment Notification

After successful deployment, notify:
- Development team via Slack
- Support team via email
- Update status page if applicable

### If Issues Occur

1. Update status page immediately
2. Notify support team
3. Begin investigation
4. Communicate ETA for resolution

## Regular Maintenance

### Daily
- Review error logs
- Check disk space
- Monitor performance metrics

### Weekly
- Review security alerts
- Update dependencies (security patches)
- Backup verification

### Monthly
- Full system backup
- Performance optimization review
- Security audit
- Cost analysis

## Emergency Contacts

- **Technical Lead**: +36 XX XXX XXXX
- **DevOps**: +36 XX XXX XXXX
- **Payment Issues**: payments@hangjegyzet.ai
- **Security Issues**: security@hangjegyzet.ai

---

Last updated: $(date)
Next scheduled maintenance: First Sunday of the month, 3:00 AM CET