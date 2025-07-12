#!/bin/bash

# Rollback Verification Script for HangJegyzet
# Automated verification of rollback success
#
# Usage: ./verify-rollback.sh [options]
# Options:
#   --quick         Run quick checks only (5 min)
#   --full          Run comprehensive checks (30 min)
#   --continuous    Run continuous monitoring
#   --report        Generate detailed report

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="hangjegyzet.hu"
API_ENDPOINT="https://$DOMAIN/api"
LOG_FILE="./logs/verify_rollback_$(date +%Y%m%d_%H%M%S).log"
REPORT_FILE="./logs/rollback_verification_$(date +%Y%m%d_%H%M%S).md"
ADMIN_KEY="${ADMIN_KEY:-}"
DATABASE_URL="${DATABASE_URL:-}"

# Test results tracking
declare -A TEST_RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNINGS=0

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Test execution helpers
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=${3:-0}
    
    ((TOTAL_TESTS++))
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ $? -eq $expected_result ]; then
            echo -e "${GREEN}PASSED${NC}"
            TEST_RESULTS["$test_name"]="PASSED"
            ((PASSED_TESTS++))
            return 0
        fi
    fi
    
    echo -e "${RED}FAILED${NC}"
    TEST_RESULTS["$test_name"]="FAILED"
    ((FAILED_TESTS++))
    return 1
}

# Service availability checks
check_service_availability() {
    info "Checking service availability..."
    
    # Homepage
    run_test "Homepage accessible" \
        "curl -s -o /dev/null -w '%{http_code}' https://$DOMAIN | grep -q '200'"
    
    # API health
    run_test "API health endpoint" \
        "curl -s $API_ENDPOINT/health | jq -e '.status == \"ok\" or .status == \"healthy\"'"
    
    # Login page
    run_test "Login page accessible" \
        "curl -s -o /dev/null -w '%{http_code}' https://$DOMAIN/login | grep -q '200'"
    
    # Static assets
    run_test "Static assets loading" \
        "curl -s -o /dev/null -w '%{http_code}' https://$DOMAIN/_next/static/css/main.css | grep -q '200'"
    
    # SSL certificate
    run_test "SSL certificate valid" \
        "echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -dates"
}

# Performance checks
check_performance() {
    info "Checking performance metrics..."
    
    # Response times
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" https://$DOMAIN)
    if (( $(echo "$response_time < 3" | bc -l) )); then
        echo -e "Homepage response time: ${GREEN}${response_time}s${NC}"
        TEST_RESULTS["Homepage response time"]="PASSED"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        echo -e "Homepage response time: ${RED}${response_time}s${NC} (>3s)"
        TEST_RESULTS["Homepage response time"]="FAILED"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
    
    # API response time
    local api_time=$(curl -s -o /dev/null -w "%{time_total}" $API_ENDPOINT/health)
    if (( $(echo "$api_time < 2" | bc -l) )); then
        echo -e "API response time: ${GREEN}${api_time}s${NC}"
        TEST_RESULTS["API response time"]="PASSED"
        ((PASSED_TESTS++))
        ((TOTAL_TESTS++))
    else
        echo -e "API response time: ${RED}${api_time}s${NC} (>2s)"
        TEST_RESULTS["API response time"]="FAILED"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS++))
    fi
}

# Feature functionality checks
check_features() {
    info "Checking core features..."
    
    # Check if features are properly disabled
    if [ -n "$ADMIN_KEY" ]; then
        run_test "Feature flags disabled" \
            "curl -s $API_ENDPOINT/admin/feature-flags -H 'X-Admin-Key: $ADMIN_KEY' | jq -e '.flags | to_entries | map(select(.value == true)) | length == 0'"
    fi
    
    # Public endpoints
    run_test "Meeting list endpoint" \
        "curl -s -o /dev/null -w '%{http_code}' $API_ENDPOINT/meetings | grep -qE '200|401'"
    
    run_test "Upload endpoint exists" \
        "curl -s -o /dev/null -w '%{http_code}' -X POST $API_ENDPOINT/upload | grep -qE '400|401|405'"
    
    run_test "Transcription endpoint exists" \
        "curl -s -o /dev/null -w '%{http_code}' $API_ENDPOINT/transcribe | grep -qE '400|401|405'"
}

# Database checks
check_database() {
    if [ -z "$DATABASE_URL" ]; then
        warning "DATABASE_URL not set, skipping database checks"
        return
    fi
    
    info "Checking database health..."
    
    # Connection test
    run_test "Database connection" \
        "psql $DATABASE_URL -c 'SELECT 1' -t -q"
    
    # Check for mode-based tables (should not exist after rollback)
    run_test "Mode tables removed" \
        "! psql $DATABASE_URL -c \"SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'mode_usage')\" -t -q | grep -q 't'"
    
    # Active connections
    local conn_count=$(psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'" -t -q 2>/dev/null || echo "0")
    echo -e "Active database connections: ${GREEN}$conn_count${NC}"
    
    # Long running queries
    local long_queries=$(psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes'" -t -q 2>/dev/null || echo "0")
    if [ "$long_queries" -gt 0 ]; then
        warning "Found $long_queries long-running queries"
        ((WARNINGS++))
    fi
}

# Error rate checks
check_error_rates() {
    info "Checking error rates..."
    
    # This would typically integrate with your monitoring service
    # For now, we'll check basic availability
    
    # Check recent Vercel logs for errors
    if command -v vercel &> /dev/null; then
        local error_count=$(vercel logs --prod --limit 100 2>/dev/null | grep -c "ERROR" || echo "0")
        if [ "$error_count" -lt 5 ]; then
            echo -e "Recent error count: ${GREEN}$error_count${NC} (last 100 logs)"
            TEST_RESULTS["Recent errors"]="PASSED"
            ((PASSED_TESTS++))
        else
            echo -e "Recent error count: ${RED}$error_count${NC} (last 100 logs)"
            TEST_RESULTS["Recent errors"]="FAILED"
            ((FAILED_TESTS++))
        fi
        ((TOTAL_TESTS++))
    fi
}

# Integration checks
check_integrations() {
    info "Checking external integrations..."
    
    # Check if external services are reachable
    run_test "OpenAI API reachable" \
        "curl -s -o /dev/null -w '%{http_code}' https://api.openai.com/v1/models -H 'Authorization: Bearer invalid' | grep -q '401'"
    
    run_test "Stripe API reachable" \
        "curl -s -o /dev/null -w '%{http_code}' https://api.stripe.com/v1/charges -u 'invalid:' | grep -q '401'"
}

# Continuous monitoring
continuous_monitoring() {
    info "Starting continuous monitoring (press Ctrl+C to stop)..."
    
    local iteration=0
    while true; do
        ((iteration++))
        echo -e "\n${YELLOW}=== Monitoring Iteration #$iteration - $(date) ===${NC}"
        
        # Quick health check
        local health_status=$(curl -s $API_ENDPOINT/health | jq -r '.status' 2>/dev/null || echo "error")
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
        local response_time=$(curl -s -o /dev/null -w "%{time_total}" https://$DOMAIN)
        
        echo "Health Status: $([ "$health_status" = "ok" ] && echo -e "${GREEN}$health_status${NC}" || echo -e "${RED}$health_status${NC}")"
        echo "HTTP Status: $([ "$response_code" = "200" ] && echo -e "${GREEN}$response_code${NC}" || echo -e "${RED}$response_code${NC}")"
        echo "Response Time: $(echo "$response_time < 3" | bc -l > /dev/null && echo -e "${GREEN}${response_time}s${NC}" || echo -e "${RED}${response_time}s${NC}")"
        
        if [ "$health_status" != "ok" ] || [ "$response_code" != "200" ]; then
            error "Service degradation detected!"
        fi
        
        sleep 60
    done
}

# Generate detailed report
generate_report() {
    info "Generating verification report..."
    
    cat > "$REPORT_FILE" << EOF
# Rollback Verification Report

**Generated**: $(date +'%Y-%m-%d %H:%M:%S')
**Domain**: $DOMAIN
**Total Tests**: $TOTAL_TESTS
**Passed**: $PASSED_TESTS
**Failed**: $FAILED_TESTS
**Warnings**: $WARNINGS

## Summary

Overall Status: $([ $FAILED_TESTS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

## Test Results

| Test | Result |
|------|--------|
EOF
    
    for test in "${!TEST_RESULTS[@]}"; do
        local result="${TEST_RESULTS[$test]}"
        local icon=$([ "$result" = "PASSED" ] && echo "✅" || echo "❌")
        echo "| $test | $icon $result |" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF

## Recommendations

EOF
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo "### Failed Tests Require Attention:" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        for test in "${!TEST_RESULTS[@]}"; do
            if [ "${TEST_RESULTS[$test]}" = "FAILED" ]; then
                echo "- **$test**: Investigate and resolve" >> "$REPORT_FILE"
            fi
        done
    fi
    
    if [ $WARNINGS -gt 0 ]; then
        echo "" >> "$REPORT_FILE"
        echo "### Warnings to Monitor:" >> "$REPORT_FILE"
        echo "- Check warning messages in log file: $LOG_FILE" >> "$REPORT_FILE"
    fi
    
    cat >> "$REPORT_FILE" << EOF

## Next Steps

1. $([ $FAILED_TESTS -eq 0 ] && echo "Continue monitoring for 30 minutes" || echo "Address failed tests immediately")
2. Review application logs for any anomalies
3. Check customer support channels
4. $([ $FAILED_TESTS -eq 0 ] && echo "Consider re-enabling features gradually" || echo "Keep features disabled until issues resolved")

## Log File

Detailed logs available at: $LOG_FILE

---
End of Report
EOF
    
    log "Report saved to: $REPORT_FILE"
}

# Main execution
main() {
    local mode="quick"
    local generate_report_flag=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --quick)
                mode="quick"
                shift
                ;;
            --full)
                mode="full"
                shift
                ;;
            --continuous)
                mode="continuous"
                shift
                ;;
            --report)
                generate_report_flag=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --quick         Run quick checks only (5 min)"
                echo "  --full          Run comprehensive checks (30 min)"
                echo "  --continuous    Run continuous monitoring"
                echo "  --report        Generate detailed report"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    echo -e "${BLUE}=== ROLLBACK VERIFICATION - HangJegyzet ===${NC}"
    echo "Mode: $mode"
    echo "Log file: $LOG_FILE"
    echo
    
    # Run appropriate checks based on mode
    case $mode in
        quick)
            info "Running quick verification (5 minutes)..."
            check_service_availability
            check_performance
            check_error_rates
            ;;
        full)
            info "Running full verification (30 minutes)..."
            check_service_availability
            check_performance
            check_features
            check_database
            check_error_rates
            check_integrations
            
            # Additional full checks
            info "Waiting 5 minutes for stability check..."
            sleep 300
            
            info "Re-running availability checks..."
            check_service_availability
            check_performance
            ;;
        continuous)
            continuous_monitoring
            ;;
    esac
    
    # Generate report if requested
    if [ "$generate_report_flag" = true ] || [ $FAILED_TESTS -gt 0 ]; then
        generate_report
    fi
    
    # Summary
    echo
    echo -e "${YELLOW}=== VERIFICATION SUMMARY ===${NC}"
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo
    
    if [ $FAILED_TESTS -eq 0 ]; then
        log "✅ All verification checks passed!"
        exit 0
    else
        error "❌ Verification failed! $FAILED_TESTS tests did not pass."
        echo "Review the report at: $REPORT_FILE"
        exit 1
    fi
}

# Trap errors
trap 'error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"