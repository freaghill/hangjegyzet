#!/bin/bash

# Production Deployment Script for HangJegyzet.AI
# This script deploys the application to production with safety checks

set -e

# Configuration
PRODUCTION_SERVER="hangjegyzet.ai"
PRODUCTION_USER="deploy"
PRODUCTION_PATH="/var/www/hangjegyzet.ai"
PRODUCTION_PM2_NAME="hangjegyzet-prod"
PRODUCTION_WS_PM2_NAME="hangjegyzet-ws-prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

print_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Safety checks
safety_checks() {
    print_status "Running safety checks..."
    
    # Check if on main branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "main" ]; then
        print_error "Not on main branch! Current branch: $CURRENT_BRANCH"
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "Uncommitted changes detected!"
        git status --short
        exit 1
    fi
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    # Check if tests pass
    print_status "Running tests..."
    if ! npm test; then
        print_error "Tests failed! Fix issues before deploying."
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f .env.production ]; then
        print_error ".env.production file not found!"
        exit 1
    fi
    
    print_status "All safety checks passed ✓"
}

# Create backup
create_backup() {
    print_status "Creating backup on production server..."
    
    ssh ${PRODUCTION_USER}@${PRODUCTION_SERVER} << 'ENDSSH'
cd /var/www/hangjegyzet.ai

# Create backup directory if it doesn't exist
mkdir -p backups

# Backup database
pg_dump hangjegyzet > backups/db-backup-$(date +%Y%m%d-%H%M%S).sql

# Backup current deployment
if [ -d "current" ]; then
    tar -czf backups/app-backup-$(date +%Y%m%d-%H%M%S).tar.gz current/
fi

echo "Backup completed"
ENDSSH
}

# Build application
build_application() {
    print_status "Building application for production..."
    
    # Clean previous builds
    rm -rf .next
    
    # Build with production optimizations
    NODE_ENV=production npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Build failed!"
        exit 1
    fi
    
    print_status "Build completed successfully"
}

# Deploy to production
deploy_to_production() {
    print_status "Creating deployment archive..."
    
    # Get current git commit hash
    GIT_COMMIT=$(git rev-parse --short HEAD)
    
    # Create deployment info file
    cat > deployment-info.json << EOF
{
  "version": "$(node -p "require('./package.json').version")",
  "commit": "$GIT_COMMIT",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployedBy": "$(whoami)"
}
EOF
    
    # Create deployment archive
    tar -czf production-deploy.tar.gz \
        .next \
        public \
        package.json \
        package-lock.json \
        server.js \
        next.config.js \
        .env.production \
        scripts \
        lib \
        app \
        components \
        hooks \
        types \
        middleware.ts \
        tsconfig.json \
        deployment-info.json
    
    # Upload to production server
    print_status "Uploading to production server..."
    scp production-deploy.tar.gz ${PRODUCTION_USER}@${PRODUCTION_SERVER}:${PRODUCTION_PATH}/
    
    # Execute deployment on production server
    print_status "Executing deployment on production server..."
    ssh ${PRODUCTION_USER}@${PRODUCTION_SERVER} << 'ENDSSH'
cd /var/www/hangjegyzet.ai

# Create new release directory
RELEASE_DIR="releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p $RELEASE_DIR

# Extract new deployment
echo "Extracting deployment..."
tar -xzf production-deploy.tar.gz -C $RELEASE_DIR/
rm production-deploy.tar.gz

# Copy .env.production to .env
cd $RELEASE_DIR
cp .env.production .env

# Install production dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Update symlink (atomic deployment)
cd /var/www/hangjegyzet.ai
ln -sfn $RELEASE_DIR current

# Restart PM2 processes with zero downtime
echo "Restarting application..."
pm2 reload hangjegyzet-prod
pm2 reload hangjegyzet-ws-prod

# Save PM2 configuration
pm2 save

# Clean up old releases (keep last 5)
cd releases
ls -t | tail -n +6 | xargs -I {} rm -rf {}

echo "✅ Production deployment completed!"
ENDSSH
    
    # Clean up local archive
    rm -f production-deploy.tar.gz deployment-info.json
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for application to start
    sleep 10
    
    # Check if site is accessible
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://hangjegyzet.ai)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ Site is accessible (HTTP $HTTP_STATUS)"
    else
        print_error "Site returned HTTP $HTTP_STATUS"
        rollback_deployment
        exit 1
    fi
    
    # Check API health
    API_HEALTH=$(curl -s https://hangjegyzet.ai/api/health)
    
    if echo "$API_HEALTH" | grep -q "ok"; then
        print_status "✅ API health check passed"
    else
        print_error "API health check failed"
        rollback_deployment
        exit 1
    fi
    
    # Check WebSocket server
    WS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://hangjegyzet.ai:3002/health)
    
    if [ "$WS_STATUS" = "200" ]; then
        print_status "✅ WebSocket server is running"
    else
        print_warning "WebSocket health check returned $WS_STATUS"
    fi
}

# Rollback deployment
rollback_deployment() {
    print_error "Rolling back deployment..."
    
    ssh ${PRODUCTION_USER}@${PRODUCTION_SERVER} << 'ENDSSH'
cd /var/www/hangjegyzet.ai

# Get previous release
PREVIOUS_RELEASE=$(ls -t releases | head -n 2 | tail -n 1)

if [ -n "$PREVIOUS_RELEASE" ]; then
    # Update symlink to previous release
    ln -sfn releases/$PREVIOUS_RELEASE current
    
    # Restart PM2 processes
    pm2 reload hangjegyzet-prod
    pm2 reload hangjegyzet-ws-prod
    
    echo "Rolled back to $PREVIOUS_RELEASE"
else
    echo "No previous release found for rollback!"
fi
ENDSSH
}

# Post-deployment tasks
post_deployment() {
    print_status "Running post-deployment tasks..."
    
    # Clear CDN cache if applicable
    print_info "Clearing cache..."
    ssh ${PRODUCTION_USER}@${PRODUCTION_SERVER} "redis-cli -n 0 FLUSHDB"
    
    # Send deployment notification
    DEPLOYMENT_MESSAGE="HangJegyzet.AI deployed to production successfully! 🚀"
    
    # Log deployment
    echo "$(date): Deployed version $(node -p "require('./package.json').version") to production" >> deployment.log
    
    print_status "Post-deployment tasks completed"
}

# Main execution
main() {
    echo -e "${BLUE}🚀 HangJegyzet.AI Production Deployment${NC}"
    echo -e "${BLUE}========================================\n${NC}"
    
    # Confirmation prompt
    echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION!${NC}"
    echo -e "${YELLOW}This will affect all live users.${NC}\n"
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    safety_checks
    create_backup
    build_application
    deploy_to_production
    verify_deployment
    post_deployment
    
    print_status "🎉 Production deployment completed successfully!"
    print_info "URL: https://hangjegyzet.ai"
    print_info "Admin: https://hangjegyzet.ai/admin"
    
    # Show deployment info
    echo -e "\n${BLUE}Deployment Summary:${NC}"
    echo "- Version: $(node -p "require('./package.json').version")"
    echo "- Commit: $(git rev-parse --short HEAD)"
    echo "- Time: $(date)"
    echo "- Deployed by: $(whoami)"
}

# Handle errors
trap 'print_error "Deployment failed! Check logs for details."' ERR

# Run main function
main