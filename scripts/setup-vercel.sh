#!/bin/bash

# Vercel setup script for Hangjegyzet

set -e

echo "🚀 Hangjegyzet Vercel Setup"
echo "=========================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm i -g vercel
else
    echo "✅ Vercel CLI found"
fi

# Check if already logged in
echo ""
echo "📝 Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    echo "Please login to Vercel:"
    vercel login
else
    echo "✅ Already logged in as: $(vercel whoami)"
fi

# Link project
echo ""
echo "🔗 Linking Vercel project..."
if [ -f ".vercel/project.json" ]; then
    echo "✅ Project already linked"
    EXISTING_PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | grep -o '[^"]*$')
    echo "Project ID: $EXISTING_PROJECT_ID"
else
    echo "Linking new project..."
    vercel link
fi

# Get project and org IDs
if [ -f ".vercel/project.json" ]; then
    PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | grep -o '[^"]*$')
    ORG_ID=$(cat .vercel/project.json | grep -o '"orgId":"[^"]*' | grep -o '[^"]*$')
    
    echo ""
    echo "📋 Vercel Configuration:"
    echo "======================="
    echo "VERCEL_ORG_ID=$ORG_ID"
    echo "VERCEL_PROJECT_ID=$PROJECT_ID"
    echo ""
    echo "Save these values for GitHub Secrets!"
else
    echo "❌ Failed to get project information"
    exit 1
fi

# Create staging project
echo ""
echo "🔄 Setting up staging environment..."
echo "Do you want to create a separate Vercel project for staging? (recommended) [y/N]"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "Creating staging project..."
    # Save current project.json
    mv .vercel/project.json .vercel/project.json.production
    
    # Link new project for staging
    vercel link
    
    # Get staging project ID
    STAGING_PROJECT_ID=$(cat .vercel/project.json | grep -o '"projectId":"[^"]*' | grep -o '[^"]*$')
    
    # Restore production project.json
    mv .vercel/project.json .vercel/project.json.staging
    mv .vercel/project.json.production .vercel/project.json
    
    echo ""
    echo "📋 Staging Project Configuration:"
    echo "================================"
    echo "VERCEL_PROJECT_ID_STAGING=$STAGING_PROJECT_ID"
    echo "VERCEL_PROJECT_ID_PRODUCTION=$PROJECT_ID"
else
    echo "Using same project for staging and production"
    echo "VERCEL_PROJECT_ID_STAGING=$PROJECT_ID"
    echo "VERCEL_PROJECT_ID_PRODUCTION=$PROJECT_ID"
fi

# Get Vercel token
echo ""
echo "🔑 Generating Vercel Token..."
echo "1. Go to: https://vercel.com/account/tokens"
echo "2. Create a new token with name: 'hangjegyzet-ci'"
echo "3. Copy the token (you won't see it again!)"
echo ""
echo "Enter your Vercel token (or press Enter to skip):"
read -s VERCEL_TOKEN

if [ -n "$VERCEL_TOKEN" ]; then
    echo "✅ Token received (hidden for security)"
    echo ""
    echo "🔐 GitHub Secrets to add:"
    echo "========================"
    echo "VERCEL_TOKEN=$VERCEL_TOKEN"
    echo "VERCEL_ORG_ID=$ORG_ID"
    echo "VERCEL_PROJECT_ID_STAGING=${STAGING_PROJECT_ID:-$PROJECT_ID}"
    echo "VERCEL_PROJECT_ID_PRODUCTION=$PROJECT_ID"
else
    echo "⚠️  Token skipped. You'll need to add it manually to GitHub Secrets"
fi

echo ""
echo "✅ Vercel setup complete!"
echo ""
echo "Next steps:"
echo "1. Add the secrets above to GitHub: Settings → Secrets → Actions"
echo "2. Set up environment variables in Vercel dashboard"
echo "3. Deploy staging: git push origin develop"