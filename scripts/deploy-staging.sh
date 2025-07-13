#!/bin/bash

# Deploy to staging script

set -e

echo "🚀 Deploying to Staging"
echo "======================"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "⚠️  Warning: Not on develop branch!"
    echo "Do you want to continue? [y/N]"
    read -r response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ You have uncommitted changes!"
    echo "Please commit or stash them before deploying"
    exit 1
fi

# Pull latest changes
echo ""
echo "📥 Pulling latest changes..."
git pull origin develop

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Run tests
echo ""
echo "🧪 Running tests..."
npm run lint
npm run typecheck
npm run test:unit

# Build
echo ""
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Pre-deployment checks passed!"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
if [ -f ".vercel/project.json.staging" ]; then
    # Use staging project
    mv .vercel/project.json .vercel/project.json.temp
    mv .vercel/project.json.staging .vercel/project.json
    vercel --prod
    mv .vercel/project.json .vercel/project.json.staging
    mv .vercel/project.json.temp .vercel/project.json
else
    # Deploy to preview
    vercel
fi

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Check deployment status:"
echo "1. Vercel Dashboard: https://vercel.com/dashboard"
echo "2. GitHub Actions: https://github.com/YOUR_USERNAME/hangjegyzet/actions"
echo ""
echo "Once deployed, run smoke tests:"
echo "npm run test:smoke:staging"