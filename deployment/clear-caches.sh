#!/bin/bash

# Cache Clear Script for HangJegyzet
# Clears all caches during emergency rollback or performance issues
#
# Usage: ./clear-caches.sh [options]
# Options:
#   --all              Clear all caches
#   --vercel           Clear Vercel/CDN cache only
#   --redis            Clear Redis cache only
#   --application      Clear application-level caches only
#   --browser          Invalidate browser caches
#   --dry-run         Show what would be done without executing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOG_FILE="./logs/cache_clear_$(date +%Y%m%d_%H%M%S).log"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
REDIS_URL="${REDIS_URL:-}"
API_ENDPOINT="https://hangjegyzet.hu/api"
ADMIN_KEY="${ADMIN_KEY:-}"
CLOUDFLARE_TOKEN="${CLOUDFLARE_TOKEN:-}"
CLOUDFLARE_ZONE="${CLOUDFLARE_ZONE:-}"
DOMAIN="hangjegyzet.hu"

# Cache types
declare -A CACHE_TYPES=(
    ["vercel"]="Vercel Edge Network cache"
    ["redis"]="Redis in-memory cache"
    ["application"]="Application-level caches"
    ["browser"]="Browser cache (via headers)"
    ["cloudflare"]="Cloudflare CDN cache"
    ["database"]="Database query cache"
)

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

# Progress indicator
show_progress() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Clear Vercel cache
clear_vercel_cache() {
    info "Clearing Vercel Edge Network cache..."
    
    if [ -z "$VERCEL_TOKEN" ]; then
        warning "VERCEL_TOKEN not set, trying without authentication..."
    fi
    
    # Method 1: Purge specific domain
    local response=$(curl -s -X POST \
        "https://api.vercel.com/v13/deployments/purge" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"domains\": [\"$DOMAIN\", \"www.$DOMAIN\"]}" \
        -w "\n%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
        log "Vercel cache purged successfully"
    else
        warning "Vercel cache purge returned HTTP $http_code"
        
        # Method 2: Try deployment-specific cache clear
        info "Trying deployment-specific cache clear..."
        
        local deployment_id=$(vercel inspect --token="$VERCEL_TOKEN" 2>/dev/null | grep -E "^\s+id:" | head -1 | awk '{print $2}')
        
        if [ -n "$deployment_id" ]; then
            curl -s -X DELETE \
                "https://api.vercel.com/v13/deployments/$deployment_id/cache" \
                -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null 2>&1
            
            if [ $? -eq 0 ]; then
                log "Deployment cache cleared"
            fi
        fi
    fi
    
    # Clear function cache
    info "Clearing Vercel function cache..."
    curl -s -X POST \
        "https://api.vercel.com/v1/integrations/cache/purge-all" \
        -H "Authorization: Bearer $VERCEL_TOKEN" > /dev/null 2>&1 || true
}

# Clear Redis cache
clear_redis_cache() {
    info "Clearing Redis cache..."
    
    if [ -z "$REDIS_URL" ]; then
        warning "REDIS_URL not set, checking common locations..."
        
        # Try common Redis locations
        if command -v redis-cli &> /dev/null; then
            # Try local Redis
            if redis-cli ping &> /dev/null; then
                redis-cli FLUSHALL
                log "Local Redis cache cleared"
                return 0
            fi
        fi
        
        warning "Redis not accessible, skipping"
        return 1
    fi
    
    # Parse Redis URL
    local redis_host=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]+):([^@]+)@([^:]+):([0-9]+).*|\3|')
    local redis_port=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]+):([^@]+)@([^:]+):([0-9]+).*|\4|')
    local redis_pass=$(echo "$REDIS_URL" | sed -E 's|redis://([^:]+):([^@]+)@([^:]+):([0-9]+).*|\2|')
    
    # Clear Redis
    if [ -n "$redis_pass" ]; then
        redis-cli -h "$redis_host" -p "$redis_port" -a "$redis_pass" FLUSHALL 2>/dev/null
    else
        redis-cli -h "$redis_host" -p "$redis_port" FLUSHALL 2>/dev/null
    fi
    
    if [ $? -eq 0 ]; then
        log "Redis cache cleared successfully"
    else
        error "Failed to clear Redis cache"
        return 1
    fi
}

# Clear application-level caches
clear_application_cache() {
    info "Clearing application-level caches..."
    
    # Method 1: API endpoint
    if [ -n "$ADMIN_KEY" ]; then
        local endpoints=(
            "/admin/cache/clear"
            "/admin/cache/meetings"
            "/admin/cache/transcriptions"
            "/admin/cache/users"
            "/admin/cache/organizations"
        )
        
        for endpoint in "${endpoints[@]}"; do
            info "Clearing cache: $endpoint"
            
            local response=$(curl -s -X POST \
                "$API_ENDPOINT$endpoint" \
                -H "X-Admin-Key: $ADMIN_KEY" \
                -w "\n%{http_code}")
            
            local http_code=$(echo "$response" | tail -n1)
            
            if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
                log "Cache cleared: $endpoint"
            else
                warning "Failed to clear cache $endpoint (HTTP $http_code)"
            fi
        done
    else
        warning "ADMIN_KEY not set, cannot clear application caches via API"
    fi
    
    # Method 2: File-based caches
    local cache_dirs=(
        ".next/cache"
        "node_modules/.cache"
        ".cache"
        "tmp/cache"
    )
    
    for dir in "${cache_dirs[@]}"; do
        if [ -d "$dir" ]; then
            info "Removing cache directory: $dir"
            rm -rf "$dir"
            log "Removed: $dir"
        fi
    done
    
    # Method 3: Next.js specific
    if [ -d ".next" ]; then
        info "Clearing Next.js build cache..."
        rm -rf .next/cache
        rm -rf .next/static
        log "Next.js cache cleared"
    fi
}

# Invalidate browser caches
invalidate_browser_cache() {
    info "Invalidating browser caches..."
    
    # This is done by updating cache headers and versioning
    warning "Browser cache invalidation requires deployment changes:"
    echo "  1. Update asset version numbers"
    echo "  2. Change cache-control headers to no-cache"
    echo "  3. Add cache-busting query parameters"
    
    # If we can update via API
    if [ -n "$ADMIN_KEY" ]; then
        info "Updating cache headers via API..."
        
        curl -s -X POST \
            "$API_ENDPOINT/admin/cache/invalidate-browser" \
            -H "X-Admin-Key: $ADMIN_KEY" \
            -d '{"maxAge": 0, "mustRevalidate": true}' > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            log "Browser cache headers updated"
        fi
    fi
}

# Clear Cloudflare cache
clear_cloudflare_cache() {
    info "Clearing Cloudflare cache..."
    
    if [ -z "$CLOUDFLARE_TOKEN" ] || [ -z "$CLOUDFLARE_ZONE" ]; then
        warning "Cloudflare credentials not set, skipping"
        return 1
    fi
    
    local response=$(curl -s -X POST \
        "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE/purge_cache" \
        -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"purge_everything": true}' \
        -w "\n%{http_code}")
    
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ]; then
        log "Cloudflare cache cleared successfully"
    else
        error "Failed to clear Cloudflare cache (HTTP $http_code)"
        return 1
    fi
}

# Clear database query cache
clear_database_cache() {
    info "Clearing database query cache..."
    
    if [ -n "${DATABASE_URL:-}" ]; then
        # PostgreSQL specific
        psql "$DATABASE_URL" -c "DISCARD ALL;" 2>/dev/null || warning "Could not clear PostgreSQL cache"
        
        # If using pgpool or similar
        psql "$DATABASE_URL" -c "SELECT pg_reload_conf();" 2>/dev/null || true
        
        log "Database cache clearing attempted"
    else
        warning "DATABASE_URL not set, skipping database cache"
    fi
}

# Clear all caches
clear_all_caches() {
    log "Starting comprehensive cache clear..."
    
    local failed=0
    local total=0
    
    # Clear each cache type
    for cache_type in "${!CACHE_TYPES[@]}"; do
        ((total++))
        case $cache_type in
            vercel)
                clear_vercel_cache || ((failed++))
                ;;
            redis)
                clear_redis_cache || ((failed++))
                ;;
            application)
                clear_application_cache || ((failed++))
                ;;
            browser)
                invalidate_browser_cache || ((failed++))
                ;;
            cloudflare)
                clear_cloudflare_cache || ((failed++))
                ;;
            database)
                clear_database_cache || ((failed++))
                ;;
        esac
        sleep 1  # Small delay between operations
    done
    
    log "Cache clear completed: $((total - failed))/$total successful"
    
    return $failed
}

# Verify caches are cleared
verify_cache_clear() {
    info "Verifying cache clear..."
    
    # Check response headers
    local headers=$(curl -sI "https://$DOMAIN" | grep -i "cache\|age\|expires")
    
    if [ -n "$headers" ]; then
        info "Current cache headers:"
        echo "$headers"
    fi
    
    # Check specific endpoints
    local test_endpoints=(
        "/"
        "/api/health"
        "/_next/static/chunks/main.js"
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" "https://$DOMAIN$endpoint")
        info "Response time for $endpoint: ${response_time}s"
    done
}

# Generate report
generate_report() {
    local start_time=$1
    local end_time=$2
    local caches_cleared=$3
    
    local report_file="./logs/cache_clear_report_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$report_file" << EOF
# Cache Clear Report

**Date**: $(date +'%Y-%m-%d %H:%M:%S')
**Duration**: $((end_time - start_time)) seconds
**Operator**: $(whoami)

## Caches Cleared

$caches_cleared

## Verification Results

- Response times checked
- Cache headers verified
- All operations logged

## Log File

$LOG_FILE

## Next Steps

1. Monitor response times for improvements
2. Check application performance metrics
3. Verify user experience is normal
4. Watch for any cache-related errors

## Commands for Manual Verification

\`\`\`bash
# Check cache headers
curl -I https://$DOMAIN | grep -i cache

# Test response times
time curl -o /dev/null -s https://$DOMAIN

# Check Redis (if available)
redis-cli INFO stats | grep keyspace
\`\`\`

---
Generated by clear-caches.sh
EOF
    
    log "Report saved to: $report_file"
}

# Main execution
main() {
    local clear_all=false
    local clear_vercel=false
    local clear_redis=false
    local clear_application=false
    local clear_browser=false
    local dry_run=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                clear_all=true
                shift
                ;;
            --vercel)
                clear_vercel=true
                shift
                ;;
            --redis)
                clear_redis=true
                shift
                ;;
            --application)
                clear_application=true
                shift
                ;;
            --browser)
                clear_browser=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --all              Clear all caches"
                echo "  --vercel           Clear Vercel/CDN cache only"
                echo "  --redis            Clear Redis cache only"
                echo "  --application      Clear application-level caches only"
                echo "  --browser          Invalidate browser caches"
                echo "  --dry-run         Show what would be done without executing"
                echo ""
                echo "Available cache types:"
                for cache in "${!CACHE_TYPES[@]}"; do
                    echo "  - $cache: ${CACHE_TYPES[$cache]}"
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
    
    echo -e "${YELLOW}=== CACHE CLEAR UTILITY - HangJegyzet ===${NC}"
    echo "Log file: $LOG_FILE"
    echo
    
    # Dry run mode
    if [ "$dry_run" = true ]; then
        info "DRY RUN MODE - No changes will be made"
        echo
        echo "Would clear the following caches:"
        
        if [ "$clear_all" = true ]; then
            for cache in "${!CACHE_TYPES[@]}"; do
                echo "  - $cache: ${CACHE_TYPES[$cache]}"
            done
        else
            [ "$clear_vercel" = true ] && echo "  - vercel: ${CACHE_TYPES[vercel]}"
            [ "$clear_redis" = true ] && echo "  - redis: ${CACHE_TYPES[redis]}"
            [ "$clear_application" = true ] && echo "  - application: ${CACHE_TYPES[application]}"
            [ "$clear_browser" = true ] && echo "  - browser: ${CACHE_TYPES[browser]}"
        fi
        
        exit 0
    fi
    
    # Execute cache clearing
    local caches_cleared=""
    local result=0
    
    if [ "$clear_all" = true ]; then
        clear_all_caches
        result=$?
        caches_cleared="All cache types"
    else
        # Clear specific caches
        if [ "$clear_vercel" = true ]; then
            clear_vercel_cache || ((result++))
            caches_cleared="${caches_cleared}- Vercel cache\n"
        fi
        
        if [ "$clear_redis" = true ]; then
            clear_redis_cache || ((result++))
            caches_cleared="${caches_cleared}- Redis cache\n"
        fi
        
        if [ "$clear_application" = true ]; then
            clear_application_cache || ((result++))
            caches_cleared="${caches_cleared}- Application cache\n"
        fi
        
        if [ "$clear_browser" = true ]; then
            invalidate_browser_cache || ((result++))
            caches_cleared="${caches_cleared}- Browser cache\n"
        fi
        
        if [ -z "$caches_cleared" ]; then
            error "No cache type specified. Use --all or specific cache flags"
            echo "Run with --help for usage information"
            exit 1
        fi
    fi
    
    # Verify cache clear
    echo
    verify_cache_clear
    
    # Generate report
    local end_time=$(date +%s)
    generate_report "$start_time" "$end_time" "$caches_cleared"
    
    # Final message
    echo
    if [ $result -eq 0 ]; then
        log "Cache clearing completed successfully!"
    else
        warning "Cache clearing completed with $result errors"
    fi
    
    info "Remember to monitor application performance after cache clear"
    
    exit $result
}

# Trap errors
trap 'error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"