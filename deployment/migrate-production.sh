#!/bin/bash

# Production Database Migration Script
# This script handles the migration to mode-based pricing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_DIR="./supabase/migrations"
BACKUP_DIR="./backups"
LOG_FILE="./migration_$(date +%Y%m%d_%H%M%S).log"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
        error "psql is not installed. Please install PostgreSQL client."
    fi
    
    # Check if DATABASE_URL is set
    if [ -z "${DATABASE_URL:-}" ]; then
        error "DATABASE_URL environment variable is not set."
    fi
    
    # Check if migrations directory exists
    if [ ! -d "$MIGRATION_DIR" ]; then
        error "Migration directory not found: $MIGRATION_DIR"
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    log "Prerequisites check passed ✓"
}

# Backup database
backup_database() {
    log "Starting database backup..."
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if pg_dump "$DATABASE_URL" > "$BACKUP_FILE"; then
        log "Database backed up to: $BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        log "Backup compressed: ${BACKUP_FILE}.gz"
    else
        error "Database backup failed!"
    fi
}

# Test migrations on a transaction
test_migrations() {
    log "Testing migrations in a transaction..."
    
    # Create a test script that runs all migrations in a transaction
    cat > /tmp/test_migrations.sql << EOF
BEGIN;

-- Test migration files
\i $MIGRATION_DIR/20250107_mode_based_usage.sql
\i $MIGRATION_DIR/20250107_alerts_system.sql
\i $MIGRATION_DIR/20250107_webhook_notifications.sql
\i $MIGRATION_DIR/20250107_get_current_month_usage.sql

-- Verify tables exist
SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('mode_usage', 'alerts', 'webhook_notifications');

-- Verify functions exist
SELECT COUNT(*) FROM pg_proc WHERE proname IN ('increment_mode_usage', 'check_mode_availability', 'get_current_month_usage');

-- Rollback (test only)
ROLLBACK;
EOF

    if psql "$DATABASE_URL" -f /tmp/test_migrations.sql > /tmp/test_result.log 2>&1; then
        log "Migration test passed ✓"
    else
        error "Migration test failed! Check /tmp/test_result.log for details"
    fi
}

# Run migrations
run_migrations() {
    log "Running migrations..."
    
    # Array of migration files in order
    migrations=(
        "20250107_mode_based_usage.sql"
        "20250107_alerts_system.sql"
        "20250107_webhook_notifications.sql"
        "20250107_get_current_month_usage.sql"
    )
    
    for migration in "${migrations[@]}"; do
        migration_file="$MIGRATION_DIR/$migration"
        
        if [ ! -f "$migration_file" ]; then
            error "Migration file not found: $migration_file"
        fi
        
        log "Running migration: $migration"
        
        if psql "$DATABASE_URL" -f "$migration_file" >> "$LOG_FILE" 2>&1; then
            log "✓ $migration completed successfully"
        else
            error "Migration failed: $migration. Check $LOG_FILE for details"
        fi
    done
}

# Verify migrations
verify_migrations() {
    log "Verifying migrations..."
    
    # Check tables
    tables=("mode_usage" "alerts" "webhook_notifications" "alert_history")
    for table in "${tables[@]}"; do
        result=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = '$table');" 2>/dev/null)
        if [[ "$result" == *"t"* ]]; then
            log "✓ Table $table exists"
        else
            error "Table $table does not exist!"
        fi
    done
    
    # Check functions
    functions=("increment_mode_usage" "check_mode_availability" "get_current_month_usage")
    for func in "${functions[@]}"; do
        result=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = '$func');" 2>/dev/null)
        if [[ "$result" == *"t"* ]]; then
            log "✓ Function $func exists"
        else
            error "Function $func does not exist!"
        fi
    done
    
    # Check types
    result=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM pg_type WHERE typname = 'transcription_mode');" 2>/dev/null)
    if [[ "$result" == *"t"* ]]; then
        log "✓ Type transcription_mode exists"
    else
        error "Type transcription_mode does not exist!"
    fi
    
    log "Migration verification completed ✓"
}

# Post-migration tasks
post_migration_tasks() {
    log "Running post-migration tasks..."
    
    # Update statistics
    psql "$DATABASE_URL" -c "ANALYZE;" >> "$LOG_FILE" 2>&1
    log "✓ Database statistics updated"
    
    # Grant permissions (if needed)
    psql "$DATABASE_URL" << EOF >> "$LOG_FILE" 2>&1
-- Ensure authenticated users have proper access
GRANT SELECT ON mode_usage TO authenticated;
GRANT SELECT ON alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_month_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_mode_availability TO authenticated;
EOF
    log "✓ Permissions granted"
    
    # Create initial mode usage records for existing organizations
    psql "$DATABASE_URL" << EOF >> "$LOG_FILE" 2>&1
-- Initialize mode usage for current month
INSERT INTO mode_usage (organization_id, month, fast_minutes, balanced_minutes, precision_minutes)
SELECT 
    o.id,
    date_trunc('month', CURRENT_DATE)::date,
    0, 0, 0
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM mode_usage mu 
    WHERE mu.organization_id = o.id 
    AND mu.month = date_trunc('month', CURRENT_DATE)::date
)
ON CONFLICT DO NOTHING;
EOF
    log "✓ Initial mode usage records created"
}

# Main execution
main() {
    echo -e "${GREEN}=== HangJegyzet Production Migration ===${NC}"
    echo "Migration log: $LOG_FILE"
    echo
    
    # Safety check
    if ! confirm "This will migrate the PRODUCTION database. Are you sure?"; then
        log "Migration cancelled by user"
        exit 0
    fi
    
    check_prerequisites
    
    # Another safety check
    warning "You are about to modify the PRODUCTION database!"
    if ! confirm "Do you want to create a backup first?"; then
        error "Migration cancelled - backup is required"
    fi
    
    backup_database
    test_migrations
    
    # Final confirmation
    if ! confirm "Tests passed. Proceed with actual migration?"; then
        log "Migration cancelled by user after testing"
        exit 0
    fi
    
    run_migrations
    verify_migrations
    post_migration_tasks
    
    log "🎉 Migration completed successfully!"
    log "Backup location: ${BACKUP_FILE}.gz"
    log "Please monitor the application for any issues."
}

# Run main function
main "$@"