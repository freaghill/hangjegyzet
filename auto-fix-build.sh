#!/bin/bash

# Auto-fix Vercel build errors script
# This script monitors Vercel builds and automatically fixes TypeScript errors

set -e

echo "🚀 Starting auto-fix build script..."

# Function to get the latest deployment URL
get_latest_deployment() {
    vercel ls 2>&1 | grep -E "https://hangjegyzet-.*vercel.app" | head -1 | awk '{print $2}'
}

# Function to check if build is still running
is_building() {
    local deployment=$1
    vercel ls 2>&1 | grep "$deployment" | grep -q "● Building"
}

# Function to check if build has error
has_error() {
    local deployment=$1
    vercel ls 2>&1 | grep "$deployment" | grep -q "● Error"
}

# Function to extract error from logs
get_build_error() {
    local deployment=$1
    vercel inspect --logs "$deployment" 2>&1 | grep -A 10 "Failed to compile" | head -20
}

# Main loop
iteration=1
while true; do
    echo "
🔄 Iteration $iteration"
    
    # Get latest deployment
    deployment=$(get_latest_deployment)
    echo "📦 Latest deployment: $deployment"
    
    # Wait for build to complete or error
    echo "⏳ Waiting for build to complete..."
    while is_building "$deployment"; do
        sleep 10
    done
    
    # Check if build has error
    if has_error "$deployment"; then
        echo "❌ Build failed, analyzing error..."
        
        # Get error details
        error_log=$(get_build_error "$deployment")
        echo "$error_log"
        
        # Fix specific error patterns
        if echo "$error_log" | grep -q "Expected 0 arguments, but got 1"; then
            echo "🔧 Fixing listApiKeys argument error..."
            # The error shows listApiKeys expects 0 args
            sed -i 's/await listApiKeys(organization!.id)/await listApiKeys()/' /opt/hangjegyzet/app/\(dashboard\)/settings/api/page.tsx
            
            git add -A
            git commit -m "fix: remove argument from listApiKeys function call"
            git push origin main
            
            echo "✅ Fix pushed, waiting for new build..."
            sleep 30
            
        elif echo "$error_log" | grep -q "Type error:"; then
            echo "🔧 Found type error, needs manual intervention"
            echo "Error details:"
            echo "$error_log"
            break
        else
            echo "❓ Unknown error type, needs manual intervention"
            break
        fi
        
    else
        echo "✅ Build succeeded!"
        deployment_url=$(echo "$deployment" | sed 's/● //')
        echo "🎉 Deployment URL: $deployment_url"
        break
    fi
    
    ((iteration++))
    
    if [ $iteration -gt 20 ]; then
        echo "⚠️ Reached maximum iterations (20), stopping..."
        break
    fi
done

echo "🏁 Auto-fix script completed after $iteration iterations"