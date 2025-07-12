#!/bin/bash

# Application Rollback Script for HangJegyzet
# Emergency rollback procedure for Vercel deployments
# 
# Usage: ./rollback-application.sh [options]
# Options:
#   --deployment-id <id>  Rollback to specific deployment
#   --hours-ago <n>       Rollback to deployment from n hours ago
#   --force              Skip confirmation prompts
#   --dry-run            Show what would be done without executing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/app_rollback_$(date +%Y%m%d_%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
PROJECT_NAME="hangjegyzet-app"
DOMAIN="hangjegyzet.hu"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp]${NC} ${message}" | tee -a "$LOG_FILE"
}

error() {
    local message="$@"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] [ERROR]${NC} ${message}" | tee -a "$LOG_FILE"
    
    # Send Slack notification for errors
    if [ -n "$SLACK_WEBHOOK" ]; then
        send_slack_notification "error" "Application rollback error: $message"
    fi
}

warning() {
    local message="$@"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] [WARNING]${NC} ${message}" | tee -a "$LOG_FILE"
}

info() {
    local message="$@"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[$timestamp] [INFO]${NC} ${message}" | tee -a "$LOG_FILE"
}

# Send Slack notification
send_slack_notification() {
    local type=$1
    local message=$2
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi
    
    local color="#FF0000"  # Red for errors
    [ "$type" = "success" ] && color="#36a64f"  # Green for success
    [ "$type" = "warning" ] && color="#FFA500"  # Orange for warnings
    
    local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "HangJegyzet Deployment Rollback",
        "text": "$message",
        "footer": "Rollback Script",
        "ts": $(date +%s)
    }]
}
EOF
)
    
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        error "Not logged in to Vercel. Please run 'vercel login' first."
        exit 1
    fi
    
    # Check environment variables
    if [ -z "$VERCEL_TOKEN" ]; then
        warning "VERCEL_TOKEN not set. Some operations may require manual authentication."
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Get current deployment info
get_current_deployment() {
    info "Fetching current deployment information..."
    
    local current_deployment=$(vercel inspect --token="$VERCEL_TOKEN" 2>/dev/null | grep -E "^\s+url:" | head -1 | awk '{print $2}')
    
    if [ -z "$current_deployment" ]; then
        error "Could not determine current deployment"
        return 1
    fi
    
    echo "$current_deployment"
}

# List recent deployments
list_deployments() {
    info "Fetching recent deployments..."
    
    # Get last 10 production deployments
    local deployments=$(vercel ls --prod --token="$VERCEL_TOKEN" 2>/dev/null | grep -E "Production|Ready" | head -10)
    
    if [ -z "$deployments" ]; then
        error "No deployments found"
        return 1
    fi
    
    echo "$deployments"
}

# Get deployment by hours ago
get_deployment_by_age() {
    local hours_ago=$1
    info "Looking for deployment from $hours_ago hours ago..."
    
    # Calculate target timestamp
    local target_time=$(date -d "$hours_ago hours ago" +%s 2>/dev/null || date -v-${hours_ago}H +%s)
    
    # Parse deployments and find closest match
    local best_deployment=""
    local best_diff=999999
    
    while IFS= read -r line; do
        local deployment_id=$(echo "$line" | awk '{print $1}')
        local deployment_time=$(echo "$line" | awk '{print $3, $4}')
        
        # Convert deployment time to timestamp (adjust format as needed)
        local deployment_ts=$(date -d "$deployment_time" +%s 2>/dev/null || date -j -f "%b %d" "$deployment_time" +%s 2>/dev/null || echo "0")
        
        if [ "$deployment_ts" -gt 0 ]; then
            local diff=$((target_time - deployment_ts))
            diff=${diff#-}  # Absolute value
            
            if [ $diff -lt $best_diff ]; then
                best_diff=$diff
                best_deployment=$deployment_id
            fi
        fi
    done <<< "$(list_deployments)"
    
    echo "$best_deployment"
}

# Disable feature flags
disable_feature_flags() {
    info "Disabling feature flags..."
    
    # Call the feature flag disable script if it exists
    if [ -f "./deployment/disable-features.sh" ]; then
        log "INFO" "Running feature flag disable script..."
        ./deployment/disable-features.sh --all --emergency || {
            warning "Feature flag disable script failed, continuing with rollback"
        }
    else
        warning "Feature flag disable script not found, skipping"
    fi
    
    # Also try to disable via environment variables
    if [ -n "$VERCEL_TOKEN" ]; then
        log "INFO" "Disabling feature flags via environment variables..."
        
        for flag in "FEATURE_MODE_BASED_PRICING" "FEATURE_MIGRATION_WIZARD" "FEATURE_NEW_UPLOAD_FLOW"; do
            vercel env rm "$flag" production --yes --token="$VERCEL_TOKEN" 2>/dev/null || true
            echo "false" | vercel env add "$flag" production --token="$VERCEL_TOKEN" 2>/dev/null || true
        done
    fi
}

# Clear caches
clear_caches() {
    info "Clearing caches..."
    
    # Call cache clear script if it exists
    if [ -f "./deployment/clear-caches.sh" ]; then
        log "INFO" "Running cache clear script..."
        ./deployment/clear-caches.sh --all || {
            warning "Cache clear script failed, continuing"
        }
    fi
    
    # Vercel cache purge
    if [ -n "$VERCEL_TOKEN" ]; then
        log "INFO" "Purging Vercel cache..."
        curl -s -X POST "https://api.vercel.com/v13/deployments/purge-cache" \
            -H "Authorization: Bearer $VERCEL_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"domain\": \"$DOMAIN\"}" > /dev/null 2>&1 || {
            warning "Vercel cache purge failed"
        }
    fi
}

# Perform rollback
perform_rollback() {
    local deployment_id=$1
    local force=$2
    
    info "Preparing to rollback to deployment: $deployment_id"
    
    # Get deployment details
    local deployment_info=$(vercel inspect "$deployment_id" --token="$VERCEL_TOKEN" 2>/dev/null)
    
    if [ -z "$deployment_info" ]; then
        error "Could not fetch deployment information for $deployment_id"
        return 1
    fi
    
    # Show deployment info
    echo -e "\n${YELLOW}Deployment Information:${NC}"
    echo "$deployment_info" | grep -E "(State:|Created:|URL:)" | head -5
    echo
    
    # Confirmation
    if [ "$force" != "true" ]; then
        echo -e "${RED}WARNING: This will rollback the production deployment!${NC}"
        read -p "Are you sure you want to proceed? (yes/no): " -r confirm
        if [ "$confirm" != "yes" ]; then
            log "INFO" "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Record current state
    log "INFO" "Recording current deployment state..."
    get_current_deployment > "$LOG_DIR/pre_rollback_deployment.txt"
    
    # Disable feature flags first
    disable_feature_flags
    
    # Perform the rollback
    info "Executing rollback..."
    
    if vercel rollback "$deployment_id" --prod --token="$VERCEL_TOKEN"; then
        log "INFO" "Rollback command executed successfully"
    else
        error "Rollback command failed!"
        return 1
    fi
    
    # Wait for deployment to be ready
    info "Waiting for deployment to be ready..."
    local max_attempts=60  # 5 minutes timeout
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local status=$(vercel inspect --token="$VERCEL_TOKEN" 2>/dev/null | grep "State:" | awk '{print $2}')
        
        if [ "$status" = "READY" ]; then
            log "INFO" "Deployment is ready!"
            break
        fi
        
        echo -n "."
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        error "Deployment did not become ready within timeout"
        return 1
    fi
    
    # Clear caches
    clear_caches
    
    return 0
}

# Verify rollback
verify_rollback() {
    info "Verifying rollback..."
    
    # Check if site is accessible
    log "INFO" "Checking site accessibility..."
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN")
    
    if [ "$response_code" = "200" ]; then
        log "INFO" "Site is accessible (HTTP $response_code)"
    else
        error "Site returned HTTP $response_code"
        return 1
    fi
    
    # Check API health
    log "INFO" "Checking API health..."
    local api_health=$(curl -s "https://$DOMAIN/api/health" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$api_health" = "ok" ] || [ "$api_health" = "healthy" ]; then
        log "INFO" "API health check passed"
    else
        warning "API health check returned: $api_health"
    fi
    
    # Run verification script if available
    if [ -f "./deployment/verify-rollback.sh" ]; then
        log "INFO" "Running verification script..."
        ./deployment/verify-rollback.sh || {
            warning "Verification script reported issues"
        }
    fi
    
    return 0
}

# Generate rollback report
generate_report() {
    local start_time=$1
    local end_time=$2
    local deployment_id=$3
    local success=$4
    
    info "Generating rollback report..."
    
    local report_file="$LOG_DIR/rollback_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Application Rollback Report

**Date**: $(date +'%Y-%m-%d %H:%M:%S')
**Duration**: $((end_time - start_time)) seconds
**Target Deployment**: $deployment_id
**Status**: $([ "$success" = "true" ] && echo "SUCCESS" || echo "FAILED")

## Summary

Application rollback was $([ "$success" = "true" ] && echo "completed successfully" || echo "attempted but failed").

## Actions Taken

1. Feature flags disabled
2. Application rolled back to deployment: $deployment_id
3. Caches cleared
4. Verification performed

## Current Status

- Site Accessible: $(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200" && echo "Yes" || echo "No")
- API Health: $(curl -s "https://$DOMAIN/api/health" | grep -q "ok" && echo "Healthy" || echo "Unhealthy")
- Feature Flags: Disabled

## Log Files

- Main log: $LOG_FILE
- Pre-rollback state: $LOG_DIR/pre_rollback_deployment.txt

## Next Steps

1. Monitor application metrics for 30 minutes
2. Check error rates in Sentry
3. Review user reports
4. Conduct root cause analysis

## Commands for Manual Verification

\`\`\`bash
# Check current deployment
vercel inspect

# View application logs
vercel logs --prod --follow

# Check feature flag status
curl https://$DOMAIN/api/feature-flags
\`\`\`

---
Generated by rollback-application.sh
EOF

    log "INFO" "Report saved to: $report_file"
}

# Main execution
main() {
    local deployment_id=""
    local hours_ago=""
    local force="false"
    local dry_run="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --deployment-id)
                deployment_id="$2"
                shift 2
                ;;
            --hours-ago)
                hours_ago="$2"
                shift 2
                ;;
            --force)
                force="true"
                shift
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --deployment-id <id>  Rollback to specific deployment"
                echo "  --hours-ago <n>       Rollback to deployment from n hours ago"
                echo "  --force              Skip confirmation prompts"
                echo "  --dry-run            Show what would be done without executing"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Start rollback
    local start_time=$(date +%s)
    
    echo -e "${RED}=== EMERGENCY APPLICATION ROLLBACK - HangJegyzet ===${NC}"
    echo "Log file: $LOG_FILE"
    echo
    
    # Send initial notification
    send_slack_notification "warning" "Application rollback initiated by $(whoami)"
    
    # Check prerequisites
    check_prerequisites
    
    # Get current deployment for reference
    local current_deployment=$(get_current_deployment)
    log "INFO" "Current deployment: $current_deployment"
    
    # Determine target deployment
    if [ -z "$deployment_id" ]; then
        if [ -n "$hours_ago" ]; then
            deployment_id=$(get_deployment_by_age "$hours_ago")
            if [ -z "$deployment_id" ]; then
                error "Could not find deployment from $hours_ago hours ago"
                exit 1
            fi
        else
            # Show recent deployments and ask user to select
            echo -e "\n${YELLOW}Recent Production Deployments:${NC}"
            list_deployments
            echo
            read -p "Enter deployment ID to rollback to (or press Ctrl+C to cancel): " deployment_id
        fi
    fi
    
    if [ -z "$deployment_id" ]; then
        error "No deployment ID specified"
        exit 1
    fi
    
    # Dry run mode
    if [ "$dry_run" = "true" ]; then
        info "DRY RUN MODE - No changes will be made"
        echo
        echo "Would perform the following actions:"
        echo "1. Disable all feature flags"
        echo "2. Rollback to deployment: $deployment_id"
        echo "3. Clear all caches"
        echo "4. Verify deployment health"
        exit 0
    fi
    
    # Perform rollback
    local success="false"
    if perform_rollback "$deployment_id" "$force"; then
        log "INFO" "Rollback completed successfully!"
        success="true"
        
        # Verify rollback
        if verify_rollback; then
            log "INFO" "Rollback verification passed"
        else
            warning "Rollback verification reported issues - manual check required"
        fi
        
        send_slack_notification "success" "Application successfully rolled back to deployment: $deployment_id"
    else
        error "Rollback failed!"
        send_slack_notification "error" "Application rollback FAILED! Immediate attention required!"
    fi
    
    # Generate report
    local end_time=$(date +%s)
    generate_report "$start_time" "$end_time" "$deployment_id" "$success"
    
    # Final instructions
    echo
    echo -e "${YELLOW}=== POST-ROLLBACK CHECKLIST ===${NC}"
    echo "[ ] Monitor application metrics for 30 minutes"
    echo "[ ] Check Sentry for new errors"
    echo "[ ] Review customer support channels"
    echo "[ ] Update status page if needed"
    echo "[ ] Schedule root cause analysis meeting"
    echo "[ ] Document lessons learned"
    echo
    
    if [ "$success" = "true" ]; then
        log "INFO" "Rollback procedure completed. Please monitor the application closely."
        exit 0
    else
        error "Rollback procedure failed. Manual intervention required!"
        exit 1
    fi
}

# Trap errors
trap 'error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"