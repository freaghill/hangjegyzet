# Rollback Verification Checklist

This checklist ensures a comprehensive verification of the rollback process. Complete each section and mark items as they are verified.

## Pre-Rollback Status

- [ ] Document current error rates: __________%
- [ ] Document current response times (p95): __________ms
- [ ] Document affected features: _______________________
- [ ] Screenshot current status page
- [ ] Note number of affected users: __________

## Immediate Verification (0-5 minutes)

### 1. Service Availability
- [ ] Homepage loads successfully (https://hangjegyzet.hu)
- [ ] Login page accessible
- [ ] API health endpoint returns 200 (`/api/health`)
- [ ] Static assets loading correctly
- [ ] No SSL/TLS errors

### 2. Error Rates
- [ ] 5xx error rate < 0.1%
- [ ] 4xx error rate normal (< 2%)
- [ ] No spike in JavaScript errors
- [ ] Database connection errors resolved
- [ ] No timeout errors

### 3. Performance Metrics
- [ ] Page load time < 3 seconds
- [ ] API response time (p95) < 2 seconds
- [ ] Database query time < 500ms
- [ ] CPU usage < 70%
- [ ] Memory usage stable

## Core Functionality (5-15 minutes)

### 1. Authentication
- [ ] User can log in successfully
- [ ] Password reset works
- [ ] Session management functional
- [ ] OAuth providers working (if applicable)
- [ ] Logout functions correctly

### 2. File Operations
- [ ] File upload works
- [ ] File download accessible
- [ ] File deletion functional
- [ ] File sharing works
- [ ] Storage limits enforced

### 3. Transcription Service
- [ ] New transcription can be initiated
- [ ] Transcription processing completes
- [ ] Results are accurate
- [ ] Mode selection works (if rolled back)
- [ ] Progress indicators functional

### 4. User Dashboard
- [ ] Meeting list loads
- [ ] Search functionality works
- [ ] Filters apply correctly
- [ ] Pagination works
- [ ] Export features functional

### 5. Payment System
- [ ] Subscription page loads
- [ ] Payment form accessible
- [ ] Stripe integration functional
- [ ] Usage limits enforced
- [ ] Billing history available

## Feature Flag Verification (15-20 minutes)

### 1. Disabled Features
- [ ] Mode-based pricing disabled (if applicable)
- [ ] Migration wizard hidden
- [ ] New upload flow reverted
- [ ] Rate limiting adjusted
- [ ] Webhook notifications paused

### 2. Configuration Sync
- [ ] LaunchDarkly flags updated
- [ ] Environment variables correct
- [ ] API configuration matches
- [ ] No split-brain scenarios
- [ ] Cache cleared for flags

## Data Integrity (20-30 minutes)

### 1. Database Checks
- [ ] No data loss confirmed
- [ ] Foreign key constraints valid
- [ ] Indexes intact
- [ ] Sequences/auto-increments correct
- [ ] No orphaned records

### 2. User Data
- [ ] User accounts accessible
- [ ] Meeting history intact
- [ ] Transcriptions available
- [ ] Settings preserved
- [ ] Subscription data correct

### 3. File Storage
- [ ] Uploaded files accessible
- [ ] Audio files playable
- [ ] Transcription files readable
- [ ] Thumbnails generating
- [ ] No broken links

## Integration Verification (30-45 minutes)

### 1. External Services
- [ ] OpenAI API connected
- [ ] Anthropic API functional (if used)
- [ ] Resend email service working
- [ ] Slack notifications operational
- [ ] Stripe webhooks active

### 2. Background Jobs
- [ ] Cron jobs running
- [ ] Queue processing active
- [ ] Scheduled tasks executing
- [ ] Cleanup jobs functional
- [ ] Alert system operational

### 3. Monitoring Systems
- [ ] Sentry receiving events
- [ ] Metrics being collected
- [ ] Logs aggregating properly
- [ ] Alerts configured
- [ ] Dashboards updating

## Communication Verification

### 1. Internal
- [ ] Team notified via Slack
- [ ] Incident channel updated
- [ ] Runbook accessible
- [ ] On-call engineer acknowledged
- [ ] Management informed

### 2. External
- [ ] Status page updated
- [ ] Customer email sent (if needed)
- [ ] Support team briefed
- [ ] Social media monitored
- [ ] Help documentation updated

## Load Testing (45-60 minutes)

### 1. Gradual Load
- [ ] 10 concurrent users: OK
- [ ] 50 concurrent users: OK
- [ ] 100 concurrent users: OK
- [ ] 500 concurrent users: OK
- [ ] Normal traffic levels: OK

### 2. Stress Points
- [ ] File upload under load
- [ ] Concurrent transcriptions
- [ ] Database connection pool
- [ ] API rate limits holding
- [ ] CDN serving correctly

## Final Verification

### 1. Rollback Completeness
- [ ] All identified issues resolved
- [ ] No new errors introduced
- [ ] Performance acceptable
- [ ] Features working as expected
- [ ] User reports positive

### 2. Documentation
- [ ] Rollback log complete
- [ ] Incident report drafted
- [ ] Lessons learned noted
- [ ] Action items identified
- [ ] Timeline documented

### 3. Sign-offs
- [ ] Technical Lead: _________________ Time: _______
- [ ] Product Manager: ________________ Time: _______
- [ ] On-call Engineer: _______________ Time: _______
- [ ] Customer Success: _______________ Time: _______

## Post-Rollback Monitoring (Next 24 hours)

### Hour 1-4
- [ ] Error rates stable
- [ ] No user complaints
- [ ] Performance consistent
- [ ] No memory leaks
- [ ] Database connections stable

### Hour 4-12
- [ ] Usage patterns normal
- [ ] No delayed issues
- [ ] Background jobs completing
- [ ] Email delivery working
- [ ] Payment processing normal

### Hour 12-24
- [ ] Daily reports generated
- [ ] Backup completed successfully
- [ ] No overnight issues
- [ ] International users OK
- [ ] Peak hours handled

## Notes and Observations

### Issues Encountered
```
[Document any issues found during verification]
```

### Workarounds Applied
```
[List any temporary fixes or workarounds]
```

### Follow-up Required
```
[Note any items requiring follow-up action]
```

### Additional Comments
```
[Any other relevant observations]
```

---

**Verification Started**: _______________  
**Verification Completed**: _______________  
**Total Duration**: _______________  
**Verified By**: _______________  
**Date**: _______________