#!/bin/bash

# Feature Flag Emergency Disable Script for HangJegyzet
# Quickly disable feature flags during incidents
#
# Usage: ./disable-features.sh [options]
# Options:
#   --all                Disable all feature flags
#   --feature <name>     Disable specific feature flag
#   --emergency          Emergency mode (no confirmations)
#   --list               List all feature flags and their status
#   --dry-run           Show what would be done without executing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="./logs/feature_disable_$(date +%Y%m%d_%H%M%S).log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
LAUNCHDARKLY_API_KEY="${LD_API_KEY:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
API_ENDPOINT="https://hangjegyzet.hu/api"
ADMIN_KEY="${ADMIN_KEY:-}"

# Feature flags list
declare -A FEATURE_FLAGS=(
    ["mode-based-pricing-enabled"]="Mode-based pricing system"
    ["migration-wizard-enabled"]="User migration wizard"
    ["new-upload-flow-enabled"]="New file upload flow"
    ["usage-monitoring-enabled"]="Usage monitoring and alerts"
    ["rate-limiting-enabled"]="API rate limiting"
    ["webhook-notifications-enabled"]="Webhook notifications"
    ["anomaly-detection-enabled"]="Anomaly detection system"
    ["maintenance-mode"]="Maintenance mode (blocks all requests)"
)

# Critical flags that require extra confirmation
CRITICAL_FLAGS=("maintenance-mode" "rate-limiting-enabled")

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

# Send Slack notification
send_slack_notification() {
    local message=$1
    local color=${2:-"#FF0000"}  # Default to red
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi
    
    local payload=$(cat <<EOF
{
    "attachments": [{
        "color": "$color",
        "title": "Feature Flag Alert - HangJegyzet",
        "text": "$message",
        "footer": "Feature Flag Control",
        "ts": $(date +%s)
    }]
}
EOF
)
    
    curl -s -X POST -H 'Content-type: application/json' \
        --data "$payload" "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
}

# Check if feature flag is critical
is_critical_flag() {
    local flag=$1
    for critical in "${CRITICAL_FLAGS[@]}"; do
        if [ "$flag" = "$critical" ]; then
            return 0
        fi
    done
    return 1
}

# Disable via LaunchDarkly API
disable_launchdarkly_flag() {
    local flag_key=$1
    
    if [ -z "$LAUNCHDARKLY_API_KEY" ]; then
        warning "LaunchDarkly API key not set, skipping"
        return 1
    fi
    
    info "Disabling flag in LaunchDarkly: $flag_key"
    
    local response=$(curl -s -X PATCH \
        "https://api.launchdarkly.com/api/v2/flags/default/$flag_key" \
        -H "Authorization: $LAUNCHDARKLY_API_KEY" \
        -H "Content-Type: application/json" \
        -d '[{"op": "replace", "path": "/on", "value": false}]' \
        -w "\n%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        log "Successfully disabled $flag_key in LaunchDarkly"
        return 0
    else
        error "Failed to disable $flag_key in LaunchDarkly (HTTP $http_code)"
        return 1
    fi
}

# Disable via Vercel environment variables
disable_vercel_env_flag() {
    local flag_key=$1
    local env_var_name="FEATURE_$(echo "$flag_key" | tr '[:lower:]' '[:upper:]' | tr '-' '_')"
    
    if [ -z "$VERCEL_TOKEN" ]; then
        warning "Vercel token not set, skipping environment variable update"
        return 1
    fi
    
    info "Disabling flag via Vercel env: $env_var_name"
    
    # Remove existing variable
    vercel env rm "$env_var_name" production --yes --token="$VERCEL_TOKEN" 2>/dev/null || true
    
    # Add with false value
    echo "false" | vercel env add "$env_var_name" production --token="$VERCEL_TOKEN" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Successfully set $env_var_name=false in Vercel"
        return 0
    else
        error "Failed to update $env_var_name in Vercel"
        return 1
    fi
}

# Disable via API endpoint
disable_api_flag() {
    local flag_key=$1
    
    if [ -z "$ADMIN_KEY" ]; then
        warning "Admin API key not set, skipping API update"
        return 1
    fi
    
    info "Disabling flag via API: $flag_key"
    
    local response=$(curl -s -X POST \
        "$API_ENDPOINT/admin/feature-flags/disable" \
        -H "X-Admin-Key: $ADMIN_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"flag\": \"$flag_key\"}" \
        -w "\n%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log "Successfully disabled $flag_key via API"
        return 0
    else
        error "Failed to disable $flag_key via API (HTTP $http_code)"
        return 1
    fi
}

# Disable a single feature flag
disable_feature() {
    local flag_key=$1
    local emergency=$2
    
    # Check if flag exists
    if [ -z "${FEATURE_FLAGS[$flag_key]:-}" ]; then
        error "Unknown feature flag: $flag_key"
        return 1
    fi
    
    # Check if critical flag
    if is_critical_flag "$flag_key" && [ "$emergency" != "true" ]; then
        warning "Flag '$flag_key' is a CRITICAL flag!"
        read -p "Are you ABSOLUTELY sure you want to disable it? (type 'yes' to confirm): " confirm
        if [ "$confirm" != "yes" ]; then
            log "Skipping critical flag $flag_key"
            return 0
        fi
    fi
    
    log "Disabling feature flag: $flag_key (${FEATURE_FLAGS[$flag_key]})"
    
    local success=0
    
    # Try all available methods
    disable_launchdarkly_flag "$flag_key" || ((success++))
    disable_vercel_env_flag "$flag_key" || ((success++))
    disable_api_flag "$flag_key" || ((success++))
    
    if [ $success -eq 3 ]; then
        error "Failed to disable flag via all methods: $flag_key"
        return 1
    else
        log "Feature flag disabled: $flag_key"
        send_slack_notification "Feature flag DISABLED: $flag_key - ${FEATURE_FLAGS[$flag_key]}" "#FFA500"
        return 0
    fi
}

# List all feature flags
list_feature_flags() {
    echo -e "\n${YELLOW}=== Feature Flags Status ===${NC}\n"
    
    # Try to get current status from API
    if [ -n "$ADMIN_KEY" ]; then
        info "Fetching current flag status from API..."
        local api_response=$(curl -s -X GET \
            "$API_ENDPOINT/admin/feature-flags" \
            -H "X-Admin-Key: $ADMIN_KEY" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$api_response" ]; then
            echo -e "${GREEN}Current Status from API:${NC}"
            echo "$api_response" | jq -r '.flags | to_entries | .[] | "\(.key): \(.value)"' 2>/dev/null || echo "$api_response"
            echo
        fi
    fi
    
    # List all known flags
    echo -e "${BLUE}Available Feature Flags:${NC}"
    for flag in "${!FEATURE_FLAGS[@]}"; do
        local desc="${FEATURE_FLAGS[$flag]}"
        local critical=""
        if is_critical_flag "$flag"; then
            critical=" ${RED}[CRITICAL]${NC}"
        fi
        echo -e "  • ${GREEN}$flag${NC}: $desc$critical"
    done
    echo
}

# Disable all feature flags
disable_all_features() {
    local emergency=$1
    
    warning "Preparing to disable ALL feature flags!"
    
    if [ "$emergency" != "true" ]; then
        echo -e "\n${RED}This will disable the following features:${NC}"
        for flag in "${!FEATURE_FLAGS[@]}"; do
            echo "  - $flag: ${FEATURE_FLAGS[$flag]}"
        done
        echo
        read -p "Are you sure you want to proceed? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "Operation cancelled by user"
            exit 0
        fi
    fi
    
    send_slack_notification "EMERGENCY: Disabling ALL feature flags!" "#FF0000"
    
    local failed=0
    
    # Disable each flag
    for flag in "${!FEATURE_FLAGS[@]}"; do
        if ! disable_feature "$flag" "$emergency"; then
            ((failed++))
        fi
        sleep 0.5  # Small delay to avoid rate limiting
    done
    
    if [ $failed -eq 0 ]; then
        log "All feature flags disabled successfully!"
        send_slack_notification "All feature flags have been disabled successfully" "#36a64f"
    else
        error "$failed feature flags failed to disable!"
        send_slack_notification "WARNING: $failed feature flags failed to disable!" "#FF0000"
    fi
    
    return $failed
}

# Verify flags are disabled
verify_disabled() {
    info "Verifying feature flags are disabled..."
    
    if [ -n "$ADMIN_KEY" ]; then
        local verification=$(curl -s -X GET \
            "$API_ENDPOINT/admin/feature-flags/verify" \
            -H "X-Admin-Key: $ADMIN_KEY" 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            echo "$verification"
        else
            warning "Could not verify via API"
        fi
    fi
    
    # Also check a public endpoint if available
    local public_check=$(curl -s "$API_ENDPOINT/feature-flags" 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$public_check" ]; then
        info "Public feature flags endpoint response:"
        echo "$public_check" | jq '.' 2>/dev/null || echo "$public_check"
    fi
}

# Generate report
generate_report() {
    local start_time=$1
    local end_time=$2
    local action=$3
    
    local report_file="./logs/feature_disable_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
Feature Flag Disable Report
==========================
Date: $(date +'%Y-%m-%d %H:%M:%S')
Duration: $((end_time - start_time)) seconds
Action: $action
Operator: $(whoami)

Actions Taken:
- Feature flags disabled via available methods
- Notifications sent
- Verification performed

Log file: $LOG_FILE

Next Steps:
1. Monitor application behavior
2. Check for any errors in Sentry/logs
3. Communicate status to team
4. Plan re-enablement strategy

EOF
    
    log "Report saved to: $report_file"
}

# Main execution
main() {
    local disable_all=false
    local specific_feature=""
    local emergency=false
    local list_only=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                disable_all=true
                shift
                ;;
            --feature)
                specific_feature="$2"
                shift 2
                ;;
            --emergency)
                emergency=true
                shift
                ;;
            --list)
                list_only=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --all                Disable all feature flags"
                echo "  --feature <name>     Disable specific feature flag"
                echo "  --emergency          Emergency mode (no confirmations)"
                echo "  --list               List all feature flags and their status"
                echo "  --dry-run           Show what would be done without executing"
                echo ""
                echo "Available feature flags:"
                for flag in "${!FEATURE_FLAGS[@]}"; do
                    echo "  - $flag"
                done
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Start timer
    local start_time=$(date +%s)
    
    echo -e "${RED}=== FEATURE FLAG CONTROL - HangJegyzet ===${NC}"
    echo "Log file: $LOG_FILE"
    
    # List only mode
    if [ "$list_only" = true ]; then
        list_feature_flags
        exit 0
    fi
    
    # Dry run mode
    if [ "$dry_run" = true ]; then
        info "DRY RUN MODE - No changes will be made"
        
        if [ "$disable_all" = true ]; then
            echo "Would disable ALL feature flags"
        elif [ -n "$specific_feature" ]; then
            echo "Would disable feature flag: $specific_feature"
        else
            error "No action specified"
            exit 1
        fi
        
        exit 0
    fi
    
    # Execute action
    local action=""
    local result=0
    
    if [ "$disable_all" = true ]; then
        action="Disable all feature flags"
        disable_all_features "$emergency"
        result=$?
    elif [ -n "$specific_feature" ]; then
        action="Disable feature: $specific_feature"
        disable_feature "$specific_feature" "$emergency"
        result=$?
    else
        error "No action specified. Use --all or --feature <name>"
        echo "Run with --help for usage information"
        exit 1
    fi
    
    # Verify if not in emergency mode
    if [ "$emergency" != true ] && [ $result -eq 0 ]; then
        echo
        verify_disabled
    fi
    
    # Generate report
    local end_time=$(date +%s)
    generate_report "$start_time" "$end_time" "$action"
    
    # Final message
    echo
    if [ $result -eq 0 ]; then
        log "Feature flag operation completed successfully"
    else
        error "Feature flag operation completed with errors"
    fi
    
    exit $result
}

# Trap errors
trap 'error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"