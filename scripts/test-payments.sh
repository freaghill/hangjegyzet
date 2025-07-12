#!/bin/bash

# Payment Testing Script for HangJegyzet.AI
# This script runs automated payment tests in staging environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print colored output
print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if staging environment is set up
check_environment() {
    print_header "Checking Environment"
    
    if [ ! -f .env.staging ]; then
        print_error "Staging environment file not found"
        exit 1
    else
        print_success "Staging environment configured"
    fi
    
    # Check if test database is accessible
    if npm run db:migrate:staging > /dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        exit 1
    fi
}

# Test SimplePay integration
test_simplepay() {
    print_header "Testing SimplePay Integration"
    
    # Test payment creation
    RESPONSE=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{
            "plan": "helyi",
            "email": "test@example.com",
            "billingData": {
                "name": "Test User",
                "company": "Test Kft",
                "country": "HU",
                "city": "Budapest",
                "zip": "1011",
                "address": "Test u. 1"
            }
        }')
    
    if echo "$RESPONSE" | grep -q "paymentUrl"; then
        print_success "SimplePay payment creation"
    else
        print_error "SimplePay payment creation failed"
    fi
    
    # Test webhook signature validation
    WEBHOOK_TEST=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/webhook \
        -H "Content-Type: application/json" \
        -d '{
            "salt": "test",
            "merchant": "TEST_MERCHANT",
            "orderRef": "HJ-TEST-123",
            "currency": "HUF",
            "status": "FINISHED"
        }')
    
    if echo "$WEBHOOK_TEST" | grep -q "signature"; then
        print_success "SimplePay webhook validation"
    else
        print_error "SimplePay webhook validation failed"
    fi
}

# Test Stripe integration
test_stripe() {
    print_header "Testing Stripe Integration"
    
    # Test checkout session creation
    RESPONSE=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/stripe/create \
        -H "Content-Type: application/json" \
        -d '{
            "plan": "professional",
            "email": "test@example.com",
            "trial": true
        }')
    
    if echo "$RESPONSE" | grep -q "sessionId"; then
        print_success "Stripe checkout session creation"
    else
        print_error "Stripe checkout session creation failed"
    fi
    
    # Test webhook endpoint
    WEBHOOK_RESPONSE=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/stripe/webhook \
        -H "Content-Type: application/json" \
        -H "Stripe-Signature: test_signature" \
        -d '{"type": "checkout.session.completed"}')
    
    if [ "$?" -eq 0 ]; then
        print_success "Stripe webhook endpoint accessible"
    else
        print_error "Stripe webhook endpoint not accessible"
    fi
}

# Test Billingo integration
test_billingo() {
    print_header "Testing Billingo Integration"
    
    # Test invoice creation
    RESPONSE=$(curl -s -X POST https://staging.hangjegyzet.ai/api/invoices/create \
        -H "Content-Type: application/json" \
        -d '{
            "customerData": {
                "name": "Test Customer",
                "email": "test@example.com",
                "address": "Test u. 1",
                "city": "Budapest",
                "zip": "1011",
                "taxNumber": "12345678-2-42"
            },
            "plan": "helyi",
            "amount": 7900
        }')
    
    if echo "$RESPONSE" | grep -q "invoiceId"; then
        print_success "Billingo invoice creation"
    else
        print_error "Billingo invoice creation failed"
    fi
}

# Test subscription limits
test_subscription_limits() {
    print_header "Testing Subscription Limits"
    
    # Test usage tracking
    USAGE_RESPONSE=$(curl -s -X GET https://staging.hangjegyzet.ai/api/usage/current \
        -H "Authorization: Bearer test_token")
    
    if echo "$USAGE_RESPONSE" | grep -q "minutesUsed"; then
        print_success "Usage tracking API"
    else
        print_error "Usage tracking API failed"
    fi
    
    # Test limit enforcement
    LIMIT_TEST=$(curl -s -X POST https://staging.hangjegyzet.ai/api/transcription/check-limits \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test_token" \
        -d '{"duration": 60, "mode": "fast"}')
    
    if echo "$LIMIT_TEST" | grep -q "allowed"; then
        print_success "Limit enforcement check"
    else
        print_error "Limit enforcement check failed"
    fi
}

# Test payment security
test_security() {
    print_header "Testing Payment Security"
    
    # Test SQL injection
    INJECTION_TEST=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{
            "plan": "helyi",
            "email": "test@example.com\"; DROP TABLE users; --",
            "billingData": {
                "name": "Test\"; DELETE FROM organizations; --"
            }
        }')
    
    if ! echo "$INJECTION_TEST" | grep -q "error"; then
        print_success "SQL injection protection"
    else
        print_error "SQL injection vulnerability detected"
    fi
    
    # Test XSS
    XSS_TEST=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{
            "plan": "helyi",
            "email": "test@example.com",
            "billingData": {
                "name": "<script>alert(\"XSS\")</script>"
            }
        }')
    
    if echo "$XSS_TEST" | grep -q "sanitized"; then
        print_success "XSS protection"
    else
        print_warning "XSS protection needs verification"
    fi
    
    # Test HTTPS enforcement
    HTTP_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://staging.hangjegyzet.ai/api/payments)
    
    if [ "$HTTP_TEST" = "301" ] || [ "$HTTP_TEST" = "302" ]; then
        print_success "HTTPS enforcement"
    else
        print_error "HTTPS not enforced"
    fi
}

# Test error handling
test_error_handling() {
    print_header "Testing Error Handling"
    
    # Test invalid plan
    INVALID_PLAN=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{"plan": "invalid_plan"}')
    
    if echo "$INVALID_PLAN" | grep -q "error"; then
        print_success "Invalid plan error handling"
    else
        print_error "Invalid plan not properly handled"
    fi
    
    # Test missing required fields
    MISSING_FIELDS=$(curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{"plan": "helyi"}')
    
    if echo "$MISSING_FIELDS" | grep -q "required"; then
        print_success "Required field validation"
    else
        print_error "Missing required fields not validated"
    fi
}

# Test performance
test_performance() {
    print_header "Testing Performance"
    
    # Test payment creation response time
    START_TIME=$(date +%s%N)
    curl -s -X POST https://staging.hangjegyzet.ai/api/payments/simplepay/create \
        -H "Content-Type: application/json" \
        -d '{"plan": "helyi", "email": "test@example.com"}' > /dev/null
    END_TIME=$(date +%s%N)
    
    RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))
    
    if [ "$RESPONSE_TIME" -lt 1000 ]; then
        print_success "Payment creation response time: ${RESPONSE_TIME}ms"
    else
        print_warning "Payment creation slow: ${RESPONSE_TIME}ms"
    fi
    
    # Test concurrent requests
    print_warning "Concurrent request testing skipped (manual verification needed)"
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    # Run Jest payment tests
    if npm run test tests/payment-flow.test.ts > /dev/null 2>&1; then
        print_success "Payment flow integration tests"
    else
        print_error "Payment flow integration tests failed"
        npm run test tests/payment-flow.test.ts 2>&1 | tail -n 20
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🧪 HangJegyzet Payment Testing Suite${NC}"
    echo -e "${BLUE}=====================================\n${NC}"
    
    check_environment
    test_simplepay
    test_stripe
    test_billingo
    test_subscription_limits
    test_security
    test_error_handling
    test_performance
    run_integration_tests
    
    # Summary
    echo -e "\n${BLUE}==== Test Summary ====${NC}"
    echo -e "Total tests: ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    
    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "\n${GREEN}✅ All payment tests passed!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some tests failed. Please review before deploying to production.${NC}"
        exit 1
    fi
}

# Run main function
main