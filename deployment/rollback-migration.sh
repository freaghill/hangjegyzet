#!/bin/bash

# Database Migration Rollback Script
# Emergency rollback for mode-based pricing migration

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
LOG_FILE="./rollback_$(date +%Y%m%d_%H%M%S).log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# List available backups
list_backups() {
    log "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No backups found"
    else
        error "Backup directory not found: $BACKUP_DIR"
    fi
}

# Rollback using SQL commands
sql_rollback() {
    log "Starting SQL-based rollback..."
    
    cat > /tmp/rollback.sql << 'EOF'
-- Start transaction
BEGIN;

-- Drop webhook notifications
DROP TABLE IF EXISTS webhook_notifications CASCADE;

-- Drop alerts system
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;

-- Drop mode usage tracking
DROP TABLE IF EXISTS mode_usage CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS increment_mode_usage CASCADE;
DROP FUNCTION IF EXISTS check_mode_availability CASCADE;
DROP FUNCTION IF EXISTS get_current_month_usage CASCADE;
DROP FUNCTION IF EXISTS update_mode_usage_on_meeting_complete CASCADE;
DROP FUNCTION IF EXISTS track_alert_resolution CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_notifications CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_mode_usage ON meetings CASCADE;
DROP TRIGGER IF EXISTS trigger_track_alert_resolution ON alerts CASCADE;

-- Drop types
DROP TYPE IF EXISTS transcription_mode CASCADE;

-- Remove columns from existing tables
ALTER TABLE meetings DROP COLUMN IF EXISTS transcription_mode;
ALTER TABLE subscription_history DROP COLUMN IF EXISTS mode_limits;
ALTER TABLE organizations DROP COLUMN IF EXISTS webhook_url;
ALTER TABLE organizations DROP COLUMN IF EXISTS alert_settings;
ALTER TABLE organizations DROP COLUMN IF EXISTS webhook_last_test;
ALTER TABLE organizations DROP COLUMN IF EXISTS webhook_last_test_status;

-- Drop views
DROP VIEW IF EXISTS mode_usage_summary CASCADE;

-- Verify rollback
SELECT 'Checking if mode_usage exists:', EXISTS (SELECT FROM pg_tables WHERE tablename = 'mode_usage');
SELECT 'Checking if alerts exists:', EXISTS (SELECT FROM pg_tables WHERE tablename = 'alerts');
SELECT 'Checking if transcription_mode exists:', EXISTS (SELECT FROM pg_type WHERE typname = 'transcription_mode');

COMMIT;
EOF

    if psql "$DATABASE_URL" -f /tmp/rollback.sql >> "$LOG_FILE" 2>&1; then
        log "SQL rollback completed successfully ✓"
    else
        error "SQL rollback failed! Check $LOG_FILE for details"
    fi
}

# Restore from backup
restore_from_backup() {
    local backup_file=$1
    
    log "Restoring from backup: $backup_file"
    
    # Check if backup exists
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
    fi
    
    # Create temp directory for extraction
    TEMP_DIR=$(mktemp -d)
    
    # Extract backup
    log "Extracting backup..."
    gunzip -c "$backup_file" > "$TEMP_DIR/restore.sql"
    
    # Confirm database name
    warning "This will COMPLETELY REPLACE the current database!"
    if ! confirm "Are you absolutely sure you want to restore from backup?"; then
        rm -rf "$TEMP_DIR"
        error "Restore cancelled by user"
    fi
    
    # Drop and recreate database (if we have permissions)
    # Otherwise just restore over existing
    log "Restoring database..."
    if psql "$DATABASE_URL" < "$TEMP_DIR/restore.sql" >> "$LOG_FILE" 2>&1; then
        log "Database restored successfully ✓"
    else
        error "Database restore failed! Check $LOG_FILE for details"
    fi
    
    # Cleanup
    rm -rf "$TEMP_DIR"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    # Check that mode-based tables don't exist
    tables=("mode_usage" "alerts" "webhook_notifications")
    for table in "${tables[@]}"; do
        result=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = '$table');" 2>/dev/null)
        if [[ "$result" == *"f"* ]]; then
            log "✓ Table $table removed"
        else
            warning "Table $table still exists!"
        fi
    done
    
    # Check that type doesn't exist
    result=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM pg_type WHERE typname = 'transcription_mode');" 2>/dev/null)
    if [[ "$result" == *"f"* ]]; then
        log "✓ Type transcription_mode removed"
    else
        warning "Type transcription_mode still exists!"
    fi
    
    log "Rollback verification completed"
}

# Post-rollback tasks
post_rollback_tasks() {
    log "Running post-rollback tasks..."
    
    # Update statistics
    psql "$DATABASE_URL" -c "ANALYZE;" >> "$LOG_FILE" 2>&1
    log "✓ Database statistics updated"
    
    # Clear any caches (you might need to call your API endpoint)
    # curl -X POST https://your-app.com/api/cache/clear
    
    log "Post-rollback tasks completed"
}

# Main execution
main() {
    echo -e "${RED}=== EMERGENCY ROLLBACK - HangJegyzet ===${NC}"
    echo "Rollback log: $LOG_FILE"
    echo
    
    warning "This will rollback the mode-based pricing migration!"
    
    # Check prerequisites
    if [ -z "${DATABASE_URL:-}" ]; then
        error "DATABASE_URL environment variable is not set."
    fi
    
    # Show options
    echo "Rollback options:"
    echo "1) SQL-based rollback (removes mode-based features only)"
    echo "2) Full restore from backup (complete database restore)"
    echo "3) List available backups"
    echo "4) Cancel"
    echo
    
    read -p "Select option (1-4): " -n 1 -r option
    echo
    
    case $option in
        1)
            if confirm "Proceed with SQL-based rollback?"; then
                sql_rollback
                verify_rollback
                post_rollback_tasks
                log "🔄 Rollback completed successfully!"
            fi
            ;;
        2)
            list_backups
            echo
            read -p "Enter backup file path: " backup_file
            if [ -n "$backup_file" ]; then
                restore_from_backup "$backup_file"
                post_rollback_tasks
                log "🔄 Database restored successfully!"
            fi
            ;;
        3)
            list_backups
            ;;
        4)
            log "Rollback cancelled"
            exit 0
            ;;
        *)
            error "Invalid option"
            ;;
    esac
    
    warning "Remember to:"
    echo "  - Disable feature flags immediately"
    echo "  - Deploy previous application version"
    echo "  - Clear CDN caches"
    echo "  - Notify the team"
    echo "  - Monitor for issues"
}

# Run main function
main "$@"