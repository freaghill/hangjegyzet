# Payment Testing Checklist

This checklist ensures all payment flows work correctly before deploying to production.

## Pre-Testing Setup

- [ ] Configure test API keys in `.env.staging`:
  - [ ] Stripe test keys (pk_test_*, sk_test_*)
  - [ ] SimplePay sandbox credentials
  - [ ] Billingo test API key
- [ ] Set up test webhook endpoints
- [ ] Create test users and organizations
- [ ] Clear any existing test data

## SimplePay Testing

### Basic Payment Flow
- [ ] Select "Helyi" plan (7,900 Ft)
- [ ] Click "Előfizetés indítása"
- [ ] Verify redirect to SimplePay payment page
- [ ] Complete payment with test card: `4111 1111 1111 1111`
- [ ] Verify redirect back to success page
- [ ] Check subscription is active in database
- [ ] Verify invoice created in Billingo
- [ ] Confirm email received with invoice

### Webhook Testing
- [ ] Trigger SimplePay IPN webhook
- [ ] Verify signature validation works
- [ ] Check subscription status updated
- [ ] Verify usage limits applied correctly
- [ ] Test duplicate webhook handling (idempotency)

### Error Cases
- [ ] Test with declined card
- [ ] Test cancellation during payment
- [ ] Test timeout scenarios
- [ ] Verify error messages in Hungarian

## Stripe Testing

### Basic Payment Flow
- [ ] Select "Profi" plan (29,990 Ft)
- [ ] Click "Próba indítása" (14-day trial)
- [ ] Fill billing information
- [ ] Complete with test card: `4242 4242 4242 4242`
- [ ] Verify trial started
- [ ] Check subscription record created
- [ ] Verify no immediate charge

### Subscription Management
- [ ] Test trial to paid conversion
- [ ] Test plan upgrade (Helyi → Profi)
- [ ] Test plan downgrade (Profi → Helyi)
- [ ] Test subscription cancellation
- [ ] Verify prorated amounts correct

### International Payments
- [ ] Test with EUR card
- [ ] Test with USD card
- [ ] Verify currency conversion
- [ ] Check correct amounts charged

## Billingo Invoice Testing

### Invoice Generation
- [ ] Verify invoice created after successful payment
- [ ] Check correct tax treatment (Alanyi adómentes)
- [ ] Verify customer data populated correctly
- [ ] Test with and without tax number (adószám)
- [ ] Check invoice numbering sequence

### Invoice Delivery
- [ ] Verify email sent automatically
- [ ] Check PDF attachment present
- [ ] Test download invoice from dashboard
- [ ] Verify invoice content accuracy

## Usage Tracking

### Minute Tracking
- [ ] Upload 30-minute recording
- [ ] Verify minutes deducted from plan
- [ ] Test different transcription modes (fast/balanced/precision)
- [ ] Check usage reset on billing cycle

### Limit Enforcement
- [ ] Test exceeding monthly minutes
- [ ] Verify upgrade prompt shown
- [ ] Test user limit enforcement
- [ ] Check storage limit warnings

## Multi-Provider Scenarios

### Provider Selection
- [ ] Test SimplePay for Hungarian cards
- [ ] Test Stripe for international cards
- [ ] Verify correct provider auto-selected
- [ ] Test manual provider selection

### Failover
- [ ] Test SimplePay unavailable → Stripe fallback
- [ ] Test Stripe unavailable → SimplePay fallback
- [ ] Verify user notification of provider change

## Edge Cases

### Network Issues
- [ ] Test slow network (payment timeout)
- [ ] Test interrupted connection during payment
- [ ] Verify transaction recovery
- [ ] Check pending payment handling

### Concurrent Payments
- [ ] Test multiple payment attempts
- [ ] Verify only one subscription created
- [ ] Test race condition handling

### Data Validation
- [ ] Test with invalid email
- [ ] Test with invalid phone number
- [ ] Test with special characters in name
- [ ] Verify all fields properly escaped

## Post-Payment Verification

### Database Consistency
- [ ] Check organization_subscriptions table
- [ ] Verify payment_history records
- [ ] Check invoice records
- [ ] Verify usage_limits updated

### Email Notifications
- [ ] Welcome email sent
- [ ] Invoice email received
- [ ] Admin notification sent
- [ ] Test email bounce handling

### Dashboard Updates
- [ ] Subscription status shows correctly
- [ ] Usage dashboard updated
- [ ] Billing history accurate
- [ ] Next payment date displayed

## Security Testing

### Payment Security
- [ ] Test SQL injection in payment forms
- [ ] Test XSS in billing address
- [ ] Verify HTTPS enforced
- [ ] Check PCI compliance

### Webhook Security
- [ ] Test invalid signatures rejected
- [ ] Test replay attacks blocked
- [ ] Verify timestamp validation
- [ ] Test malformed payloads

## Performance Testing

### Load Testing
- [ ] Test 100 concurrent payments
- [ ] Measure payment page load time
- [ ] Check webhook processing time
- [ ] Verify no memory leaks

### Monitoring
- [ ] Check Sentry for errors
- [ ] Review payment logs
- [ ] Verify metrics tracking
- [ ] Test alerting for failures

## Rollback Plan

### If Issues Found
1. Document all failing tests
2. Create GitHub issues for each problem
3. Prioritize critical vs minor issues
4. Fix and re-test before production

### Emergency Procedures
- [ ] Know how to disable payments
- [ ] Have support contact ready
- [ ] Prepare user communication
- [ ] Test refund process

## Sign-off

- [ ] All tests passed: ___/___
- [ ] Critical issues: ___
- [ ] Minor issues: ___
- [ ] Ready for production: YES / NO

Tested by: ________________
Date: ____________________
Environment: _____________