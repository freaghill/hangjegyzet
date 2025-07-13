#!/bin/bash

# Script to set up environment variables for different environments

set -e

ENV=${1:-development}

echo "Setting up environment for: $ENV"

# Check if .env.example exists
if [ ! -f .env.example ]; then
    echo "Error: .env.example file not found"
    exit 1
fi

# Create .env file from example
if [ "$ENV" = "development" ]; then
    cp .env.example .env.local
    echo "Created .env.local from .env.example"
    echo "Please update the values in .env.local with your actual credentials"
elif [ "$ENV" = "staging" ]; then
    cp .env.example .env.staging
    echo "Created .env.staging from .env.example"
    echo "Please update the values in .env.staging with your staging credentials"
elif [ "$ENV" = "production" ]; then
    echo "For production, set environment variables in your deployment platform"
    echo "Use .env.example as a reference"
else
    echo "Unknown environment: $ENV"
    echo "Usage: ./scripts/setup-env.sh [development|staging|production]"
    exit 1
fi

# Generate NEXTAUTH_SECRET if not exists
if [ "$ENV" != "production" ]; then
    if grep -q "your-secret-here" .env.local 2>/dev/null || grep -q "your-secret-here" .env.staging 2>/dev/null; then
        echo "Generating NEXTAUTH_SECRET..."
        SECRET=$(openssl rand -base64 32)
        
        if [ "$ENV" = "development" ]; then
            sed -i.bak "s/your-secret-here/$SECRET/g" .env.local
            rm .env.local.bak
        else
            sed -i.bak "s/your-secret-here/$SECRET/g" .env.staging
            rm .env.staging.bak
        fi
        
        echo "Generated NEXTAUTH_SECRET"
    fi
fi

echo "Environment setup complete!"