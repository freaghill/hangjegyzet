#!/bin/bash

# Deployment script for Hetzner server
set -e

echo "🚀 Starting deployment to Hetzner..."

# Configuration
REMOTE_USER="root"
REMOTE_HOST="your-hetzner-ip"
REMOTE_DIR="/opt/hangjegyzet"
DOMAIN="hangjegyzet.ai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if .env.production exists
if [ ! -f .env.production ]; then
    log_error ".env.production file not found!"
    exit 1
fi

# Build the application
log_info "Building application..."
npm run build

# Create deployment archive
log_info "Creating deployment archive..."
tar -czf deploy.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='.next/cache' \
    --exclude='uploads' \
    --exclude='backups' \
    .

# Upload to server
log_info "Uploading to server..."
scp deploy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/

# Deploy on server
log_info "Deploying on server..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /opt/hangjegyzet

# Backup current deployment
if [ -d "current" ]; then
    echo "Backing up current deployment..."
    mv current backup-$(date +%Y%m%d-%H%M%S)
fi

# Extract new deployment
mkdir -p current
tar -xzf deploy.tar.gz -C current
rm deploy.tar.gz

# Copy production environment
cp .env.production current/.env.production

# Install dependencies
cd current
npm ci --production

# Run database migrations
npm run db:migrate

# Build production assets
npm run build

# Restart services
cd ..
docker-compose down
docker-compose up -d

# Wait for services to start
sleep 10

# Health check
if curl -f http://localhost/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    docker-compose logs
    exit 1
fi

# Cleanup old backups (keep last 3)
ls -dt backup-* | tail -n +4 | xargs rm -rf
ENDSSH

# Cleanup local files
rm deploy.tar.gz

log_info "✨ Deployment completed!"