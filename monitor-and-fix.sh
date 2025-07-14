#!/bin/bash

echo "🚀 Starting automated build monitoring and fixing..."

while true; do
    echo -e "\n📊 Checking latest deployment..."
    
    # Wait for any current deployment to finish
    sleep 30
    
    # Get latest deployment
    deployment=$(vercel ls 2>&1 | grep -E "https://hangjegyzet-.*vercel.app" | head -1 | awk '{print $2}')
    status=$(vercel ls 2>&1 | grep "$deployment" | awk '{print $3}')
    
    echo "Latest deployment: $deployment"
    echo "Status: $status"
    
    if [[ "$status" == "Ready" ]]; then
        echo "✅ Build succeeded! Deployment is ready."
        echo "🎉 URL: $deployment"
        break
    elif [[ "$status" == "Error" ]]; then
        echo "❌ Build failed, checking logs..."
        
        # Get error from logs
        error_log=$(vercel inspect --logs "$deployment" 2>&1 | grep -A 30 "Failed to compile" | head -40)
        
        if [[ -z "$error_log" ]]; then
            echo "No compilation error found. Checking for other errors..."
            vercel inspect --logs "$deployment" 2>&1 | tail -100
            break
        fi
        
        echo "$error_log"
        echo -e "\n🔧 Attempting to fix automatically..."
        
        # Extract file path and line number
        if echo "$error_log" | grep -q "Type error:"; then
            file_path=$(echo "$error_log" | grep -o "./[^:]*" | head -1)
            
            echo "Error in file: $file_path"
            
            # Let Claude analyze and fix the error
            echo "Analyzing error pattern..."
            break  # Exit to let Claude handle the specific error
        fi
    else
        echo "⏳ Build still in progress..."
        sleep 30
    fi
done