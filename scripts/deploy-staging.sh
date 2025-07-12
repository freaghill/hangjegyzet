#!/bin/bash

# Staging Deployment Script for HangJegyzet.AI
# This script deploys the application to the staging environment

set -e

echo "🚀 Starting staging deployment..."

# Configuration
STAGING_SERVER="staging.hangjegyzet.ai"
STAGING_USER="deploy"
STAGING_PATH="/var/www/staging.hangjegyzet.ai"
STAGING_PM2_NAME="hangjegyzet-staging"
STAGING_WS_PM2_NAME="hangjegyzet-ws-staging"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if .env.staging exists
if [ ! -f .env.staging ]; then
    print_error ".env.staging file not found! Copy .env.staging.example and configure it."
    exit 1
fi

# Build the application
print_status "Building application for staging..."
npm run build

# Create deployment archive
print_status "Creating deployment archive..."
tar -czf staging-deploy.tar.gz \
    .next \
    public \
    package.json \
    package-lock.json \
    server.js \
    next.config.js \
    .env.staging \
    scripts \
    lib \
    app \
    components \
    hooks \
    types \
    middleware.ts \
    tsconfig.json

# Upload to staging server
print_status "Uploading to staging server..."
scp staging-deploy.tar.gz ${STAGING_USER}@${STAGING_SERVER}:${STAGING_PATH}/

# Execute deployment on staging server
print_status "Executing deployment on staging server..."
ssh ${STAGING_USER}@${STAGING_SERVER} << 'ENDSSH'
cd /var/www/staging.hangjegyzet.ai

# Backup current deployment
echo "Creating backup of current deployment..."
if [ -d "current" ]; then
    mv current backup-$(date +%Y%m%d-%H%M%S)
fi

# Extract new deployment
echo "Extracting new deployment..."
mkdir current
tar -xzf staging-deploy.tar.gz -C current/
rm staging-deploy.tar.gz

# Copy .env.staging to .env
cd current
cp .env.staging .env

# Install production dependencies
echo "Installing dependencies..."
npm ci --production

# Run database migrations
echo "Running database migrations..."
npm run db:migrate

# Restart PM2 processes
echo "Restarting PM2 processes..."
pm2 restart hangjegyzet-staging || pm2 start npm --name "hangjegyzet-staging" -- start -- -p 3001
pm2 restart hangjegyzet-ws-staging || pm2 start server.js --name "hangjegyzet-ws-staging"
pm2 save

# Clear Redis cache for staging
echo "Clearing Redis cache..."
redis-cli -n 1 FLUSHDB

# Verify deployment
echo "Verifying deployment..."
curl -f -s -o /dev/null https://staging.hangjegyzet.ai || exit 1

echo "✅ Staging deployment completed successfully!"
ENDSSH

# Clean up local archive
rm -f staging-deploy.tar.gz

print_status "✅ Staging deployment completed!"
print_status "🌐 Staging URL: https://staging.hangjegyzet.ai"

# Run smoke tests
print_status "Running smoke tests..."
npm run test:staging || print_warning "Some smoke tests failed"

print_status "🎉 Deployment process finished!"