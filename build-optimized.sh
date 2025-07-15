#!/bin/bash

echo "🔧 Optimized build script for low memory environments"

# Clear caches
echo "📦 Clearing caches..."
rm -rf .next
rm -rf node_modules/.cache

# Set environment variables for optimized build
export NODE_OPTIONS="--max-old-space-size=2048"
export NEXT_TELEMETRY_DISABLED=1

# Build with reduced parallelism
echo "🏗️ Starting build with optimizations..."
npm run build

echo "✅ Build complete!"